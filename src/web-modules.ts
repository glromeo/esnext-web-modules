import rollupPluginCommonJS from "@rollup/plugin-commonjs";
import rollupPluginJson from "@rollup/plugin-json";
import {nodeResolve as rollupPluginNodeResolve} from "@rollup/plugin-node-resolve";
import rollupPluginReplace from "@rollup/plugin-replace";
import chalk from "chalk";
import {parse} from "fast-url-parser";
import {existsSync, mkdirSync, promises as fsp, readFileSync, rmdirSync, statSync} from "fs";
import memoized from "nano-memoize";
import path, {posix} from "path";
import resolve, {Opts} from "resolve";
import {Plugin, rollup, RollupBuild, RollupOptions, RollupWarning} from "rollup";
import rollupPluginSourcemaps from "rollup-plugin-sourcemaps";
import {Options as TerserOptions, terser as rollupPluginTerser} from "rollup-plugin-terser";
import log from "tiny-node-logger";
import {bareNodeModule, parsePathname} from "./es-import-utils";
import {rollupPluginCatchUnresolved} from "./rollup-plugin-catch-unresolved";
import {rollupPluginCjsProxy} from "./rollup-plugin-cjs-proxy";
import {rollupPluginEsmProxy} from "./rollup-plugin-esm-proxy";
import {rollupPluginRewriteImports} from "./rollup-plugin-rewrite-imports";
import {readWorkspaces} from "./workspaces";

interface PackageMeta {
    name: string;
    version: string;

    [key: string]: any;
}

export interface ImportMap {
    imports: { [packageName: string]: string };
}

export type WebModulesOptions = {
    rootDir: string
    clean?: boolean
    environment: string
    resolve: Opts
    external: string | string[]
    terser?: TerserOptions,
    rollup: RollupOptions
};

export type ImportResolver = (url: string, basedir?: string) => Promise<string>;

export function defaultOptions(): WebModulesOptions {
    return require(require.resolve(`${process.cwd()}/web-modules.config.js`));
}

function initFileSystem(rootDir: string, clean?: boolean): { outDir: string } {
    const outDir = path.join(rootDir, "web_modules");
    if (clean && existsSync(outDir)) {
        rmdirSync(outDir, {recursive: true});
        log.info("cleaned web_modules directory");
    }
    mkdirSync(outDir, {recursive: true});
    return {outDir};
}

/**
 *   __        __   _       __  __           _       _
 *   \ \      / /__| |__   |  \/  | ___   __| |_   _| | ___  ___
 *    \ \ /\ / / _ \ '_ \  | |\/| |/ _ \ / _` | | | | |/ _ \/ __|
 *     \ V  V /  __/ |_) | | |  | | (_) | (_| | |_| | |  __/\__ \
 *      \_/\_/ \___|_.__/  |_|  |_|\___/ \__,_|\__,_|_|\___||___/
 *
 * @param config
 */
export const useWebModules = memoized((options: WebModulesOptions = defaultOptions()) => {

    const {outDir} = initFileSystem(options.rootDir, options.clean);

    if (!options.environment) options.environment = "development";
    if (!options.resolve) options.resolve = {};
    if (!options.resolve.paths) options.resolve.paths = [path.join(options.rootDir, "node_modules")];
    if (!options.resolve.extensions) options.resolve.extensions = [".ts", ".tsx", ".js", ".jsx"];
    if (!options.external) options.external = ["@babel/runtime/**"];
    if (!options.rollup) options.rollup = {};
    if (!options.rollup.plugins) options.rollup.plugins = [];

    const resolveOptions = {basedir: options.rootDir, ...options.resolve};

    const importMap = {
        imports: {
            ...readImportMap(outDir).imports,
            ...readWorkspaces(options.rootDir).imports
        }
    };

    let appPkg: PackageMeta = require(require.resolve("./package.json", {paths: [options.rootDir]}));

    const entryModules = appPkg.dependencies
        ? new Set([
            ...Object.keys(appPkg.dependencies || {}),
            ...Object.keys(appPkg.peerDependencies || {})
        ])
        : new Set<string>();

    function readImportMap(outDir: string): ImportMap {
        try {
            let importMap = JSON.parse(readFileSync(`${outDir}/import-map.json`, "utf-8"));

            for (const [key, pathname] of Object.entries(importMap.imports)) {
                try {
                    let {mtime} = statSync(path.join(options.rootDir, String(pathname)));
                    log.debug("web_module:", chalk.green(key), "->", chalk.gray(pathname));
                } catch (e) {
                    delete importMap[key];
                }
            }

            return importMap;
        } catch (e) {
            return {imports: {}};
        }
    }

    function writeImportMap(outDir: string, importMap: ImportMap): Promise<void> {
        return fsp.writeFile(`${outDir}/import-map.json`, JSON.stringify(importMap, null, "  "));
    }

    /**
     * bundle.watchFiles[0] is the synthetic proxy
     *
     * TODO: To implement squash properly I need to use the imported/required files list
     * that can be collected by the proxy plugin instead of the
     *
     * @param module
     * @param bundle
     */
    function updateImportMap(module: string, bundle: RollupBuild) {
        let outputUrl = `/web_modules/${module}.js`;
        for (const file of bundle.watchFiles) {
            if (file.charCodeAt(0) !== 0 && !file.endsWith("-proxy")) {
                let bare = bareNodeModule(file);
                importMap.imports[bare] = outputUrl;
            }
        }
        importMap.imports[module] = outputUrl;
    }

    const isModule = /\.m?[tj]sx?$/;

    /**
     *                       _          _____                           _
     *                      | |        |_   _|                         | |
     *   _ __ ___  ___  ___ | |_   _____ | | _ __ ___  _ __   ___  _ __| |_
     *  | '__/ _ \/ __|/ _ \| \ \ / / _ \| || '_ ` _ \| '_ \ / _ \| '__| __|
     *  | | |  __/\__ \ (_) | |\ V /  __/| || | | | | | |_) | (_) | |  | |_
     *  |_|  \___||___/\___/|_| \_/ \___\___/_| |_| |_| .__/ \___/|_|   \__|
     *                                                | |
     *                                                |_|
     *
     * @param url
     * @param basedir
     */
    async function resolveImport(url: string, basedir: string = process.cwd()): Promise<string> {
        let {
            hostname,
            pathname,
            search
        } = parse(url);

        if (hostname !== null) {
            return url;
        }

        let resolved = importMap.imports[pathname];
        if (!resolved) {
            let [module, filename] = parsePathname(pathname);
            if (module !== null && !importMap.imports[module]) {
                await rollupWebModule(module);
                resolved = importMap.imports[module];
            }
            if (filename) {
                let ext = posix.extname(filename);
                if (!ext) {
                    ext = resolveExt(module, filename, basedir);
                    filename += ext;
                }
                if (!isModule.test(ext)) {
                    let type = resolveModuleType(ext, basedir);
                    search = search ? `?type=${type}&${search.slice(1)}` : `?type=${type}`;
                    if (module) {
                        resolved = `/node_modules/${module}/${filename}`;
                    } else {
                        resolved = filename;
                    }
                } else {
                    if (module) {
                        let bundled = importMap.imports[posix.join(module, filename)];
                        if (bundled) {
                            resolved = bundled;
                        } else {
                            resolved = `/web_modules/${module}/${filename}`;
                        }
                    } else {
                        resolved = filename;
                    }
                }
            }
        }

        if (search) {
            return resolved + search;
        } else {
            return resolved;
        }
    }

    function resolveExt(module: string | null, filename: string, basedir: string) {
        let pathname;
        if (module) {
            const resolved = resolve.sync(`${module}/${filename}`, resolveOptions);
            pathname = path.join(resolved.substring(0, resolved.lastIndexOf("node_modules" + path.sep)), "node_modules", module, filename);
        } else {
            pathname = path.join(basedir, filename);
        }
        try {
            let stats = statSync(pathname);
            if (stats.isDirectory()) {
                pathname = path.join(pathname, "index");
                for (const ext of options.resolve.extensions!) {
                    if (existsSync(pathname + ext)) return `/index${ext}`;
                }
            }
            return "";
        } catch (ignored) {
            for (const ext of options.resolve.extensions!) {
                if (existsSync(pathname + ext)) return ext;
            }
            return "";
        }
    }

    function resolveModuleType(ext: string, basedir: string | undefined) {
        return "module";
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    function requireManifest(module: string) {
        return new Promise<PackageMeta>(function (done, fail) {
            resolve(`${module}/package.json`, resolveOptions, (err, resolved, pkg) => pkg ? done(pkg) : fail(err));
        });
    }

    function getModuleDirectories(options: WebModulesOptions) {
        const moduleDirectory = options.resolve.moduleDirectory;
        return Array.isArray(moduleDirectory) ? [...moduleDirectory] : moduleDirectory ? [moduleDirectory] : undefined;
    }

    const pluginCjsProxy = rollupPluginCjsProxy({entryModules});
    const pluginEsmProxy = rollupPluginEsmProxy({entryModules});
    const pluginReplace = rollupPluginReplace({
        "process.env.NODE_ENV": JSON.stringify(options.environment)
    });
    const pluginRewriteImports = rollupPluginRewriteImports({
        importMap,
        resolveImport,
        entryModules,
        resolveOptions,
        external: options.external
    });
    const pluginEsmNodeResolve = rollupPluginNodeResolve({
        rootDir: options.rootDir,
        mainFields: ["browser:module", "module", "browser", "main"],
        extensions: [".mjs", ".cjs", ".js", ".json"],
        preferBuiltins: true,
        moduleDirectories: getModuleDirectories(options)
    });
    const pluginCjsNodeResolve = rollupPluginNodeResolve({
        rootDir: options.rootDir,
        mainFields: ["main"],
        extensions: [".cjs", ".js", ".json"],
        preferBuiltins: true,
        moduleDirectories: getModuleDirectories(options)
    });
    const pluginCommonJS = rollupPluginCommonJS();
    const pluginJson = rollupPluginJson({
        preferConst: true,
        indent: "  ",
        compact: false,
        namedExports: true
    });
    const pluginSourcemaps = rollupPluginSourcemaps();
    const pluginTerser = rollupPluginTerser(options.terser);
    const pluginCatchUnresolved = rollupPluginCatchUnresolved();

    function selectTaskPlugins(pkg: PackageMeta, filename: string | null): Plugin[] | null {
        if (!pkg.main && !filename) {
            return null;
        }
        let isEsm = pkg.module || pkg["jsnext:main"] || (pkg.main || filename).endsWith(".mjs");
        return [
            filename ? false : isEsm ? pluginEsmProxy : pluginCjsProxy,
            pluginReplace,
            pluginRewriteImports,
            isEsm ? pluginEsmNodeResolve : pluginCjsNodeResolve,
            pluginCommonJS,
            pluginJson,
            pluginSourcemaps,
            options.terser ? pluginTerser : false,
            pluginCatchUnresolved,
            ...(
                options.rollup.plugins!
            )
        ].filter(Boolean) as Plugin[];
    }

    const ALREADY_RESOLVED = Promise.resolve();
    const pending = new Map<string, Promise<void>>();

    /**
     *              _ _         __          __  _     __  __           _       _
     *             | | |        \ \        / / | |   |  \/  |         | |     | |
     *    _ __ ___ | | |_   _ _ _\ \  /\  / /__| |__ | \  / | ___   __| |_   _| | ___
     *   | '__/ _ \| | | | | | '_ \ \/  \/ / _ \ '_ \| |\/| |/ _ \ / _` | | | | |/ _ \
     *   | | | (_) | | | |_| | |_) \  /\  /  __/ |_) | |  | | (_) | (_| | |_| | |  __/
     *   |_|  \___/|_|_|\__,_| .__/ \/  \/ \___|_.__/|_|  |_|\___/ \__,_|\__,_|_|\___|
     *                       | |
     *                       |_|
     *
     * @param pathname
     */
    function rollupWebModule(pathname: string): Promise<void> {

        if (importMap.imports[pathname]) {
            return ALREADY_RESOLVED;
        }

        if (!pending.has(pathname)) {
            let [module, filename] = parsePathname(pathname) as [string, string | null];
            pending.set(pathname, rollupWebModuleTask(module, filename)
                .catch(function (err) {
                    log.error("failed to rollup:", pathname, err);
                    throw err;
                })
                .finally(function () {
                    pending.delete(pathname);
                })
            );
        }

        return pending.get(pathname)!;

        async function rollupWebModuleTask(module: string, filename: string | null): Promise<void> {

            log.info("rollup web module:", pathname);

            if (filename && !importMap.imports[module]) {
                await rollupWebModule(module);
            }

            let pkg = await requireManifest(module);
            while (pkg && pkg.main && !posix.extname(pkg.main)) try {
                pkg = await requireManifest(posix.join(module, pkg.main));
            } catch (ignored) {
            }

            const startTime = Date.now();

            let plugins = selectTaskPlugins(pkg, filename);
            if (plugins === null) {
                log.info`nothing to roll up for: ${chalk.magenta(pathname)}`;
                importMap.imports[module] = `/web_modules/${module}/${module}.js`;
                return;
            }

            const bundle = await rollup({
                ...options.rollup,
                input: pathname,
                plugins: plugins,
                treeshake: options.rollup?.treeshake ?? {moduleSideEffects: "no-external"},
                onwarn: warningHandler
            });

            try {
                await bundle.write({
                    file: `${outDir}/${filename ? pathname : module + ".js"}`,
                    sourcemap: !options.terser
                });
                if (!filename) {
                    updateImportMap(module, bundle);
                }
                await writeImportMap(outDir, importMap);
            } finally {
                await bundle.close();
                const elapsed = Date.now() - startTime;
                log.info`rolled up: ${chalk.magenta(pathname)} in: ${chalk.magenta(elapsed)}ms`;
            }
        }
    }

    function warningHandler({code, message, loc, importer}: RollupWarning) {
        let level;
        switch (code) {
            case "THIS_IS_UNDEFINED":
                return;
            case "CIRCULAR_DEPENDENCY":
            case "NAMESPACE_CONFLICT":
            case "UNUSED_EXTERNAL_IMPORT":
                level = "debug";
                break;
            default:
                level = "warn";
        }
        log[level](message, loc ? `in: ${loc.file} at line:${loc.line}, column:${loc.column}` : "");
    }

    return {
        outDir,
        importMap,
        resolveImport,
        rollupWebModule
    };
});
