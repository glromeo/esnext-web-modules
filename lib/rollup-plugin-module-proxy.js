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
Object.defineProperty(exports, "__esModule", { value: true });
exports.moduleProxy = void 0;
const path = __importStar(require("path"));
const cjs_module_lexer_1 = require("cjs-module-lexer");
const es_module_lexer_1 = require("es-module-lexer");
const fs = __importStar(require("fs"));
const es_import_utils_1 = require("./es-import-utils");
const parseCjsReady = cjs_module_lexer_1.init();
function scanCjs(filename, collectedExports) {
    let source = fs.readFileSync(filename, "utf-8");
    let { exports, reexports } = cjs_module_lexer_1.parse(source);
    for (const e of exports)
        if (e !== "__esModule") {
            collectedExports.add(e);
        }
    for (const re of reexports) {
        scanCjs(path.resolve(path.dirname(filename), re), collectedExports);
    }
}
function scanEsm(filename, collected, encountered) {
    let source = fs.readFileSync(filename, "utf-8");
    let [imports, exports] = es_module_lexer_1.parse(source);
    let filtered = Array.from(exports).filter(e => !encountered.has(e));
    for (const f of filtered) {
        encountered.add(f);
    }
    collected.set(filename, filtered);
    for (const { s, e } of imports) {
        let imported = path.resolve(path.dirname(filename), source.substring(s, e));
        if (!collected.has(imported)) {
            scanEsm(imported, collected, encountered);
        }
    }
}
function rewriteImports(code, importMap) {
    let [imports] = es_module_lexer_1.parse(code);
    let i = 0, rewritten = "";
    for (const { s, e } of imports) {
        let url = code.substring(s, e);
        if (es_import_utils_1.isBare(url)) {
            rewritten += code.substring(i, s);
            rewritten += importMap.imports[url];
        }
        else {
            rewritten += code.substring(i, e);
        }
        i = e;
    }
    return rewritten + code.substring(i);
}
function moduleProxy(type, resolveImport) {
    return {
        name: "module-proxy",
        async resolveId(source, importer) {
            if (!importer) {
                let resolution = await this.resolve(source, undefined, { skipSelf: true });
                if (resolution) {
                    return `${resolution.id}?${type}`;
                }
            }
            else {
                if (source.charCodeAt(0) !== 0 && es_import_utils_1.isBare(source)) {
                    return false;
                }
            }
            return null;
        },
        async load(id) {
            if (id.endsWith("?cjs-proxy")) {
                const imported = id.slice(0, -10);
                await parseCjsReady;
                const exports = new Set();
                scanCjs(imported, exports);
                return `export {\n${Array.from(exports).join(",\n")}\n} from "${imported.replace(/\\/g, "/")}";\n`;
            }
            if (id.endsWith("?esm-proxy")) {
                const imported = id.slice(0, -10);
                await es_module_lexer_1.init;
                const exports = new Map();
                scanEsm(imported, exports, new Set());
                let proxy = "";
                for (const [filename, names] of Array.from(exports.entries())) {
                    proxy += `export {\n${Array.from(names).join(",\n")}\n} from "${filename.replace(/\\/g, "/")}";\n`;
                }
                return proxy;
            }
            return null;
        },
        renderChunk(code) {
            return { code: rewriteImports(code, { imports: {} }), map: null };
        }
    };
}
exports.moduleProxy = moduleProxy;
//# sourceMappingURL=rollup-plugin-module-proxy.js.map