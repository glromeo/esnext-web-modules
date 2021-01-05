import rollupPluginCommonJS from "@rollup/plugin-commonjs";
import rollupPluginJson from "@rollup/plugin-json";
import {nodeResolve as rollupPluginNodeResolve} from "@rollup/plugin-node-resolve";
import chalk from "chalk";
import {parse} from "fast-url-parser";
import {existsSync, mkdirSync, promises as fsp, readFileSync, rmdirSync, statSync} from "fs";
import memoized from "nano-memoize";
import path, {posix} from "path";
import picomatch from "picomatch";
import resolve, {Opts} from "resolve";
import {Plugin, rollup, RollupBuild, RollupOptions, RollupWarning} from "rollup";
import rollupPluginSourcemaps from "rollup-plugin-sourcemaps";
import {Options as TerserOptions, terser as rollupPluginTerser} from "rollup-plugin-terser";
import log from "tiny-node-logger";
import {bareNodeModule, parsePathname} from "./es-import-utils";
import {rollupPluginCatchUnresolved} from "./rollup-plugin-catch-unresolved";
import {rollupPluginEntryProxy} from "./rollup-plugin-entry-proxy";
import {rollupPluginFakeModules} from "./rollup-plugin-fake-modules";
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
    resolve: Opts
    fakes?: { [module: string]: string }
    squash?: string | string[]
    terser?: TerserOptions,
    rollup?: RollupOptions
};

export type ImportResolver = (url: string, basedir?: string) => Promise<string>;

export function defaultOptions(): WebModulesOptions {
    return require(require.resolve(`${process.cwd()}/web-modules.config.js`));
}

function initWebModules(rootDir: string, clean?: boolean): { outDir: string } {
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

    const {outDir} = initWebModules(options.rootDir, options.clean);

    if (!options.resolve) {
        options.resolve = {
            paths: [path.join(options.rootDir, "node_modules")]
        };
    }

    if (!options.squash) {
        options.squash = ["@babel/runtime/**"];
    }

    const squash = options.squash ? picomatch(options.squash) : test => false;

    const importMap = {
        imports: {
            ...readImportMap(outDir).imports,
            ...readWorkspaces(options.rootDir).imports
        }
    };

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
        for (const file of bundle.watchFiles.slice(1)) {
            if (file.charCodeAt(0) !== 0 && !file.endsWith("?commonjs-proxy")) {
                let bare = bareNodeModule(file);
                importMap.imports[bare] = outputUrl;
            }
        }
        importMap.imports[module] = outputUrl;
    }

    function resolveModuleType(ext: string, basedir: string | undefined) {
        return "module";
    }

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
    async function resolveImport(url: string, basedir?: string): Promise<string> {
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
                    ext = ".js";
                    filename += ext;
                }
                if (ext !== ".js" && ext !== ".mjs") {
                    let type = resolveModuleType(ext, basedir);
                    search = search ? `type=${type}&${search.substring(1)}` : `type=${type}`;
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
            return resolved + "?" + search;
        } else {
            return resolved;
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const resolveOptions = {basedir: options.rootDir, moduleDirectory: options.resolve.paths};

    function requireManifest(module: string) {
        return new Promise<PackageMeta>(function (done, fail) {
            resolve(`${module}/package.json`, resolveOptions, (err, resolved, pkg) => pkg ? done(pkg) : fail(err));
        });
    }

    function getModuleDirectories(options: WebModulesOptions) {
        const moduleDirectory = options.resolve.moduleDirectory;
        return Array.isArray(moduleDirectory) ? [...moduleDirectory] : moduleDirectory ? [moduleDirectory] : undefined;
    }

    const rollupPlugins = [
        rollupPluginFakeModules({
            fakes: options.fakes,
            resolveOptions
        }),
        rollupPluginRewriteImports({
            importMap,
            resolveImport,
            squash
        }),
        rollupPluginNodeResolve({
            rootDir: options.rootDir,
            moduleDirectories: getModuleDirectories(options)
        }),
        rollupPluginCommonJS(),
        rollupPluginJson(),
        rollupPluginSourcemaps(),
        options.terser && rollupPluginTerser(options.terser),
        ...(
            options.rollup?.plugins ?? []
        ),
        rollupPluginCatchUnresolved()
    ].filter(Boolean) as [Plugin];

    const cjsModuleProxy = rollupPluginEntryProxy("cjs-proxy");
    const esmModuleProxy = rollupPluginEntryProxy("esm-proxy");

    function taskPlugins(pkg: PackageMeta, filename: string | null) {
        if (filename) {
            if (squash(pkg.name)) {
                return [esmModuleProxy, ...rollupPlugins];
            }
        } else {
            if (squash(pkg.name)) {
                return rollupPlugins.slice(2);
            }
            if (pkg.module || pkg["jsnext:main"] || pkg.main?.endsWith(".mjs")) {
                return [esmModuleProxy, ...rollupPlugins];
            } else {
                return [cjsModuleProxy, ...rollupPlugins];
            }
        }
        return rollupPlugins;
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
                .finally(function () {
                    pending.delete(pathname);
                })
            );
        }

        return pending.get(pathname)!;

        async function rollupWebModuleTask(module: string, filename: string | null): Promise<void> {

            log.info("rollup web module:", pathname);

            if (filename && !importMap.imports[module] && !squash(module)) {
                await rollupWebModule(module);
            }

            const pkg = await requireManifest(module);

            const startTime = Date.now();
            const bundle = await rollup({
                ...options.rollup,
                input: pathname,
                plugins: taskPlugins(pkg, filename),
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

    function level(code: string | undefined) {
        if (code === "CIRCULAR_DEPENDENCY" ||
            code === "NAMESPACE_CONFLICT" ||
            code === "THIS_IS_UNDEFINED" ||
            code === "UNUSED_EXTERNAL_IMPORT"
        ) {
            return "debug";
        } else {
            return "warn";
        }
    }

    function warningHandler({code, message, loc, importer}: RollupWarning) {
        log[level(code)](message, loc ? `in: ${loc.file} at line:${loc.line}, column:${loc.column}` : "");
    }

    return {
        outDir,
        importMap,
        resolveImport,
        rollupWebModule
    };
});
