import path from "path";

export function isBare(url: string): boolean {
    let cc = url.charAt(0);
    if (cc === "/") return false;
    if (cc === ".") {
        if (url.length === 1) return false;
        cc = url.charAt(1);
        if (cc === "/") return false;
        if (cc === ".") {
            if (url.length === 2) return false;
            cc = url.charAt(2);
            if (cc === "/") return false;
        }
    }
    if (url.charAt(1) === ":") {
        let s = url.charAt(2);
        if (s === "/" || s === "\\") return false;
    }
    return true;
}

function modulePathname(pathname: string): string {
    const index = pathname.lastIndexOf("/node_modules/");
    return index !== -1 ? pathname.substring(index + 14) : pathname;
}

const BACKSLASH_REGEXP = /\\/g;

export const bareNodeModule = path.sep === "/"
    ? modulePathname
    : function (filename: string): string {
        return modulePathname(filename.replace(BACKSLASH_REGEXP, "/"));
    };


export function parsePathname(pathname: string): [string | null, string | null] {
    let namespace = pathname.charAt(0) === "@";
    let separator = namespace ? pathname.indexOf("/", pathname.indexOf("/", 1) + 1) : pathname.indexOf("/", 0);
    if (separator === -1) return [
        pathname,
        null
    ];
    if (separator > 2 || /^\w\w/.test(pathname)) return [
        pathname.substring(0, separator),
        pathname.substring(separator + 1)
    ];
    return [
        null,
        pathname
    ];
}

export const toPosix = path.sep === "/"
    ? pathname => pathname
    : pathname => pathname.replace(/\\/g, "/");
