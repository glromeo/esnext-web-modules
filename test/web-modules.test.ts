import {useWebModules} from "../src/web-modules";
import * as path from "path";
import * as fs from "fs";
import {expect} from "chai";
import sourceMap from "source-map";

function readExports(path: string) {
    let out = fs.readFileSync(path, "utf-8");
    return out.substring(out.lastIndexOf("{") + 1, out.lastIndexOf("}")).split(",").map(e => e.split(" as ").pop()!.trim());
}

function readImportMap(path: string) {
    let out = fs.readFileSync(path, "utf-8");
    return Object.keys(JSON.parse(out).imports);
}

function readSourceMap(path: string) {
    let out = fs.readFileSync(path + ".map", "utf-8");
    return JSON.parse(out);
}

describe("web modules", function () {

    const fixtureDir = path.resolve(__dirname, "fixture");

    it("can bundle react", async function () {

        let {rollupWebModule} = useWebModules({
            baseDir: __dirname,
            rootDir: fixtureDir + "/react",
            resolve: {moduleDirectory: [path.resolve(__dirname, "fixture/node_modules")]}
        });

        const webModulesDir = path.resolve(__dirname, "fixture/react/web_modules");

        await rollupWebModule("react");

        let exports = readExports(`${webModulesDir}/react.js`);
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

        let importMap = readImportMap(`${webModulesDir}/import-map.json`);
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

        let webModulesConfig = /* loadWebModulesConfig(); */ {
            dummies: {
                "react/cjs/react.production.min.js": `module.exports = {};`,
                "react-dom/cjs/react-dom.production.min.js": `module.exports = {};`
            }
        };

        let {rollupWebModule} = useWebModules({
            ...webModulesConfig,
            baseDir: __dirname,
            rootDir: fixtureDir + "/react",
            resolve: {moduleDirectory: [path.resolve(__dirname, "fixture/node_modules")]}
        });

        const webModulesDir = path.resolve(__dirname, "fixture/react/web_modules");

        await rollupWebModule("react-dom");

        let exports = readExports(`${webModulesDir}/react-dom.js`);
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

        let importMap = readImportMap(`${webModulesDir}/import-map.json`);
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
    });

    it("can bundle lit-html (with ts sourcemap)", async function () {

        let {rollupWebModule, resolveImport} = useWebModules({
            baseDir: __dirname,
            rootDir: fixtureDir + "/lit-html",
            resolve: {moduleDirectory: [path.resolve(__dirname, "fixture/node_modules")]}
        });

        const webModulesDir = path.resolve(__dirname, "fixture/lit-html/web_modules");

        await rollupWebModule("lit-html");

        let exports = readExports(`${webModulesDir}/lit-html.js`);
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

        let importMap = readImportMap(`${webModulesDir}/import-map.json`);
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

        let rawSourceMap = readSourceMap(`${webModulesDir}/lit-html.js`);
        await sourceMap.SourceMapConsumer.with(rawSourceMap, null, consumer => {
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
        expect(await resolveImport("lit-html/directives/repeat.js")).to.equal("/web_modules/lit-html/directives/repeat.js");
    });

    // it("can bundle lit-html (with terser)", async function () {
    //
    //     let {output:[firstChunk]} = (await rollupWebModule("lit-html", {...options, dir: undefined, terser: {}}))!;
    //     expect(firstChunk.exports).to.have.members([
    //         "AttributeCommitter",
    //         "AttributePart",
    //         "BooleanAttributePart",
    //         "DefaultTemplateProcessor",
    //         "EventPart",
    //         "NodePart",
    //         "PropertyCommitter",
    //         "PropertyPart",
    //         "SVGTemplateResult",
    //         "Template",
    //         "TemplateInstance",
    //         "TemplateResult",
    //         "boundAttributeSuffix",
    //         "createMarker",
    //         "defaultTemplateProcessor",
    //         "directive",
    //         "html",
    //         "isCEPolyfill",
    //         "isDirective",
    //         "isIterable",
    //         "isPrimitive",
    //         "isTemplatePartActive",
    //         "lastAttributeNameRegex",
    //         "marker",
    //         "markerRegex",
    //         "noChange",
    //         "nodeMarker",
    //         "nothing",
    //         "parts",
    //         "removeNodes",
    //         "render",
    //         "reparentNodes",
    //         "svg",
    //         "templateCaches",
    //         "templateFactory"
    //     ]);
    // });

    it("can bundle bootstrap", async function () {

        let {rollupWebModule} = useWebModules({
            baseDir: __dirname,
            rootDir: fixtureDir + "/bootstrap",
            resolve: {moduleDirectory: [path.resolve(__dirname, "fixture/node_modules")]}
        });

        const webModulesDir = path.resolve(__dirname, "fixture/bootstrap/web_modules");

        await rollupWebModule("bootstrap");

        let exports = readExports(`${webModulesDir}/bootstrap.js`);
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

        let importMap = readImportMap(`${webModulesDir}/import-map.json`);
        expect(importMap).to.include.members([
            "jquery/dist/jquery.js",
            "jquery",
            "popper.js/dist/esm/popper.js",
            "popper.js",
            "bootstrap/dist/js/bootstrap.js",
            "bootstrap"
        ]);
    });
});
