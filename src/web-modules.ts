import {rollup, RollupBuild} from "rollup";
import {nodeResolve} from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import postcss from "rollup-plugin-postcss";
import sourcemaps from "rollup-plugin-sourcemaps";
import {moduleProxy} from "./rollup-plugin-module-proxy";
import {Options as TerserOptions, terser} from "rollup-plugin-terser";

import * as fs from "fs";

import log from "tiny-node-logger";
import chalk from "chalk";
import resolve, {Opts} from "resolve";
import {ESNextToolsConfig, getModuleDirectories} from "./config";
import * as path from "path";
import {parse} from "fast-url-parser";
import {bareNodeModule, isBare, parsePathname} from "./es-import-utils";
import {rewriteImports} from "./rollup-plugin-rewrite-imports";

interface PackageMeta {
    name: string;
    version: string;

    [key: string]: any;
}

export interface ImportMap {
    imports: { [packageName: string]: string };
}

export type WebModulesConfig = ESNextToolsConfig & {
    terser?: TerserOptions
};

export type ImportResolver = (url: string, basedir?: string) => Promise<string>;

export function useWebModules(config: WebModulesConfig) {

    const outDir = path.resolve(config.rootDir, "web_modules");
    const importMap = readImportMap(outDir);

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
        if (!resolved && isBare(pathname)) {
            let [module, filename] = parsePathname(pathname);
            if (module !== null) {
                resolved = importMap.imports[module];
                if (!resolved) {
                    await rollupWebModule(module);
                    resolved = importMap.imports[module];
                }
                if (filename !== null) {
                    resolved = resolved.slice(0, -3) + "/" + filename;
                }
            }
        }

        if (resolved.charAt(0) !== "/" && basedir) {
            resolved = path.posix.join(basedir, resolved);
        }

        /* everything must be a javascript module: .css -> .css.js, .json -> .json.js */

        const ext = path.extname(resolved).toLowerCase();
        if (ext !== ".js" && ext !== ".mjs") {
            resolved += ".js";
        }

        try {
            let {mtime} = fs.statSync(path.join(config.rootDir, resolved));
        } catch (e) {
            await rollupWebModule(resolved.substring(13));
        }

        if (search) {
            return resolved + "?" + search;
        } else {
            return resolved;
        }
    }

    const rollupPlugins = [
        rewriteImports({imports: importMap.imports, resolver: resolveImport}),
        nodeResolve({
            rootDir: config.rootDir,
            moduleDirectories: getModuleDirectories(config)
        }),
        commonjs(),
        json(),
        postcss(),
        sourcemaps(),
        config.terser && terser(config.terser)
    ].filter(Boolean) as [Plugin];

    const cjsModuleProxy = moduleProxy("cjs-proxy");
    const esmModuleProxy = moduleProxy("esm-proxy");

    const pending = new Map<string, Promise<void>>();

    const readManifest = (module: string, options: Opts) => new Promise<PackageMeta>((done, fail) => {
        resolve(module, options, (err, resolved, pkg) => {
            if (pkg) {
                done(pkg);
            } else {
                fail(err);
            }
        });
    });

    async function isEsModule(module: string) {
        const pkg = await readManifest(module, config.resolve);
        return pkg.module || pkg["jsnext:main"] || pkg.main?.endsWith(".mjs");
    }

    function rollupWebModule(pathname: string) {

        if (importMap.imports[pathname]) {
            return importMap.imports[pathname];
        }

        if (!pending.has(pathname)) {
            let [module, filename] = parsePathname(pathname) as [string, string | null];
            pending.set(pathname, task(module, filename)
                .catch(function (err) {
                    return log.error(err);
                })
                .finally(function () {
                    pending.delete(pathname);
                })
            );
        }
        return pending.get(pathname);

        async function task(module: string, filename: string | null) {
            if (!importMap.imports[module] && filename) {
                await rollupWebModule(module);
            }
            const startTime = Date.now();
            const bundle = await rollup({
                input: pathname,
                plugins: filename ? rollupPlugins : [
                    await isEsModule(module) ? esmModuleProxy : cjsModuleProxy,
                    ...rollupPlugins
                ]
            });
            try {
                await bundle.write({
                    file: `${outDir}/${filename ? pathname : module + ".js"}`,
                    sourcemap: !config.terser
                });
                if (!filename) {
                    updateImportMap(module, bundle);
                }
                writeImportMap(outDir, importMap);
            } finally {
                await bundle.close();
                const elapsed = Date.now() - startTime;
                //@ts-ignore
                log.info`rolled up: ${chalk.magenta(pathname)} in: ${chalk.magenta(elapsed)}ms`;
            }
        }
    }

    function readImportMap(outDir: string): ImportMap {
        try {
            return JSON.parse(fs.readFileSync(`${outDir}/import-map.json`, "utf-8"));
        } catch (e) {
            return {imports: {}};
        }
    }

    function writeImportMap(outDir: string, importMap: ImportMap): void {
        fs.writeFileSync(`${outDir}/import-map.json`, JSON.stringify(importMap, null, "  "));
    }

    /**
     * Ideally ImportMap should be a trie in memory
     * bundle.watchFiles[0] is the synthetic proxy
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

    return {
        importMap,
        resolveImport,
        rollupWebModule
    };
}