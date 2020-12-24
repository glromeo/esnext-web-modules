import {bundleWebModule, WebModuleBundlerOptions} from "../src/esnext-bundler";
import * as path from "path";
import * as fs from "fs";
import {expect} from "chai";
import sourceMap from "source-map";

function readExports(path: string) {
    let out = fs.readFileSync(path, "utf-8");
    return out.substring(out.lastIndexOf("{") + 1, out.lastIndexOf("}")).split(",").map(e => e.trim());
}

function readImportMap(path: string) {
    let out = fs.readFileSync(path, "utf-8");
    return Object.keys(JSON.parse(out).imports);
}

function readSourceMap(path: string) {
    let out = fs.readFileSync(path + ".map", "utf-8");
    return JSON.parse(out);
}

describe("bundle", function () {

    const webModulesDir = path.resolve(__dirname, "fixture/web_modules");

    const options: WebModuleBundlerOptions = {
        paths: [path.resolve(__dirname, "fixture/node_modules")],
        dir: webModulesDir
    };

    afterEach(function () {
        if (false) try {
            fs.rmdirSync(webModulesDir, {recursive:true});
        } catch (e) {
        }
    });

    it("can bundle react", async function () {

        await bundleWebModule("react", options);

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
        expect(importMap).to.have.members([
            "react",
            "react/index.js",
            "react/cjs/react.production.min.js",
            "react/cjs/react.development.js",
            "object-assign/index.js"
        ]);
    });


    it("can bundle lit-html (with ts sourcemap)", async function () {

        await bundleWebModule("lit-html", options);

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
        expect(importMap).to.have.members([
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
                "../node_modules/lit-html/src/lib/directive.ts",
                "../node_modules/lit-html/src/lib/dom.ts",
                "../node_modules/lit-html/src/lib/part.ts",
                "../node_modules/lit-html/src/lib/template.ts",
                "../node_modules/lit-html/src/lib/template-instance.ts",
                "../node_modules/lit-html/src/lib/template-result.ts",
                "../node_modules/lit-html/src/lib/parts.ts",
                "../node_modules/lit-html/src/lib/default-template-processor.ts",
                "../node_modules/lit-html/src/lib/template-factory.ts",
                "../node_modules/lit-html/src/lib/render.ts",
                "../node_modules/lit-html/src/lit-html.ts"
            ]);

            expect(
                consumer.originalPositionFor({line: 14, column: 0})
            ).to.eql({
                source: "../node_modules/lit-html/src/lib/directive.ts",
                line: 17,
                column: 0,
                name: null
            });

            expect(
                consumer.generatedPositionFor({
                    source: "../node_modules/lit-html/src/lit-html.ts",
                    line: 2,
                    column: 10
                })
            ).to.eql({
                line: 1212, column: 0, lastColumn: null
            });
        });
    });

    it("can bundle lit-html (with terser)", async function () {

        let {output:[firstChunk]} = (await bundleWebModule("lit-html", {...options, dir: undefined, terser: {}}))!;
        expect(firstChunk.exports).to.have.members([
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
    });

    it("can bundle bootstrap", async function () {

        await bundleWebModule("bootstrap", options);

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
            "Util",
        ]);

        let importMap = readImportMap(`${webModulesDir}/import-map.json`);
        expect(importMap).to.have.members([
            "bootstrap",
            "bootstrap/dist/js/bootstrap.js"
        ]);
    });
});
