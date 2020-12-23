import {rollup} from "rollup";
import {entryProxyPlugin} from "./entry-proxy-plugin";
import path from "path";
import {nodeResolve} from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export type WebModuleBundlerOptions = { moduleDirectories: string[], outDir: string };

export async function bundleWebModule(input: string, options: WebModuleBundlerOptions) {
    const bundle = await rollup({
        input: input,
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
        file: `${options.outDir}/${input}.js`
    });
    await bundle.close();
};
