import { Plugin } from "rollup";
export declare type ModuleProxyType = "cjs-proxy" | "esm-proxy";
export declare function moduleProxy(type: ModuleProxyType): Plugin;
