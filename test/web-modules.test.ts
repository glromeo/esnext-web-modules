import {fail} from "assert";
import {expect} from "chai";
import * as fs from "fs";
import {existsSync, readFileSync} from "fs";
import {join, relative, resolve} from "path";
import {SourceMapConsumer} from "source-map";
import {WebModulesOptions} from "../lib";
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
    let imports = JSON.parse(out).imports;
    return [Object.keys(imports), imports];
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

    function setup(workspace: string, override: Partial<WebModulesOptions> = defaultOptions()) {
        return useWebModules({
            ...override,
            clean: true,
            rootDir: fixtureDir + workspace,
            resolve: {
                ...override.resolve,
                moduleDirectory: ["fixture/node_modules"]
            }
        });
    }

    it("can read configuration", function () {
        const cwd = process.cwd();
        process.chdir(fixtureDir);
        let {outDir} = useWebModules();
        process.chdir(cwd);
        expect(relative(fixtureDir, outDir).replace(/\\/g, "/")).to.equal("web_modules");
    });

    it("can bundle react", async function () {

        let {rollupWebModule} = setup("/react");

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
            "version",
            "default"
        ]);

        let [importMap] = readImportMap(`fixture/react/web_modules/import-map.json`);
        expect(importMap).to.include.members([
            "object-assign/index.js",
            "react/index.js",
            "react/cjs/react.development.js",
            "react"
        ]);
    });

    it("can bundle react-dom", async function () {

        let {rollupWebModule} = setup("/react");

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
            "version",
            "default"
        ]);

        let [importMap] = readImportMap(`fixture/react/web_modules/import-map.json`);
        expect(importMap).to.include.members([
            "react/index.js",
            "react/cjs/react.development.js",
            "object-assign/index.js",
            "react",
            "react-dom/index.js",
            "react-dom/cjs/react-dom.development.js",
            "scheduler/tracing.js",
            "scheduler/index.js",
            "scheduler/cjs/scheduler-tracing.development.js",
            "scheduler/cjs/scheduler.development.js",
            "react-dom"
        ]);

        let out = readTextFile(`fixture/react/web_modules/react-dom.js`);
        expect(out).to.have.string("export default reactDom;"); // default export workaround
        expect(out).not.to.have.string("var reactDom_production_min"); // make sure replace plugin works
    });

    it("can bundle prop-types", async function () {

        let {rollupWebModule, resolveImport} = setup("/react");

        await rollupWebModule("prop-types");

        let exports = readExports(`fixture/react/web_modules/prop-types.js`);
        expect(exports).to.have.members([
            "PropTypes",
            "any",
            "array",
            "arrayOf",
            "bool",
            "checkPropTypes",
            "element",
            "elementType",
            "exact",
            "func",
            "instanceOf",
            "node",
            "number",
            "object",
            "objectOf",
            "oneOf",
            "oneOfType",
            "resetWarningCache",
            "shape",
            "string",
            "symbol",
            "default"
        ]);

        let [importMap] = readImportMap(`fixture/react/web_modules/import-map.json`);
        expect(importMap).to.include.members([
            "prop-types/index.js",
            "prop-types/factoryWithTypeCheckers.js",
            "prop-types/checkPropTypes.js",
            "prop-types/lib/ReactPropTypesSecret.js",
            "prop-types"
        ]);

    });

    it("can bundle react-icons", async function () {

        let {rollupWebModule, resolveImport} = setup("/react");

        await rollupWebModule("react-icons/bs");

        let exports = readExports(`fixture/react/web_modules/react-icons.js`);
        expect(exports).to.have.members([
            "DefaultContext",
            "GenIcon",
            "IconBase",
            "IconContext",
            "IconsManifest"
        ]);

        let [importMap] = readImportMap(`fixture/react/web_modules/import-map.json`);
        expect(importMap).to.include.members([
            "react-icons/lib/esm/iconsManifest.js",
            "react-icons/lib/esm/iconBase.js",
            "react-icons/lib/esm/iconContext.js",
            "react-icons"
        ]);

    });

    it("can bundle countries-and-timezones", async function () {

        let {rollupWebModule, resolveImport} = setup("/iife");

        await rollupWebModule("countries-and-timezones");

        let exports = readExports(`fixture/iife/web_modules/countries-and-timezones.js`);
        expect(exports).to.have.members([
            "getAllCountries",
            "getAllTimezones",
            "getCountry",
            "getCountryForTimezone",
            "getTimezone",
            "getTimezonesForCountry",
            "default"
        ]);

        let [importMap] = readImportMap(`fixture/iife/web_modules/import-map.json`);
        expect(importMap).to.include.members([
            "countries-and-timezones/lib/esm/iconsManifest.js",
            "countries-and-timezones/lib/esm/iconBase.js",
            "countries-and-timezones/lib/esm/iconContext.js",
            "countries-and-timezones"
        ]);

    });

    it("can bundle antd", async function (this: Mocha.Context) {

        this.timeout(60000);

        let {rollupWebModule, resolveImport} = setup("/react");

        await rollupWebModule("antd");

        let exports = readExports(`fixture/react/web_modules/antd.js`);
        expect(exports).to.have.members([
            "ANT_MARK", "Affix", "Alert", "Anchor", "AutoComplete", "Avatar", "BackTop", "Badge", "Breadcrumb",
            "Button", "Calendar", "Card", "Carousel", "Cascader", "Checkbox", "Col", "Collapse", "Comment",
            "Components", "ConfigConsumer", "ConfigContext", "ConfigProvider", "Content", "DEFAULT_PAGE_SIZE",
            "DatePicker", "Descriptions", "DescriptionsContext", "Divider", "Drawer", "Dropdown", "Empty",
            "ExceptionMap", "Footer", "Form", "FormContext", "FormItemContext", "FormItemPrefixContext",
            "FormProvider", "Grid", "Group", "GroupContext", "Header", "IconMap", "Image", "Input", "InputNumber",
            "Layout", "LayoutContext", "List", "ListConsumer", "ListContext", "Mentions", "Menu", "Meta", "Modal",
            "OmitProps", "Option", "PageHeader", "Pagination", "Popconfirm", "Popover", "PresetColorTypes",
            "PresetStatusColorTypes", "Progress", "Radio", "RadioGroupContextProvider", "Rate", "Result", "Row",
            "SELECTION_ALL", "SELECTION_INVERT", "SELECTION_NONE", "Select", "SiderContext", "SizeContextProvider",
            "Skeleton", "Slider", "Space", "SpaceContext", "Spin", "Statistic", "Steps", "Switch", "T", "Table", "Tabs",
            "Tag", "TimePicker", "Timeline", "Tooltip", "Transfer", "Tree", "TreeNode", "TreeSelect", "Typography",
            "Upload", "addObserveTarget", "attachTypeApi", "calcRangeKeys", "changeConfirmLocale", "cloneElement",
            "configConsumerProps", "convertDirectoryKeysToNodes", "convertLegacyProps", "destroyFns", "easeInOutCubic",
            "fileToObject", "fixControlledValue", "formatCountdown", "formatTimeStr", "getColumnKey", "getColumnPos",
            "getConfirmLocale", "getFieldId", "getFileItem", "getFilterData", "getFixedBottom", "getFixedTop",
            "getInputClassName", "getInstance", "getKeyThenIncreaseKey", "getObserverEntities", "getOverflowOptions",
            "getPaginationParam", "getPlaceholder", "getRangePlaceholder", "getRenderPropValue", "getSortData",
            "getSuccessPercent", "getTargetRect", "getTimeProps", "globalConfig", "handleGradient", "hasPrefixSuffix",
            "isFlexSupported", "isImageUrl", "isPresetColor", "isStyleSupport", "isValidElement", "isWindow", "message",
            "notification", "offset", "previewImage", "removeFileItem", "removeObserveTarget", "renderColumnTitle",
            "replaceElement", "resetWarned", "resolveOnChange", "responsiveArray", "responsiveMap", "sortGradient",
            "throttleByAnimationFrame", "throttleByAnimationFrameDecorator", "toArray", "triggerFocus", "tuple",
            "tupleNum", "useForm", "useLocaleReceiver", "validProgress", "version", "withConfigConsumer",
            "withConfirm", "withError", "withInfo", "withSuccess", "withWarn", "default"
        ]);

        let [importMap] = readImportMap(`fixture/react/web_modules/import-map.json`);
        expect(importMap).to.include.members([
            "@fixture/react",
            "lodash/lodash.js",
            "lodash",
            "moment",
            "object-assign/index.js",
            "react",
            "react-dom/index.js",
            "react-dom",
            "antd/es/index.js",
            "@babel/runtime/helpers/toArray.js",
            "classnames/index.js",
            "omit.js/es/index.js",
            "rc-util/es/warning.js",
            "@babel/runtime/helpers/assertThisInitialized.js",
            "dom-align/dist-web/index.js",
            "antd"
        ]);

    });

    it("can bundle moment (dependency of antd)", async function () {
        let {rollupWebModule} = setup("/react");
        await rollupWebModule("moment");
        expect(existsSync(join(__dirname, "fixture/react/web_modules/moment.js"))).to.be.true;
    });

    it("can bundle lodash (dependency of antd)", async function () {
        let {rollupWebModule} = setup("/react");
        await rollupWebModule("lodash");
        expect(existsSync(join(__dirname, "fixture/react/web_modules/lodash.js"))).to.be.true;
    });

    it("can bundle lit-html (with ts sourcemap)", async function () {

        let {rollupWebModule, resolveImport} = setup("/lit-html");

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

        let [importMap] = readImportMap(`fixture/lit-html/web_modules/import-map.json`);
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

        let {rollupWebModule, resolveImport} = setup("/lit-html", {terser: {}});

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

        let [importMap] = readImportMap(`fixture/lit-html/web_modules/import-map.json`);
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
        let {rollupWebModule, resolveImport} = setup("/lit-html");
        await rollupWebModule("lit-html/lib/shady-render.js");
        expect(existsSync(join(__dirname, "fixture/lit-html/web_modules/lit-html.js"))).to.be.true;
    });

    it("to bundle lit-html is a prerequisite to bundle lit-html/lib/shady-render.js", async function () {
        let {rollupWebModule, resolveImport} = setup("/lit-html");
        await rollupWebModule("lit-html/lib/shady-render.js");
        expect(existsSync(join(__dirname, "fixture/lit-html/web_modules/lit-html.js"))).to.be.true;
    });

    it("can bundle lit-element", async function () {

        let {rollupWebModule} = setup("/lit-element");

        await rollupWebModule("lit-element");

        let exports = readExports(`fixture/lit-element/web_modules/lit-element.js`);
        expect(exports).to.have.members([
            "SVGTemplateResult",
            "TemplateResult",
            "html",
            "svg",
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

        let [importMap] = readImportMap(`fixture/lit-element/web_modules/import-map.json`);
        expect(importMap).to.include.members([
            "lit-element/lit-element.js",
            "lit-element"
        ]);

        let contents = readTextFile(`fixture/lit-element/web_modules/lit-element.js`);
        expect(contents.substring(124, 155)).to.equal("from '/web_modules/lit-html.js'");
    });

    it("can bundle bootstrap", async function () {

        let {rollupWebModule} = setup("/bootstrap");

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
            "Util",
            "default"
        ]);

        let [importMap] = readImportMap(`fixture/bootstrap/web_modules/import-map.json`);
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


    it("can bundle @babel/runtime/helpers/...", async function () {

        let {rollupWebModule} = setup("/babel-runtime");

        await rollupWebModule("@babel/runtime/helpers/esm/decorate.js");
        await rollupWebModule("@babel/runtime/helpers/esm/extends.js");

        let module = readTextFile(`fixture/babel-runtime/web_modules/@babel/runtime/helpers/esm/decorate.js`);
        expect(module).to.have.string(`function _arrayWithHoles(arr) {\n  if (Array.isArray(arr)) return arr;\n}`);

        let [importMap] = readImportMap(`fixture/babel-runtime/web_modules/import-map.json`);
        expect(importMap).not.to.include.members([
            "@babel/runtime"
        ]);

        expect(existsSync(`fixture/babel-runtime/web_modules/@babel/runtime.js`)).to.be.false;
    });


    it("can bundle redux & co.", async function () {

        this.timeout(10000);

        let {rollupWebModule} = setup("/redux");

        await rollupWebModule("@reduxjs/toolkit");
        await rollupWebModule("redux");
        await rollupWebModule("redux-logger");
        await rollupWebModule("redux-thunk");
        await rollupWebModule("react-redux");

        let exports = readExports(`fixture/redux/web_modules/redux.js`);
        expect(exports).to.include.members([
            "applyMiddleware",
            "bindActionCreators",
            "combineReducers",
            "compose",
            "createStore"
        ]);

        expect(readTextFile(`fixture/redux/web_modules/@reduxjs/toolkit.js`))
            .to.have.string(`export * from '/web_modules/redux.js';`);

        let [importMap] = readImportMap(`fixture/redux/web_modules/import-map.json`);
        expect(importMap).to.include.members([
            "redux-thunk/es/index.js",
            "redux-thunk",
            "redux/es/redux.js",
            "symbol-observable/es/index.js",
            "symbol-observable/es/ponyfill.js",
            "redux",
            "@reduxjs/toolkit/dist/redux-toolkit.esm.js",
            "immer/dist/immer.esm.js",
            "reselect/es/index.js",
            "@reduxjs/toolkit",
            "redux-logger/dist/redux-logger.js",
            "redux-logger",
            "react-redux/es/index.js",
            "react-redux"
        ]);
    });

    it("react & react-dom share object-assign causing split", async function () {

        let {rollupWebModule} = setup("/react");

        await rollupWebModule("react");
        await rollupWebModule("react-dom");

        let exports = readExports(`fixture/react/web_modules/object-assign.js`);
        expect(exports).to.have.members([
            "default"
        ]);

        let [_,imports] = readImportMap(`fixture/react/web_modules/import-map.json`);
        expect(imports["object-assign/index.js"]).to.equal("/web_modules/object-assign/index.js");
    })
});
