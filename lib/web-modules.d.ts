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
    resolve: Opts;
    fakes?: {
        [module: string]: string;
    };
    squash?: string | string[];
    terser?: TerserOptions;
    rollup?: RollupOptions;
};
export declare type ImportResolver = (url: string, basedir?: string) => Promise<string>;
export declare function defaultOptions(): WebModulesOptions;
/**
 *   __        __   _       __  __           _       _
 *   \ \      / /__| |__   |  \/  | ___   __| |_   _| | ___  ___
 *    \ \ /\ / / _ \ '_ \  | |\/| |/ _ \ / _` | | | | |/ _ \/ __|
 *     \ V  V /  __/ |_) | | |  | | (_) | (_| | |_| | |  __/\__ \
 *      \_/\_/ \___|_.__/  |_|  |_|\___/ \__,_|\__,_|_|\___||___/
 *
 * @param config
 */
export declare const useWebModules: (options?: WebModulesOptions) => {
    outDir: string;
    importMap: {
        imports: {
            [x: string]: string;
        };
    };
    resolveImport: (url: string, basedir?: string | undefined) => Promise<string>;
    rollupWebModule: (pathname: string) => Promise<void>;
};
