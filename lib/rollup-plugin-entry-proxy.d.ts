import { Plugin } from "rollup";
export declare type ModuleProxyType = "cjs-proxy" | "esm-proxy";
export declare function rollupPluginEntryProxy(type: ModuleProxyType): Plugin;
