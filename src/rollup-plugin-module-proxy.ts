import {Plugin} from "rollup";
import * as path from "path";

import {init as initCjs, parse as parseCjs} from "cjs-module-lexer";
import {init as parseEsmReady, parse as parseEsm} from "es-module-lexer";
import * as fs from "fs";
import {ImportResolver} from "./web-modules";
import {isBare} from "./es-import-utils";
import log from "tiny-node-logger";

const parseCjsReady = initCjs();

function scanCjs(filename: string, collectedExports: Set<string>): void {
    let source = fs.readFileSync(filename, "utf-8");
    let {
        exports,
        reexports
    } = parseCjs(source);
    for (const e of exports) if (e !== "__esModule") {
        collectedExports.add(e);
    }
    for (const re of reexports) {
        scanCjs(path.resolve(path.dirname(filename), re), collectedExports);
    }
}

function scanEsm(filename: string, collected: Map<string, string[]>, encountered: Set<string>): void {
    let source = fs.readFileSync(filename, "utf-8");
    let [
        imports,
        exports
    ] = parseEsm(source);
    let filtered = Array.from(exports).filter(e => !encountered.has(e));
    for (const f of filtered) {
        encountered.add(f);
    }
    collected.set(filename, filtered);
    for (const {s, e} of imports) {
        let imported = path.resolve(path.dirname(filename), source.substring(s, e));
        if (!collected.has(imported)) {
            scanEsm(imported, collected, encountered);
        }
    }
}

export type ModuleProxyType = "cjs-proxy" | "esm-proxy";

export function moduleProxy(type: ModuleProxyType, resolveImport: ImportResolver): Plugin {
    return {
        name: "module-proxy",
        async buildStart() {
            await parseCjsReady;
            await parseEsmReady;
        },
        async resolveId(source, importer) {
            if (!importer) {
                let resolution = await this.resolve(source, undefined, {skipSelf: true});
                if (resolution) {
                    return `${resolution.id}?${type}`;
                }
            } else {
                if (source.charCodeAt(0) !== 0 && isBare(source)) {
                    let resolved = await resolveImport(source);
                    log.info("bare module:", source, resolved);
                    return false;
                }
            }
            return null;
        },
        load(id) {
            if (id.endsWith("?cjs-proxy")) {
                const imported = id.slice(0, -10);
                const exports = new Set<string>();
                scanCjs(imported, exports);
                return `export {\n${Array.from(exports).join(",\n")}\n} from "${imported.replace(/\\/g, "/")}";\n`;
            }
            if (id.endsWith("?esm-proxy")) {
                const imported = id.slice(0, -10);
                const exports = new Map<string, string[]>();
                scanEsm(imported, exports, new Set());
                let proxy = "";
                for (const [filename, names] of Array.from(exports.entries())) {
                    proxy += `export {\n${Array.from(names).join(",\n")}\n} from "${filename.replace(/\\/g, "/")}";\n`;
                }
                return proxy;
            }
            return null;
        }
    };
}
