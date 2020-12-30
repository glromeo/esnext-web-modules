import { Plugin } from "rollup";
import { ImportMap, ImportResolver } from "./web-modules";
export declare type RewriteImportsOptions = {
    importMap: ImportMap;
    resolver: ImportResolver;
    squash: (test: string) => boolean;
};
export declare function rewriteImports({ importMap, resolver: resolveImport, squash }: RewriteImportsOptions): Plugin;
