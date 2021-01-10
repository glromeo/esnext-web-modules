import { Opts } from "resolve";
import { Plugin } from "rollup";
import { ImportMap, ImportResolver } from "./web-modules";
export declare type PluginRewriteImportsOptions = {
    importMap: ImportMap;
    resolveImport: ImportResolver;
    entryModules: Set<string>;
    resolveOptions: Opts;
    external?: string | string[];
};
export declare function rollupPluginRewriteImports(options: PluginRewriteImportsOptions): Plugin;
