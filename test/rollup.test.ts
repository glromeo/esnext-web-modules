import {rollup} from "rollup";
import * as path from "path";
import {nodeResolve} from "@rollup/plugin-node-resolve";
import commonjs from '@rollup/plugin-commonjs';
import {entryProxyPlugin} from "../src/entry-proxy-plugin";

describe("rollup", function () {

    it("can rollup react", async function () {
        const bundle = await rollup({
            input: "react",
            plugins: [
                entryProxyPlugin({moduleDirectories: [path.resolve(__dirname, "fixture/node_modules")]}),
                nodeResolve({moduleDirectories: [path.resolve(__dirname, "fixture/node_modules")]}),
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
            dir: path.resolve(__dirname, "fixture/web_modules")
        });
        await bundle.close();
    });

    it("can rollup lit-html", async function () {
        const bundle = await rollup({
            input: "lit-html",
            plugins: [
                entryProxyPlugin({moduleDirectories: [path.resolve(__dirname, "fixture/node_modules")]}),
                nodeResolve({moduleDirectories: [path.resolve(__dirname, "fixture/node_modules")]}),
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
            dir: path.resolve(__dirname, "fixture/web_modules")
        });
        await bundle.close();
    });
});