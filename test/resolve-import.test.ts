import {useWebModules, WebModulesConfig} from "../src/web-modules";
import {expect} from "chai";
import * as path from "path";
import * as fs from "fs";

describe("resolve import", function () {

    const fixtureDir = path.resolve(__dirname, "fixture");
    const webModulesDir = path.resolve(__dirname, "fixture/web_modules");

    const options: WebModulesConfig = {
        baseDir: __dirname,
        rootDir: fixtureDir,
        resolve: {moduleDirectory: [path.resolve(__dirname, "fixture/node_modules")]}
    };

    let {resolveImport} = useWebModules(options);

    const basedir = path.join(fixtureDir, "alpha", "beta");

    it("urls go unmodified", async function () {

        expect(await resolveImport("http://127.0.0.1:8080/echo?query=message", basedir))
            .to.equal("http://127.0.0.1:8080/echo?query=message");
        expect(await resolveImport("file:///echo.do?query=message", basedir))
            .to.equal("file:///echo.do?query=message");
    });

    it("modules are resolved from local workspaces", async function () {

        expect(await resolveImport("@test/fixture", basedir)).to.equal(
            "/alpha/index.js"
        );
        expect(await resolveImport("package-a", basedir)).to.equal(
            "/workspace-a/index.mjs"
        );
        expect(await resolveImport("package-b", basedir)).to.equal(
            "/workspaces/workspace-b/index.mjs"
        );
        expect(await resolveImport("package-c", basedir).catch(e => e.message)).to.match(/Cannot find module 'package-c\/package.json'/)

        // ...if they are present
        expect(await resolveImport("parent/name", basedir).catch(e => e.message)).to.match(/Cannot find module 'parent\/package.json'/)

        // import "." is meaningless
        expect(await resolveImport(".", basedir).catch(e => e.message)).to.match(/Cannot find module/)

        // import "." is the parent module so in the fixture resolves to the index file
        expect(await resolveImport("..", basedir)).to.equal(
            "/alpha/index.js"
        );

        // import are resolved from the basedir following require semantic

        // there's no delta in fixture/alpha/beta
        expect(await resolveImport("delta", basedir).catch(e => e.message)).to.match(/Cannot find module 'delta\/package.json'/)
        // should resolve fixture/alpha/beta/epsilon.mjs
        expect(await resolveImport("./epsilon", basedir)).to.equal(
            "/alpha/beta/epsilon.mjs"
        );
        // should resolve fixture/alpha/beta/delta.sigma adding query for type=module
        expect(await resolveImport("./delta.sigma", basedir)).to.equal(
            "/alpha/beta/delta.sigma?type=module"
        );
        // ...leaving any existing query alone
        expect(await resolveImport("./delta.sigma?q=e", basedir)).to.equal(
            "/alpha/beta/delta.sigma?type=module&q=e"
        );

        // there's src in fixture (root rootDir) yet it's not a package
        expect(await resolveImport(fixtureDir, "src").catch(e => e.message)).to.match(/Cannot find module 'src\/package.json'/)
        // ...it has index.js though!
        expect(await resolveImport(fixtureDir, "./src")).to.equal(
            "/src/index.js"
        );

        // absolute files are resolved from root rootDir
        expect(await resolveImport("/esnext-server.config.js", basedir)).to.equal(
            "/esnext-server.config.js"
        );
        // ...even if they miss their ext
        expect(await resolveImport("/src/broken", basedir)).to.equal(
            "/src/broken.js"
        );

        // web_modules are bundled on demand and resolved urls point to their main file when possible

        expect(await resolveImport("lit-html", basedir)).to.equal(
            "/web_modules/lit-html/lit-html.js"
        );
        expect(await resolveImport("lit-html/lit-html.js", basedir)).to.equal(
            "/web_modules/lit-html/lit-html.js"
        );
        expect(await resolveImport("lit-html/lib/parts.js", basedir)).to.equal(
            "/web_modules/lit-html/lit-html.js"
        );
        expect(await resolveImport("lit-html/lib/shady-render.js", basedir)).to.equal(
            "/web_modules/lit-html/lib/shady-render.js"
        );
        expect(await resolveImport("lit-html/directives/unsafe-html.js", basedir)).to.equal(
            "/web_modules/lit-html/directives/unsafe-html.js"
        );

        // ...it works with namespaces too
        expect(await resolveImport("@polymer/paper-checkbox", basedir)).to.equal(
            "/web_modules/@polymer/paper-checkbox/paper-checkbox.js"
        );
        // it can handle non javascript files by copying them over and resolving using query type=module
        expect(await resolveImport("@polymer/paper-checkbox/demo/index.html", basedir)).to.equal(
            "/web_modules/@polymer/paper-checkbox/demo/index.html?type=module"
        );

    });
});