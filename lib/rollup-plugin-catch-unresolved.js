"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollupPluginCatchUnresolved = void 0;
const is_builtin_module_1 = __importDefault(require("is-builtin-module"));
function rollupPluginCatchUnresolved() {
    return {
        name: "rollup-plugin-catch-unresolved",
        resolveId(id, importer) {
            if (id.startsWith("http://") || id.startsWith("https://")) {
                return false;
            }
            if (is_builtin_module_1.default(id)) {
                this.warn({
                    id: importer,
                    message: `Module "${id}" (Node.js built-in) is not available in the browser.`
                });
            }
            else {
                this.warn({
                    id: importer,
                    message: `Module "${id}" could not be resolved ...is it installed?`
                });
            }
            return false;
        }
    };
}
exports.rollupPluginCatchUnresolved = rollupPluginCatchUnresolved;
//# sourceMappingURL=rollup-plugin-catch-unresolved.js.map