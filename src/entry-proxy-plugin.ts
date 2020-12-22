import {Plugin} from "rollup";
import * as path from "path";

import {init as initCjs, parse as parseCjs} from "cjs-module-lexer";
import {init as parseEsmReady, parse as parseEsm} from "es-module-lexer";
import * as fs from "fs";

export type EntryProxyPluginOptions = {};

const parseCjsReady = initCjs();

function scanCjs(filename:string, collectedExports:Set<string>):void {
    let {
        exports,
        reexports
    } = parseCjs(fs.readFileSync(filename, "utf-8"));
    for (const e of exports) {
        collectedExports.add(e);
    }
    for (const re of reexports) {
        scanCjs(path.resolve(path.dirname(filename), re), collectedExports);
    }
}

function scanEsm(filename:string, collectedExports:Map<string, string[]>, encountered:Set<string>):void {
    let source = fs.readFileSync(filename, "utf-8");
    let [
        imports,
        exports
    ] = parseEsm(source);
    let filtered = Array.from(exports).filter(e => !encountered.has(e));
    for (const f of filtered) {
        encountered.add(f);
    }
    collectedExports.set(filename, filtered);
    for (const {e, s} of imports) {
        let imported = path.resolve(path.dirname(filename), source.substring(s, e));
        if (!collectedExports.has(imported)) {
            scanEsm(imported, collectedExports, encountered);
        }
    }
}

export function entryProxyPlugin(options: EntryProxyPluginOptions): Plugin {
    return {
        name: "import-proxy",
        async resolveId(source, importer) {
            if (!importer) {
                let resolution = await this.resolve(source, undefined, {skipSelf: true});
                if (resolution) {
                    if (resolution.id.endsWith(".mjs")) {
                        return `${resolution.id}?esm-proxy`;
                    }
                    if (resolution.id.endsWith(".cjs")) {
                        return `${resolution.id}?cjs-proxy`;
                    }
                    let dirname = path.dirname(resolution.id);
                    let pkg = require(dirname + "/package.json");
                    if (pkg.module || pkg["jsnext:main"]) {
                        return `${resolution.id}?esm-proxy`;
                    } else {
                        return `${resolution.id}?cjs-proxy`;
                    }
                } else {
                    return null;
                }
            }
            return null;
        },
        async load(id) {
            if (id.endsWith("?cjs-proxy")) {
                const importee = id.slice(0, -10).replace(/\\/g, "/");
                await parseCjsReady;
                const exports = new Set<string>();
                scanCjs(importee, exports);
                return `export {\n${Array.from(exports).join(",\n")}\n} from "${importee}";`;
            }
            if (id.endsWith("?esm-proxy")) {
                const importee = id.slice(0, -10).replace(/\\/g, "/");
                await parseEsmReady;
                const exports = new Map<string, string[]>();
                scanEsm(importee, exports, new Set());
                let proxy = "";
                for (const [filename, names] of Array.from(exports.entries())) {
                    proxy  += `export {\n${Array.from(names).join(",\n")}\n} from "${filename}";\n`;
                }
                return proxy;
            }
            return null;
        }
    };
}
