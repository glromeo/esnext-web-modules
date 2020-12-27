import {Plugin} from "rollup";
import resolve from "resolve";
import {ESNextToolsConfig} from "./config";

export type DummyModuleOptions = ESNextToolsConfig & {
    dummies?: { [module: string]: string }
}

export function dummyModule({dummies = {}, resolve: options}: DummyModuleOptions): Plugin {
    dummies = Object.keys(dummies).reduce(function (acc, module) {
        acc[resolve.sync(module, options)] = dummies[module];
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
