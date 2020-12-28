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
    terser?: TerserOptions;
};
export declare function loadWebModulesConfig(): WebModulesConfig;
export declare type ImportResolver = (url: string, basedir?: string) => Promise<string>;
export declare function useWebModules(config?: WebModulesConfig): {
    importMap: {
        imports: {
            [x: string]: string;
        };
    };
    resolveImport: (url: string, basedir?: string | undefined) => Promise<string>;
    rollupWebModule: (pathname: string) => string | Promise<void> | undefined;
};
