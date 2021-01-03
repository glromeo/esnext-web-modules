import {expect} from "chai";
import * as path from "path";
import {useWebModules, WebModulesConfig} from "../src";

describe("resolve import", function () {

    function setup(dirname: string) {
        const rootDir = path.resolve(__dirname, dirname);
        const webModulesDir = path.resolve(__dirname, "fixture/web_modules");

        const options: WebModulesConfig = {
            clean: true,
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
        return {
            rootDir,
            webModulesDir,
            ...useWebModules(options)
        };
    }

    it("urls go unmodified", async function () {

        let {resolveImport} = setup("fixture");

        expect(await resolveImport("http://127.0.0.1:8080/echo?query=message"))
            .to.equal("http://127.0.0.1:8080/echo?query=message");
        expect(await resolveImport("file:///echo.do?query=message"))
            .to.equal("file:///echo.do?query=message");
    });

    it("relative imports", async function () {

        let {rootDir, resolveImport} = setup("fixture/workspaces");

        expect(await resolveImport("./epsilon")).to.equal("./epsilon.js");

        // should resolve fixture/alpha/beta/delta.sigma adding query for type=module
        expect(await resolveImport("./delta.sigma")).to.equal(
            "./delta.sigma?type=module"
        );
        // ...leaving any existing query alone
        expect(await resolveImport("./delta.sigma?q=e")).to.equal("./delta.sigma?type=module&q=e");

    });


    it("lit-html/lit-html.js", async function () {

        let {rootDir, webModulesDir, resolveImport, importMap} = setup("fixture");

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

        expect(await resolveImport("lit-html")).to.equal(
            "/web_modules/lit-html.js"
        );
        expect(await resolveImport("lit-html/lit-html.js")).to.equal(
            "/web_modules/lit-html.js"
        );
        expect(await resolveImport("lit-html/lib/parts.js")).to.equal(
            "/web_modules/lit-html.js"
        );
        expect(await resolveImport("lit-html/lib/shady-render.js")).to.equal(
            "/web_modules/lit-html/lib/shady-render.js"
        );
        expect(await resolveImport("lit-html/directives/unsafe-html.js")).to.equal(
            "/web_modules/lit-html/directives/unsafe-html.js"
        );
    });

    it("bootstrap", async function () {
        let {resolveImport} = setup("fixture");
        expect(await resolveImport("bootstrap")).to.equal("/web_modules/bootstrap.js");
        expect(await resolveImport("bootstrap/dist/css/bootstrap.css")).to.equal("/node_modules/bootstrap/dist/css/bootstrap.css?type=module");
    });

    it("lit-html", async function () {
        let {resolveImport} = setup("fixture");
        expect(await resolveImport("lit-html")).to.equal("/web_modules/lit-html.js");
        expect(await resolveImport("lit-html/lit-html.js")).to.equal("/web_modules/lit-html.js");
        expect(await resolveImport("lit-html/lib/render.js")).to.equal("/web_modules/lit-html.js");
        expect(await resolveImport("lit-html/lib/shady-render.js")).to.equal("/web_modules/lit-html/lib/shady-render.js");
    });

    it("relative imports of asset files", async function () {
        let {resolveImport} = setup("fixture");
        expect(await resolveImport("./styles")).to.equal("./styles.js");
        expect(await resolveImport("./styles.css")).to.equal("./styles.css?type=module");
        expect(await resolveImport("../styles.scss")).to.equal("../styles.scss?type=module");
    });

    it("smooth-scrollbar has to be squashed!", async function () {
        let {resolveImport} = setup("fixture");
        expect(await resolveImport("smooth-scrollbar")).to.equal("/web_modules/smooth-scrollbar.js");
    });

    it("fast-diff", async function () {
        let {resolveImport} = setup("fixture");
        expect(await resolveImport("fast-diff")).to.equal("/web_modules/fast-diff.js");
    });

    it("tippy.js", async function () {
        let {resolveImport} = setup("fixture");
        expect(await resolveImport("tippy.js")).to.equal("/web_modules/tippy.js.js");
    });

});
