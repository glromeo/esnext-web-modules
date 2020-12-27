"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncTask = exports.toPosix = exports.parsePathname = exports.nodeModuleBareUrl = exports.relativePath = exports.isBare = void 0;
const path_1 = __importDefault(require("path"));
function isBare(url) {
    let cc = url.charAt(0);
    if (cc === "/")
        return false;
    if (cc === ".") {
        if (url.length === 1)
            return false;
        cc = url.charAt(1);
        if (cc === "/")
            return false;
        if (cc === ".") {
            if (url.length === 2)
                return false;
            cc = url.charAt(2);
            if (cc === "/")
                return false;
        }
    }
    return true;
}
exports.isBare = isBare;
function relativePath(module) {
    const index = module.lastIndexOf("/node_modules/");
    return index !== -1 ? module.substring(index + 14) : module;
}
exports.relativePath = relativePath;
const BACKSLASH_REGEXP = /\\/g;
exports.nodeModuleBareUrl = path_1.default.sep === "/"
    ? relativePath
    : function (filename) {
        return relativePath(filename.replace(BACKSLASH_REGEXP, "/"));
    };
function parsePathname(pathname) {
    let namespace = pathname.charAt(0) === "@";
    let separator = namespace ? pathname.indexOf("/", pathname.indexOf("/", 1) + 1) : pathname.indexOf("/", 0);
    let head = pathname.substring(0, separator);
    let tail = pathname.substring(separator + 1);
    return head ? [
        head,
        tail
    ] : separator === 0 ? [
        null,
        pathname
    ] : [
        tail,
        null
    ];
}
exports.parsePathname = parsePathname;
exports.toPosix = path_1.default.sep === "/"
    ? pathname => pathname
    : pathname => pathname.replace(/\\/g, "/");
function asyncTask(fn) {
    const tasks = {};
    return async function (id) {
        if (tasks[id] !== undefined) {
            return tasks[id];
        }
        else {
            tasks[id] = fn(id);
            const out = await tasks[id];
            delete tasks[id];
            return out;
        }
    };
}
exports.asyncTask = asyncTask;
//# sourceMappingURL=es-import-utils.js.map