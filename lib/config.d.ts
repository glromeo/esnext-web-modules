import { Opts } from "resolve";
export declare type ESNextToolsConfig = {
    baseDir: string;
    rootDir: string;
    resolve: Opts;
};
export declare function getModuleDirectories(config: ESNextToolsConfig): string[] | undefined;
