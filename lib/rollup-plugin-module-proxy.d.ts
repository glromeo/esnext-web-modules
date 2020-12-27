import { Plugin } from "rollup";
import { ImportResolver } from "./esnext-bundler";
export declare type ModuleProxyType = "cjs-proxy" | "esm-proxy";
export declare type ModuleProxyOptions = {};
export declare function moduleProxy(type: ModuleProxyType, resolveImport: ImportResolver): Plugin;
