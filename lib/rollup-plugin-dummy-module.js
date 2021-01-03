"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollupPluginDummyModule = void 0;
function rollupPluginDummyModule({ dummies = {}, resolve: { paths } }) {
    dummies = Object.keys(dummies).reduce(function (acc, module) {
        acc[require.resolve(module, { paths })] = dummies[module];
        return acc;
    }, {});
    return {
        name: "rollup-plugin-dummy-modules",
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
exports.rollupPluginDummyModule = rollupPluginDummyModule;
//# sourceMappingURL=rollup-plugin-dummy-module.js.map