import { Plugin } from "rollup";
import { ImportMap, ImportResolver } from "./web-modules";
export declare type PluginRewriteImportsOptions = {
    importMap: ImportMap;
    resolveImport: ImportResolver;
    squash: (test: string) => boolean;
};
export declare function rollupPluginRewriteImports({ importMap, resolveImport, squash }: PluginRewriteImportsOptions): Plugin;
