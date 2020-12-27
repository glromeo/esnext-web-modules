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

    const readManifest = (module: string, options: Opts) => new Promise<PackageMeta>((done, fail) => {
        resolve(module, options, (err, resolved, pkg) => {
            if (pkg) {
                done(pkg);
            } else {
                fail(err);
            }
        });
    });

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
        if (resolved) {
            pathname = resolved;
        } else if (isBare(pathname)) {
            let [module, filename] = parsePathname(pathname);
            if (module !== null) {
                resolved = importMap.imports[module];
                if (!resolved) {
                    await rollupWebModule(module);
                    resolved = importMap.imports[module];
                }
                if (filename !== null) {
                    resolved = resolved + "/" + filename;
                }
                pathname = resolved;
            }
        }

        if (pathname.charAt(0) !== "/" && basedir) {
            pathname = path.posix.join(basedir, pathname);
        }

        /* everything must be a javascript module: .css -> .css.js, .json -> .json.js */

        const ext = path.extname(pathname).toLowerCase();
        if (ext !== ".js" && ext !== ".mjs") {
            pathname += ".js";
        }

        if (search) {
            return pathname + "?" + search;
        } else {
            return pathname;
        }
    }

    const rollupPlugins = [
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

    const cjsModuleProxy = moduleProxy("cjs-proxy", resolveImport);
    const esmModuleProxy = moduleProxy("esm-proxy", resolveImport);

    const pending = new Map<string, Promise<void>>();

    function rollupWebModule(module: string) {
        if (importMap.imports[module]) {
            return importMap.imports[module];
        }

        if (!pending.has(module)) {
            pending.set(module, task()
                .catch(function (err) {
                    return log.error(err);
                })
                .finally(function () {
                    pending.delete(module);
                })
            );
        }
        return pending.get(module);

        async function task() {
            const pkg = await readManifest(module, config.resolve);
            const startTime = Date.now();
            const isEsm = pkg.module || pkg["jsnext:main"] || pkg.main?.endsWith(".mjs");
            const bundle = await rollup({
                input: module,
                plugins: [
                    isEsm ? esmModuleProxy : cjsModuleProxy,
                    ...rollupPlugins
                ]
            });
            try {
                let {output: [firstChunk]} = await bundle.write({
                    file: `${outDir}/${module}.js`,
                    sourcemap: !config.terser
                });
                updateImportMap(module, bundle);
                writeImportMap(outDir, importMap);
            } finally {
                await bundle.close();
                const elapsed = Date.now() - startTime;
                //@ts-ignore
                log.info`rolled up: ${chalk.magenta(module)} in: ${chalk.magenta(elapsed)}ms`;
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