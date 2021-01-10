import { Plugin } from "rollup";
import { PackageMeta } from "./web-modules";
export declare type PluginEsmProxyOptions = {
    manifest: PackageMeta;
    entryModules: Set<string>;
};
export declare function rollupPluginEntryProxy({ manifest, entryModules }: PluginEsmProxyOptions): Plugin;
