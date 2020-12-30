import {Plugin} from "rollup";
import {ESNextToolsConfig} from "./config";

export type DummyModuleOptions = ESNextToolsConfig & {
    dummies?: { [module: string]: string }
}

export function dummyModule({dummies = {}, resolve: {paths}}: DummyModuleOptions): Plugin {
    dummies = Object.keys(dummies).reduce(function (acc, module) {
        acc[require.resolve(module, {paths})] = dummies[module];
        return acc;
    }, {})
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
