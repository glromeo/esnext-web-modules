import { Options as TerserOptions } from "rollup-plugin-terser";
import { ESNextToolsConfig } from "./config";
export interface ImportMap {
    imports: {
        [packageName: string]: string;
    };
}
export declare type WebModulesConfig = ESNextToolsConfig & {
    terser?: TerserOptions;
};
export declare let importMap: {
    imports: {};
};
export declare type ImportResolver = (url: string, basedir?: string) => Promise<string>;
export declare function useWebModules(config: WebModulesConfig): {
    resolveImport: ImportResolver;
    rollupWebModule: (module: string, write?: boolean) => any;
};
