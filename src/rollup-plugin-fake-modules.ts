import resolve, {Opts} from "resolve";
import {Plugin} from "rollup";

export type PluginFakeModulesOptions = {
    fakes?: { [module: string]: string }
    resolveOptions?: Opts
}

export function rollupPluginFakeModules({fakes = {}, resolveOptions}: PluginFakeModulesOptions): Plugin {

    const fakeModules = Object.keys(fakes).reduce(function (acc, module) {
        acc[resolve.sync(module, resolveOptions)] = fakes[module];
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
