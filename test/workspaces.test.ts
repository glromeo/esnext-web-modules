import {fail} from "assert";
import {useWebModules} from "../src";
import * as path from "path";
import {expect} from "chai";

describe("workspaces", function () {

    let {resolveImport} = useWebModules({
        baseDir: process.cwd(),
        rootDir: path.join(__dirname, "fixture/workspaces"),
        resolve: {paths: [path.join(__dirname, "fixture/workspaces/node_modules")]}
    })

    it("can resolve module-a", async function () {
        expect(await resolveImport("module-a")).to.equal("/workspaces/module-a/index.js");
    });
    it("can resolve module-b", async function () {
        expect(await resolveImport("module-b")).to.equal("/workspaces/group/module-b/index.js");
    });
    it("can resolve module-c", async function () {
        try {
            await resolveImport("module-c");
            fail();
        } catch (error) {
            expect(error.message).to.match(/Cannot find module 'module-c\/package.json'/);
        }
        expect(await resolveImport("@workspaces/module-c")).to.equal("/workspaces/group/module-c/index.js");
    });

});