"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readWorkspaces = void 0;
const glob_1 = require("glob");
const path_1 = __importDefault(require("path"));
const tiny_node_logger_1 = __importDefault(require("tiny-node-logger"));
const es_import_utils_1 = require("./es-import-utils");
function readManifest(basedir, entries) {
    try {
        let pkg = require(path_1.default.join(basedir, "package.json"));
        let main = pkg.module || pkg["jsnext:main"] || pkg.main;
        if (main) {
            entries.push([pkg.name, path_1.default.join(basedir, main)]);
        }
        else {
            entries.push([pkg.name, basedir]);
        }
        if (pkg.workspaces) {
            tiny_node_logger_1.default.info("loading workspaces from:", pkg.name);
            for (const workspace of pkg.workspaces) {
                let manifests = glob_1.glob.sync(`${workspace}/package.json`, {
                    cwd: basedir,
                    nonull: true
                });
                for (const manifest of manifests) {
                    let dirname = path_1.default.dirname(path_1.default.join(basedir, manifest));
                    readManifest(dirname, entries);
                }
            }
        }
    }
    catch (ignored) {
        tiny_node_logger_1.default.debug("no package.json found at:", basedir);
    }
    return entries;
}
function readWorkspaces(rootDir) {
    let map = {};
    let entries = [];
    readManifest(rootDir, entries);
    for (const [name, pathname] of entries) {
        map[name] = path_1.default.posix.join("/workspaces", es_import_utils_1.toPosix(path_1.default.relative(rootDir, pathname)));
    }
    return { imports: map };
}
exports.readWorkspaces = readWorkspaces;
//# sourceMappingURL=workspaces.js.map