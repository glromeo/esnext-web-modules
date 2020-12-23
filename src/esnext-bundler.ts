import {rollup} from "rollup";
import {entryProxyPlugin} from "./entry-proxy-plugin";
import {nodeResolve} from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import * as fs from "fs";

export type WebModuleBundlerOptions = { moduleDirectories: string[], outDir: string };

export async function bundleWebModule(module: string, options: WebModuleBundlerOptions) {
    const bundle = await rollup({
        input: module,
        plugins: [
            entryProxyPlugin(options),
            nodeResolve(options),
            commonjs()
        ]
    });
    console.log(bundle.watchFiles); // an array of file names this bundle depends on
    const {output} = await bundle.generate({
        format: "esm"
    });

    for (const chunkOrAsset of output) {
        if (chunkOrAsset.type === "asset") {
            console.log("Asset", chunkOrAsset);
        } else {
            console.log("Chunk", chunkOrAsset.modules);
        }
    }
    await bundle.write({
        file: `${options.outDir}/${module}.js`
    });

    fs.writeFileSync(`${options.outDir}/${module}.webpkg.json`, JSON.stringify({
        "files": bundle.watchFiles.slice(1).map(f => f.substring(f.lastIndexOf("node_modules")+module.length+14))
    }))
    await bundle.close();
};
