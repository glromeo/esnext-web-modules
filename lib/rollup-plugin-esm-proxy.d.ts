import { Plugin } from "rollup";
export declare type PluginEsmProxyOptions = {
    entryModules: Set<string>;
};
export declare function rollupPluginEsmProxy({ entryModules }: PluginEsmProxyOptions): Plugin;
