import {useWebModules} from "../lib";
import * as path from "path";
import {expect} from "chai";

describe("workspaces", function () {

    let {resolveImport} = useWebModules({
        baseDir: process.cwd(),
        rootDir: path.join(__dirname, "fixture/workspaces"),
        resolve: {moduleDirectory: path.join(__dirname, "fixture/workspaces/node_modules")}
    })

    it("can resolve module-a", function () {
        expect(resolveImport("module-a")).to.equal("/workspaces/module-a")
    });

});