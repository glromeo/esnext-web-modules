import {expect} from "chai";
import {mkdirSync, rmdirSync} from "fs";
import * as path from "path";
import {useWebModules, WebModulesConfig} from "../src";

describe("resolve import", function () {

    const rootDir = path.resolve(__dirname, "fixture");
    const webModulesDir = path.resolve(__dirname, "fixture/web_modules");

    const options: WebModulesConfig = {
        baseDir: __dirname,
        rootDir: rootDir,
        resolve: {
            paths: [path.resolve(__dirname, "fixture/node_modules")]
        },
        squash: [
            "@babel/runtime/**",
            "smooth-scrollbar"
        ]
    };

    let {resolveImport, importMap} = useWebModules(options);

    beforeEach(function () {
        importMap.__clear__();
        rmdirSync(webModulesDir, {recursive: true});
        mkdirSync(webModulesDir, {recursive: true});
    });

    it("urls go unmodified", async function () {

        expect(await resolveImport("http://127.0.0.1:8080/echo?query=message"))
            .to.equal("http://127.0.0.1:8080/echo?query=message");
        expect(await resolveImport("file:///echo.do?query=message"))
            .to.equal("file:///echo.do?query=message");
    });

    it("modules are resolved from local workspaces", async function () {

        expect(await resolveImport("@test/fixture")).to.equal(
            "/alpha/index.js"
        );
        expect(await resolveImport("package-a")).to.equal(
            "/workspace-a/index.mjs"
        );
        expect(await resolveImport("package-b")).to.equal(
            "/workspaces/workspace-b/index.mjs"
        );
        expect(await resolveImport("package-c").catch(e => e.message)).to.match(/Cannot find module 'package-c\/package.json'/);

        // ...if they are present
        expect(await resolveImport("parent/name").catch(e => e.message)).to.match(/Cannot find module 'parent\/package.json'/);

        // import "." is meaningless
        expect(await resolveImport(".").catch(e => e.message)).to.match(/Cannot find module/);

        // import "." is the parent module so in the fixture resolves to the index file
        expect(await resolveImport("..")).to.equal(
            "/alpha/index.js"
        );

        // import are resolved from the basedir following require semantic

        // there's no delta in fixture/alpha/beta
        expect(await resolveImport("delta").catch(e => e.message)).to.match(/Cannot find module 'delta\/package.json'/);
        // should resolve fixture/alpha/beta/epsilon.mjs
        expect(await resolveImport("./epsilon")).to.equal(
            "/alpha/beta/epsilon.mjs"
        );
        // should resolve fixture/alpha/beta/delta.sigma adding query for type=module
        expect(await resolveImport("./delta.sigma")).to.equal(
            "/alpha/beta/delta.sigma?type=module"
        );
        // ...leaving any existing query alone
        expect(await resolveImport("./delta.sigma?q=e")).to.equal(
            "/alpha/beta/delta.sigma?type=module&q=e"
        );

        // there's src in fixture (root rootDir) yet it's not a package
        expect(await resolveImport(rootDir, "src").catch(e => e.message)).to.match(/Cannot find module 'src\/package.json'/);
        // ...it has index.js though!
        expect(await resolveImport(rootDir, "./src")).to.equal(
            "/src/index.js"
        );

        // absolute files are resolved from root rootDir
        expect(await resolveImport("/esnext-server.config.js")).to.equal(
            "/esnext-server.config.js"
        );
        // ...even if they miss their ext
        expect(await resolveImport("/src/broken")).to.equal(
            "/src/broken.js"
        );

        // web_modules are bundled on demand and resolved urls point to their main file when possible

        expect(await resolveImport("lit-html")).to.equal(
            "/web_modules/lit-html/lit-html.js"
        );
        expect(await resolveImport("lit-html/lit-html.js")).to.equal(
            "/web_modules/lit-html/lit-html.js"
        );
        expect(await resolveImport("lit-html/lib/parts.js")).to.equal(
            "/web_modules/lit-html/lit-html.js"
        );
        expect(await resolveImport("lit-html/lib/shady-render.js")).to.equal(
            "/web_modules/lit-html/lib/shady-render.js"
        );
        expect(await resolveImport("lit-html/directives/unsafe-html.js")).to.equal(
            "/web_modules/lit-html/directives/unsafe-html.js"
        );

        // ...it works with namespaces too
        expect(await resolveImport("@polymer/paper-checkbox")).to.equal(
            "/web_modules/@polymer/paper-checkbox/paper-checkbox.js"
        );
        // it can handle non javascript files by copying them over and resolving using query type=module
        expect(await resolveImport("@polymer/paper-checkbox/demo/index.html")).to.equal(
            "/web_modules/@polymer/paper-checkbox/demo/index.html?type=module"
        );

    });


    it("lit-html/lit-html.js", async function () {
        importMap.imports = {
            "@fixture/lit-element": "/workspaces/index.js",
            "lit-html/lit-html.js": "/web_modules/lit-html.js",
            "lit-html/lib/default-template-processor.js": "/web_modules/lit-html.js",
            "lit-html/lib/parts.js": "/web_modules/lit-html.js",
            "lit-html/lib/directive.js": "/web_modules/lit-html.js",
            "lit-html/lib/dom.js": "/web_modules/lit-html.js",
            "lit-html/lib/part.js": "/web_modules/lit-html.js",
            "lit-html/lib/template-instance.js": "/web_modules/lit-html.js",
            "lit-html/lib/template.js": "/web_modules/lit-html.js",
            "lit-html/lib/template-result.js": "/web_modules/lit-html.js",
            "lit-html/lib/render.js": "/web_modules/lit-html.js",
            "lit-html/lib/template-factory.js": "/web_modules/lit-html.js",
            "lit-html": "/web_modules/lit-html.js"
        };

        expect(await resolveImport("lit-html/lit-html.js")).to.equal("/web_modules/lit-html.js");
    });

    it("bootstrap", async function () {
        expect(await resolveImport("bootstrap")).to.equal("/web_modules/bootstrap.js");
        expect(await resolveImport("bootstrap/dist/css/bootstrap.css")).to.equal("/node_modules/bootstrap/dist/css/bootstrap.css?type=module");
    });

    it("lit-html", async function () {
        expect(await resolveImport("lit-html")).to.equal("/web_modules/lit-html.js");
        expect(await resolveImport("lit-html/lit-html.js")).to.equal("/web_modules/lit-html.js");
        expect(await resolveImport("lit-html/lib/render.js")).to.equal("/web_modules/lit-html.js");
        expect(await resolveImport("lit-html/lib/shady-render.js")).to.equal("/web_modules/lit-html/lib/shady-render.js");
    });

    it("relative imports of extraneous files", async function () {
        expect(await resolveImport("./styles")).to.equal("./styles.js");
        expect(await resolveImport("./styles.css")).to.equal("./styles.css?type=module");
        expect(await resolveImport("../styles.scss")).to.equal("../styles.scss?type=module");
    });

    it("smooth-scrollbar", async function () {
        expect(await resolveImport("smooth-scrollbar")).to.equal("/web_modules/smooth-scrollbar.js");
    });
});