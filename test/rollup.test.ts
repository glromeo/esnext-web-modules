import {bundleWebModule, WebModuleBundlerOptions} from "../src/esnext-bundler";
import * as path from "path";
import * as fs from "fs";
import {expect} from "chai";

let readExports = function (path: string) {
    let out = fs.readFileSync(path, "utf-8");
    return out.substring(out.lastIndexOf("{") + 1, out.lastIndexOf("}")).trim().split(",").map(e => e.trim());
};

describe("rollup", function () {

    const webModulesDir = path.resolve(__dirname, "fixture/web_modules");

    const options:WebModuleBundlerOptions = {
        moduleDirectories: [path.resolve(__dirname, "fixture/node_modules")],
        outDir: webModulesDir
    };

    it("can bundle react", async function () {
        let input = "react";
        await bundleWebModule(input, options);
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
            "version",
        ])});

    it("can bundle lit-html", async function () {
        let input = "lit-html";
        await bundleWebModule(input, options);
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
            "templateFactory",
        ])
    });
});
