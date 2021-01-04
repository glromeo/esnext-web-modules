import {expect} from "chai";
import * as fs from "fs";
import {existsSync, readFileSync} from "fs";
import {join, relative, resolve} from "path";
import {SourceMapConsumer} from "source-map";
import {defaultOptions, useWebModules} from "../src";

function readExports(path: string) {
    let out = fs.readFileSync(join(__dirname, path), "utf-8");
    return out.substring(out.lastIndexOf("{") + 1, out.lastIndexOf("}")).split(",").map(e => e.split(" as ").pop()!.trim());
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

    it("can read configuration", function () {
        const cwd = process.cwd();
        process.chdir(fixtureDir);
        let {outDir} = useWebModules();
        process.chdir(cwd);
        expect(relative(fixtureDir, outDir).replace(/\\/g, "/")).to.equal("web_modules");
    });

    it("can bundle react", async function () {

        let {rollupWebModule} = useWebModules({
            clean: true,
            rootDir: fixtureDir + "/react",
            resolve: {
                moduleDirectory: [resolve(__dirname, "fixture/node_modules")]
            }
        });

        await rollupWebModule("react");

        let exports = readExports(`fixture/react/web_modules/react.js`);
        expect(exports).to.have.members([
            "Children",
            "Component",
            "Fragment",
            "Profiler",
            "PureComponent",
            "StrictMode",
            "Suspense",
            "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED",
            "cloneElement",
            "createContext",
            "createElement",
            "createFactory",
            "createRef",
            "forwardRef",
            "isValidElement",
            "lazy",
            "memo",
            "useCallback",
            "useContext",
            "useDebugValue",
            "useEffect",
            "useImperativeHandle",
            "useLayoutEffect",
            "useMemo",
            "useReducer",
            "useRef",
            "useState",
            "version"
        ]);

        let importMap = readImportMap(`fixture/react/web_modules/import-map.json`);
        expect(importMap).to.include.members([
            "object-assign/index.js",
            "object-assign",
            "react/index.js",
            "react/cjs/react.production.min.js",
            "react/cjs/react.development.js",
            "react"
        ]);
    });

    it("can bundle react-dom", async function () {

        let webModulesConfig = defaultOptions();

        let {rollupWebModule} = useWebModules({
            clean: true,
            ...webModulesConfig,
            rootDir: fixtureDir + "/react",
            resolve: {
                moduleDirectory: [join(__dirname, "fixture/node_modules")]
            }
        });

        const reactDomReady = rollupWebModule("react-dom");
        expect(rollupWebModule("react-dom")).to.equal(reactDomReady);                                    // PENDING TASK
        await reactDomReady;

        expect(rollupWebModule("react-dom")).to.equal(rollupWebModule("react-dom"));                 // ALREADY_RESOLVED

        let exports = readExports(`fixture/react/web_modules/react-dom.js`);
        expect(exports).to.have.members([
            "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED",
            "createPortal",
            "findDOMNode",
            "flushSync",
            "hydrate",
            "render",
            "unmountComponentAtNode",
            "unstable_batchedUpdates",
            "unstable_createPortal",
            "unstable_renderSubtreeIntoContainer",
            "version"
        ]);

        let importMap = readImportMap(`fixture/react/web_modules/import-map.json`);
        expect(importMap).to.include.members([
            "scheduler/index.js",
            "scheduler/cjs/scheduler.production.min.js",
            "scheduler/cjs/scheduler.development.js",
            "scheduler",
            "react-dom/index.js",
            "react-dom/cjs/react-dom.production.min.js",
            "react-dom/cjs/react-dom.development.js",
            "react-dom"
        ]);

        let out = readTextFile(`fixture/react/web_modules/react-dom.js`);
        expect(out).to.have.string("export default reactDom;"); // default export workaround
        expect(out).to.have.string("var reactDom_production_min = {};"); // rollup-plugin-dummy-module
    });

    it("can bundle lit-html (with ts sourcemap)", async function () {

        let {rollupWebModule, resolveImport} = useWebModules({
            clean: true,
            rootDir: fixtureDir + "/lit-html",
            resolve: {
                moduleDirectory: ["fixture/node_modules"]
            }
        });

        await rollupWebModule("lit-html");

        let exports = readExports(`fixture/lit-html/web_modules/lit-html.js`);
        expect(exports).to.have.members([
            "AttributeCommitter",
            "AttributePart",
            "BooleanAttributePart",
            "DefaultTemplateProcessor",
            "EventPart",
            "NodePart",
            "PropertyCommitter",
            "PropertyPart",
            "SVGTemplateResult",
            "Template",
            "TemplateInstance",
            "TemplateResult",
            "boundAttributeSuffix",
            "createMarker",
            "defaultTemplateProcessor",
            "directive",
            "html",
            "isCEPolyfill",
            "isDirective",
            "isIterable",
            "isPrimitive",
            "isTemplatePartActive",
            "lastAttributeNameRegex",
            "marker",
            "markerRegex",
            "noChange",
            "nodeMarker",
            "nothing",
            "parts",
            "removeNodes",
            "render",
            "reparentNodes",
            "svg",
            "templateCaches",
            "templateFactory"
        ]);

        let importMap = readImportMap(`fixture/lit-html/web_modules/import-map.json`);
        expect(importMap).to.include.members([
            "lit-html",
            "lit-html/lit-html.js",
            "lit-html/lib/default-template-processor.js",
            "lit-html/lib/parts.js",
            "lit-html/lib/directive.js",
            "lit-html/lib/dom.js",
            "lit-html/lib/part.js",
            "lit-html/lib/template-instance.js",
            "lit-html/lib/template.js",
            "lit-html/lib/template-result.js",
            "lit-html/lib/render.js",
            "lit-html/lib/template-factory.js"
        ]);

        let rawSourceMap = readSourceMap(`fixture/lit-html/web_modules/lit-html.js`);
        await SourceMapConsumer.with(rawSourceMap, null, consumer => {
            expect(consumer.sources).to.have.members([
                "../../node_modules/lit-html/src/lib/directive.ts",
                "../../node_modules/lit-html/src/lib/dom.ts",
                "../../node_modules/lit-html/src/lib/part.ts",
                "../../node_modules/lit-html/src/lib/template.ts",
                "../../node_modules/lit-html/src/lib/template-instance.ts",
                "../../node_modules/lit-html/src/lib/template-result.ts",
                "../../node_modules/lit-html/src/lib/parts.ts",
                "../../node_modules/lit-html/src/lib/default-template-processor.ts",
                "../../node_modules/lit-html/src/lib/template-factory.ts",
                "../../node_modules/lit-html/src/lib/render.ts",
                "../../node_modules/lit-html/src/lit-html.ts"
            ]);

            expect(
                consumer.originalPositionFor({line: 14, column: 0})
            ).to.eql({
                source: "../../node_modules/lit-html/src/lib/directive.ts",
                line: 17,
                column: 0,
                name: null
            });

            expect(
                consumer.generatedPositionFor({
                    source: "../../node_modules/lit-html/src/lit-html.ts",
                    line: 2,
                    column: 10
                })
            ).to.eql({
                line: 1212, column: 0, lastColumn: null
            });
        });

        expect(await resolveImport("lit-html/lib/render.js")).to.equal("/web_modules/lit-html.js");
        expect(await resolveImport("lit-html/lib/shady-render.js")).to.equal("/web_modules/lit-html/lib/shady-render.js");
        expect(await resolveImport("lit-html/directives/repeat.js")).to.equal("/web_modules/lit-html/directives/repeat.js");
    });

    it("can bundle lit-html/lib/shady-render.js (with terser)", async function () {

        let {rollupWebModule, resolveImport} = useWebModules({
            clean: true,
            rootDir: fixtureDir + "/lit-html",
            resolve: {
                moduleDirectory: ["fixture/node_modules"]
            },
            terser: {}
        });

        expect(await resolveImport("lit-html/lib/shady-render.js")).to.equal("/web_modules/lit-html/lib/shady-render.js");
        expect(existsSync(join(__dirname, "fixture/web_modules/lit-html/lib/shady-render.js"))).to.be.false;

        await rollupWebModule("lit-html/lib/shady-render.js");

        let exports = readExports(`fixture/lit-html/web_modules/lit-html.js`);
        expect(exports).to.have.members([
            "AttributeCommitter",
            "AttributePart",
            "BooleanAttributePart",
            "DefaultTemplateProcessor",
            "EventPart",
            "NodePart",
            "PropertyCommitter",
            "PropertyPart",
            "SVGTemplateResult",
            "Template",
            "TemplateInstance",
            "TemplateResult",
            "boundAttributeSuffix",
            "createMarker",
            "defaultTemplateProcessor",
            "directive",
            "html",
            "isCEPolyfill",
            "isDirective",
            "isIterable",
            "isPrimitive",
            "isTemplatePartActive",
            "lastAttributeNameRegex",
            "marker",
            "markerRegex",
            "noChange",
            "nodeMarker",
            "nothing",
            "parts",
            "removeNodes",
            "render",
            "reparentNodes",
            "svg",
            "templateCaches",
            "templateFactory"
        ]);

        let importMap = readImportMap(`fixture/lit-html/web_modules/import-map.json`);
        expect(importMap).to.include.members([
            "lit-html",
            "lit-html/lit-html.js",
            "lit-html/lib/default-template-processor.js",
            "lit-html/lib/parts.js",
            "lit-html/lib/directive.js",
            "lit-html/lib/dom.js",
            "lit-html/lib/part.js",
            "lit-html/lib/template-instance.js",
            "lit-html/lib/template.js",
            "lit-html/lib/template-result.js",
            "lit-html/lib/render.js",
            "lit-html/lib/template-factory.js"
        ]);

        try {
            readSourceMap(`fixture/lit-html/web_modules/lit-html.js`);
            fail("should not produce source maps");
        } catch ({code}) {
            expect(code).to.equal("ENOENT");
        }
    });

    it("to bundle lit-html is a prerequisite to bundle lit-html/lib/shady-render.js", async function () {
        let {rollupWebModule, resolveImport} = useWebModules({
            clean: true,
            rootDir: fixtureDir + "/lit-html",
            resolve: {
                moduleDirectory: ["fixture/node_modules"]
            }
        });
        await rollupWebModule("lit-html/lib/shady-render.js");
        expect(existsSync(join(__dirname, "fixture/lit-html/web_modules/lit-html.js"))).to.be.true;
    });

    it("can bundle lit-element", async function () {

        let {rollupWebModule} = useWebModules({
            clean: true,
            rootDir: fixtureDir + "/lit-element",
            resolve: {
                moduleDirectory: [join(__dirname, "fixture/node_modules")]
            }
        });

        await rollupWebModule("lit-element");

        let exports = readExports(`fixture/lit-element/web_modules/lit-element.js`);
        expect(exports).to.have.members([
            "CSSResult",
            "LitElement",
            "UpdatingElement",
            "css",
            "customElement",
            "defaultConverter",
            "eventOptions",
            "internalProperty",
            "notEqual",
            "property",
            "query",
            "queryAll",
            "queryAssignedNodes",
            "queryAsync",
            "supportsAdoptingStyleSheets",
            "unsafeCSS"
        ]);

        let importMap = readImportMap(`fixture/lit-element/web_modules/import-map.json`);
        expect(importMap).to.include.members([
            "lit-element/lit-element.js",
            "lit-element"
        ]);

        let contents = readTextFile(`fixture/lit-element/web_modules/lit-element.js`);
        expect(contents.substring(124, 155)).to.equal("from '/web_modules/lit-html.js'");
    });

    it("can bundle bootstrap", async function () {

        let {rollupWebModule} = useWebModules({
            clean: true,
            rootDir: fixtureDir + "/bootstrap",
            resolve: {
                moduleDirectory: [join(__dirname, "fixture/node_modules")]
            }
        });

        await rollupWebModule("bootstrap");

        let exports = readExports(`fixture/bootstrap/web_modules/bootstrap.js`);
        expect(exports).to.have.members([
            "Alert",
            "Button",
            "Carousel",
            "Collapse",
            "Dropdown",
            "Modal",
            "Popover",
            "Scrollspy",
            "Tab",
            "Toast",
            "Tooltip",
            "Util"
        ]);

        let importMap = readImportMap(`fixture/bootstrap/web_modules/import-map.json`);
        expect(importMap).to.include.members([
            "jquery/dist/jquery.js",
            "jquery",
            "popper.js/dist/esm/popper.js",
            "popper.js",
            "bootstrap/dist/js/bootstrap.js",
            "bootstrap"
        ]);

        try {
            await rollupWebModule("bootstrap/dist/css/bootstrap.css");
            fail("web modules don't include extraneous resources");
        } catch (e) {
            expect(e.message).to.equal("Unexpected token (Note that you need plugins to import files that are not JavaScript)");
        }
    });


    it("can bundle @babel/runtime/helpers/esm/decorate.js", async function () {

        let {rollupWebModule} = useWebModules({
            clean: true,
            rootDir: fixtureDir + "/babel-runtime",
            resolve: {
                moduleDirectory: [join(__dirname, "fixture/node_modules")]
            },
            squash: ["@babel/runtime/**"]
        });

        await rollupWebModule("@babel/runtime/helpers/esm/decorate.js");

        let module = readTextFile(`fixture/babel-runtime/web_modules/@babel/runtime/helpers/esm/decorate.js`);
        expect(module).to.have.string(`function _arrayWithHoles(arr) {\n  if (Array.isArray(arr)) return arr;\n}`);

        let importMap = readImportMap(`fixture/babel-runtime/web_modules/import-map.json`);
        expect(importMap).not.to.include.members([
            "@babel/runtime"
        ]);

        expect(existsSync(`fixture/babel-runtime/web_modules/@babel/runtime.js`)).to.be.false;
    });

});
