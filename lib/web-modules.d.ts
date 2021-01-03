import { RollupOptions } from "rollup";
import { Options as TerserOptions } from "rollup-plugin-terser";
import { ESNextToolsConfig } from "./config";
import { DummyModuleOptions } from "./rollup-plugin-dummy-module";
export interface ImportMap {
    imports: {
        [packageName: string]: string;
    };
}
export declare type WebModulesConfig = ESNextToolsConfig & RollupOptions & DummyModuleOptions & {
    clean?: boolean;
    squash?: string | string[];
    terser?: TerserOptions;
};
export declare function loadWebModulesConfig(): WebModulesConfig;
export declare type ImportResolver = (url: string, basedir?: string) => Promise<string>;
/**
 *   __        __   _       __  __           _       _
 *   \ \      / /__| |__   |  \/  | ___   __| |_   _| | ___  ___
 *    \ \ /\ / / _ \ '_ \  | |\/| |/ _ \ / _` | | | | |/ _ \/ __|
 *     \ V  V /  __/ |_) | | |  | | (_) | (_| | |_| | |  __/\__ \
 *      \_/\_/ \___|_.__/  |_|  |_|\___/ \__,_|\__,_|_|\___||___/
 *
 * @param config
 */
export declare function useWebModules(config?: WebModulesConfig): {
    outDir: string;
    importMap: {
        imports: {
            [x: string]: string;
        };
    };
    resolveImport: (url: string, basedir?: string | undefined) => Promise<string>;
    rollupWebModule: (pathname: string) => Promise<void>;
};
