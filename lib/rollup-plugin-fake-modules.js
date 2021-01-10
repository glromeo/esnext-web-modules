"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollupPluginFakeModules = void 0;
const picomatch_1 = __importDefault(require("picomatch"));
function rollupPluginFakeModules({ fakes = {}, resolveOptions }) {
    const matchers = Object.keys(fakes).map((glob) => picomatch_1.default(glob));
    const fakeModules = Object.values(fakes);
    return {
        name: "rollup-plugin-fake-modules",
        resolveId(source, importer) {
            for (let i = 0; i < matchers.length; i++) {
                if (matchers[i](source)) {
                    return source;
                }
            }
            return null;
        },
        load(id) {
            for (let i = 0; i < matchers.length; i++) {
                if (matchers[i](id)) {
                    return fakeModules[i];
                }
            }
            return null;
        }
    };
}
exports.rollupPluginFakeModules = rollupPluginFakeModules;
//# sourceMappingURL=rollup-plugin-fake-modules.js.map