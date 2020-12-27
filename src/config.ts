import {Opts} from "resolve";

export type ESNextToolsConfig = {
    baseDir: string;
    rootDir: string;
    resolve: Opts;
}

export function getModuleDirectories(config: ESNextToolsConfig): string[] | undefined {
    const moduleDirectory = config.resolve.moduleDirectory;
    return typeof moduleDirectory === "string" ? [moduleDirectory] : moduleDirectory as any;
}