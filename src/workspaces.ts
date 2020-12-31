import {glob} from "glob";
import path from "path";
import log from "tiny-node-logger";
import {toPosix} from "./es-import-utils";
import {ImportMap} from "./web-modules";

function readManifest(basedir: string, entries: [string, string][] = []) {
    try {
        let pkg = require(path.join(basedir, "package.json"));

        let main = pkg.module || pkg["jsnext:main"] || pkg.main;
        if (main) {
            entries.push([pkg.name, path.join(basedir, main)]);
        }

        if (pkg.workspaces) {
            log.info("loading workspaces from:", pkg.name);
            for (const workspace of pkg.workspaces) {
                let manifests = glob.sync(`${workspace}/package.json`, {
                    cwd: basedir,
                    nonull: true
                });
                for (const manifest of manifests) {
                    let dirname = path.dirname(path.join(basedir, manifest));
                    readManifest(dirname, entries);
                }
            }
        }

    } catch (ignored) {
        log.debug("no package.json found at:", basedir);
    }
    return entries;
}

export function readWorkspaces(rootDir: string): ImportMap {
    let map: { [name: string]: string } = {};
    let entries:[string, string][] = [];

    readManifest(rootDir, entries);

    for (const [name, pathname] of entries) {
        map[name] = path.posix.join("/workspaces", toPosix(path.relative(rootDir, pathname)));
    }

    return {imports: map};
}
