import path from "path";
import log from "tiny-node-logger";
import {ImportMap} from "./web-modules";

export function readWorkspaces(rootDir:string):ImportMap {
    let {name, workspaces} = require(path.resolve(rootDir, "package.json"));
    log.info("loading workspaces from:", rootDir);
    return {imports:{}}
}