import { Plugin } from "rollup";
import { ESNextToolsConfig } from "./config";
export declare type DummyModuleOptions = ESNextToolsConfig & {
    dummies?: {
        [module: string]: string;
    };
};
export declare function dummyModule({ dummies, resolve: { paths } }: DummyModuleOptions): Plugin;
