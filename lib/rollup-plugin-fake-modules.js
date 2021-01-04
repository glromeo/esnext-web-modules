"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollupPluginFakeModules = void 0;
const resolve_1 = __importDefault(require("resolve"));
function rollupPluginFakeModules({ fakes = {}, resolveOptions }) {
    const fakeModules = Object.keys(fakes).reduce(function (acc, module) {
        acc[resolve_1.default.sync(module, resolveOptions)] = fakes[module];
        return acc;
    }, {});
    return {
        name: "rollup-plugin-fake-modules",
        resolveId(source, importer) {
            if (importer && fakeModules[source]) {
                return source;
            }
            return null;
        },
        load(id) {
            let dummy = fakeModules[id];
            if (dummy) {
                return dummy;
            }
            return null;
        }
    };
}
exports.rollupPluginFakeModules = rollupPluginFakeModules;
//# sourceMappingURL=rollup-plugin-fake-modules.js.map