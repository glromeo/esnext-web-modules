import { Plugin } from "rollup";
import { ImportResolver } from "./web-modules";
export declare type RewriteImportsOptions = {
    imports: {
        [key: string]: string;
    };
    resolver: ImportResolver;
};
export declare function rewriteImports({ imports: importMap, resolver: resolveImport }: RewriteImportsOptions): Plugin;
