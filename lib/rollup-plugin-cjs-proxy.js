"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollupPluginCjsProxy = void 0;
const cjs_module_lexer_1 = require("cjs-module-lexer");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const tiny_node_logger_1 = __importDefault(require("tiny-node-logger"));
const es_import_utils_1 = require("./es-import-utils");
const parseCjsReady = cjs_module_lexer_1.init();
function scanCjs(filename, collected = new Set()) {
    let source = fs.readFileSync(filename, "utf-8");
    let { exports, reexports } = cjs_module_lexer_1.parse(source);
    for (const e of exports) {
        collected.add(e);
    }
    for (let required of reexports) {
        if (!es_import_utils_1.isBare(required)) {
            if (required === "..") {
                required = "../index";
            }
            else if (required === ".") {
                required = "./index";
            }
            let requiredFilename = require.resolve(required, { paths: [path.dirname(filename)] });
            scanCjs(requiredFilename, collected);
        }
    }
    return collected;
}
function rollupPluginCjsProxy({ entryModules }) {
    return {
        name: "rollup-plugin-cjs-proxy",
        async buildStart(options) {
            await parseCjsReady;
        },
        async resolveId(source, importer) {
            if (!importer && source.charCodeAt(0) !== 0 && entryModules.has(source)) {
                let resolution = await this.resolve(source, undefined, { skipSelf: true });
                if (resolution) {
                    tiny_node_logger_1.default.debug("cjs-proxy resolved:", source, resolution.id);
                    return `${resolution.id}?cjs-proxy`;
                }
            }
            return null;
        },
        load(id) {
            if (id.endsWith("?cjs-proxy")) {
                const entryId = id.slice(0, -10);
                const entryUrl = es_import_utils_1.toPosix(entryId);
                const exports = scanCjs(entryId);
                exports.delete("__esModule");
                let proxy = "";
                if (!exports.has("default")) {
                    proxy += `import __default__ from "${entryUrl}";\nexport default __default__;\n`;
                }
                if (exports.size > 0) {
                    proxy += `export {\n${Array.from(exports).join(",\n")}\n} from "${entryUrl}";\n`;
                }
                else {
                    let moduleInstance = require(entryId);
                    if (!(!moduleInstance || moduleInstance.constructor !== Object)) {
                        let filteredExports = Object.keys(moduleInstance).filter(function (moduleExport) {
                            return moduleExport !== "default" && moduleExport !== "__esModule";
                        });
                        proxy += `export {\n${filteredExports.join(",\n")}\n} from "${entryUrl}";\n`;
                    }
                }
                return proxy || fs.readFileSync(entryId, "utf-8");
            }
            return null;
        }
    };
}
exports.rollupPluginCjsProxy = rollupPluginCjsProxy;
//# sourceMappingURL=rollup-plugin-cjs-proxy.js.map