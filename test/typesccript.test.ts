import {expect} from "chai";
import * as fs from "fs";
import {existsSync, readFileSync} from "fs";
import {join, relative, resolve} from "path";
import {SourceMapConsumer} from "source-map";
import {defaultOptions, useWebModules} from "../src";

function readExports(path: string) {
    let out = fs.readFileSync(join(__dirname, path), "utf-8");
    let regExp = /export\s*{([^}]+)}/g;
    let exports = [], match;
    while ((match = regExp.exec(out))) {
        exports.push(...match[1].split(",").map(e => e.split(" as ").pop()!.trim()));
    }
    if (/export\s+default\s+/.test(out)) {
        exports.push("default");
    }
    return exports;
}

function readImportMap(path: string) {
    let out = fs.readFileSync(join(__dirname, path), "utf-8");
    return Object.keys(JSON.parse(out).imports);
}

function readSourceMap(path: string) {
    let out = fs.readFileSync(join(__dirname, path + ".map"), "utf-8");
    return JSON.parse(out);
}

function readTextFile(path: string) {
    return readFileSync(join(__dirname, path), "utf-8");
}

describe("web modules", function () {

    const fixtureDir = resolve(__dirname, "fixture");
    const rootDir = join(fixtureDir, "react");

    let {rollupWebModule, resolveImport} = useWebModules({
        clean: true,
        rootDir: rootDir,
        resolve: {
            moduleDirectory: [resolve(__dirname, "fixture/node_modules")]
        }
    });

    it("can resolve extension-less imports", async function () {

        expect(await resolveImport("../src/index", join(rootDir, "public"))).to.equal("../src/index.tsx");

    });


});
