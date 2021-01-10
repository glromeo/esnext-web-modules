import { Opts } from "resolve";
import { RollupOptions } from "rollup";
import { Options as TerserOptions } from "rollup-plugin-terser";
export interface ImportMap {
    imports: {
        [packageName: string]: string;
    };
}
export declare type WebModulesOptions = {
    rootDir: string;
    clean?: boolean;
    environment: string;
    resolve: Opts;
    external: string | string[];
    terser?: TerserOptions;
    rollup?: RollupOptions;
};
export declare type ImportResolver = (url: string, basedir?: string) => Promise<string>;
export declare function defaultOptions(): WebModulesOptions;
export declare const useWebModules: (options?: WebModulesOptions) => {
    outDir: string;
    importMap: {
        imports: {
            [x: string]: string;
        };
    };
    resolveImport: (url: string, basedir?: string) => Promise<string>;
    rollupWebModule: (pathname: string) => Promise<void>;
};
