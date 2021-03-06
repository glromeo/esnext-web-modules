import { Opts } from "resolve";
import { Plugin } from "rollup";
export declare type PluginFakeModulesOptions = {
    fakes?: {
        [glob: string]: string;
    };
    resolveOptions?: Opts;
};
export declare function rollupPluginFakeModules({ fakes, resolveOptions }: PluginFakeModulesOptions): Plugin;
