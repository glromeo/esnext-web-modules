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
exports.rewriteImports = void 0;
const es_module_lexer_1 = require("es-module-lexer");
const es_import_utils_1 = require("./es-import-utils");
const path = __importStar(require("path"));
const RESOLVED_IMPORT = "rewrite-imports:resolved_import";
function rewriteImports({ imports: importMap, resolver: resolveImport }) {
    return {
        name: "rewrite-imports",
        async resolveId(source, importer) {
            if (importer && source.charCodeAt(0) !== 0) {
                if (es_import_utils_1.isBare(source)) {
                    let resolved = await resolveImport(source);
                    return { id: source, external: true, meta: { [RESOLVED_IMPORT]: resolved } };
                }
                else {
                    let absolute = path.resolve(path.dirname(importer), source);
                    let moduleBareUrl = es_import_utils_1.bareNodeModule(absolute);
                    let resolved = importMap[moduleBareUrl];
                    if (resolved) {
                        return { id: source, external: true, meta: { [RESOLVED_IMPORT]: resolved } };
                    }
                }
            }
            return null;
        },
        renderChunk(code, chunk, options) {
            var _a;
            let [imports] = es_module_lexer_1.parse(code);
            let l = 0, rewritten = "";
            for (const { s, e } of imports) {
                let url = code.substring(s, e);
                let resolved = (_a = this.getModuleInfo(url)) === null || _a === void 0 ? void 0 : _a.meta[RESOLVED_IMPORT];
                if (resolved) {
                    rewritten += code.substring(l, s);
                    rewritten += resolved;
                }
                else {
                    rewritten += code.substring(l, e);
                }
                l = e;
            }
            return { code: rewritten + code.substring(l), map: null };
        }
    };
}
exports.rewriteImports = rewriteImports;
//# sourceMappingURL=rollup-plugin-rewrite-imports.js.map