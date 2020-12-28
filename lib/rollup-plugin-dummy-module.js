"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dummyModule = void 0;
const resolve_1 = __importDefault(require("resolve"));
function dummyModule({ dummies = {}, resolve: options }) {
    dummies = Object.keys(dummies).reduce(function (acc, module) {
        acc[resolve_1.default.sync(module, options)] = dummies[module];
        return acc;
    }, {});
    return {
        name: "dummy-modules",
        async resolveId(source, importer) {
            if (importer && dummies[source]) {
                return source;
            }
            return null;
        },
        load(id) {
            let dummy = dummies[id];
            if (dummy) {
                return dummy;
            }
            return null;
        }
    };
}
exports.dummyModule = dummyModule;
//# sourceMappingURL=rollup-plugin-dummy-module.js.map