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

export interface ImportMap {
    imports: { [packageName: string]: string };
}

export type WebModuleBundlerOptions = {
    paths: string[],
    dir?: string,
    terser?: TerserOptions
};

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

function updateImportMap(module: string, bundle: RollupBuild) {
    let outputUrl = `/web_modules/${module}.js`;
    let watchFiles = bundle.watchFiles.slice(1);
    for (const file of watchFiles) {
        importMap.imports[module] = outputUrl;
        if (file.charCodeAt(0) !== 0 && !file.endsWith("?commonjs-proxy")) {
            let importUrl = file.substring(file.lastIndexOf("node_modules") + 13).replace(/\\/g, "/");
            importMap.imports[importUrl] = outputUrl;
        }
    }
}

export let importMap = {imports:{}};

export async function bundleWebModule(module: string, options: WebModuleBundlerOptions) {
    // if (options.dir) {
    //     importMap = readImportMap(options.dir);
    // }
    if (importMap.imports.hasOwnProperty(module)) {
        return;
    }
    importMap.imports[module] = false;
    const startTime = Date.now();
    const bundle = await rollup({
        input: module,
        plugins: [
            moduleProxy(options),
            nodeResolve({
                moduleDirectories: options.paths
            }),
            commonjs(),
            json(),
            postcss(),
            sourcemaps(),
            options.terser && terser(options.terser)
        ].filter(Boolean) as [Plugin]
    });
    try {
        if (options.dir) {
            let {output: [firstChunk]} = await bundle.write({
                file: `${options.dir}/${module}.js`,
                sourcemap: !options.terser
            });
            updateImportMap(module, bundle);
            writeImportMap(options.dir, importMap);
        } else {
            return bundle.generate({
                sourcemap: !options.terser
            });
        }
    } finally {
        await bundle.close();
        const elapsed = Date.now() - startTime;
        //@ts-ignore
        log.info`rolled up: ${chalk.magenta(module)} in: ${chalk.magenta(elapsed)}ms`;
    }
}
