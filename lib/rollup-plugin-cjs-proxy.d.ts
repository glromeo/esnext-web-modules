import { Plugin } from "rollup";
export declare type PluginCjsProxyOptions = {
    entryModules: Set<string>;
};
export declare function rollupPluginCjsProxy({ entryModules }: PluginCjsProxyOptions): Plugin;
