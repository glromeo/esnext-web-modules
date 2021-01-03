import {init as initCjs, parse as parseCjs} from "cjs-module-lexer";
import {init as parseEsmReady, parse as parseEsm} from "es-module-lexer";
import * as fs from "fs";
import * as path from "path";
import {Plugin} from "rollup";
import {isBare, toPosix} from "./es-import-utils";

const parseCjsReady = initCjs();

function scanCjs(filename: string, collectedExports: Set<string>): void {
    let dirname = path.dirname(filename);
    let source = fs.readFileSync(filename, "utf-8");
    let {
        exports,
        reexports
    } = parseCjs(source);
    for (const e of exports) if (e !== "__esModule") {
        collectedExports.add(e);
    }
    for (const required of reexports) {
        if (!isBare(required)) {
            scanCjs(path.resolve(dirname, required), collectedExports);
        }
    }
}

function scanEsm(filename: string, collected: Map<string, string[]>, encountered: Set<string>): void {
    let dirname = path.dirname(filename);
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
        let imported = source.substring(s, e);
        if (!isBare(imported) && path.extname(imported)) {
            let resolved = path.resolve(dirname, imported);
            if (!collected.has(resolved)) {
                scanEsm(resolved, collected, encountered);
            }
        }
    }
}

export type ModuleProxyType = "cjs-proxy" | "esm-proxy";

export function rollupPluginEntryProxy(type: ModuleProxyType): Plugin {
    return {
        name: "rollup-plugin-entry-proxy",
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
            }
            return null;
        },
        load(id) {
            if (id.endsWith("?cjs-proxy")) {
                const imported = id.slice(0, -10);
                const exports = new Set<string>();
                scanCjs(imported, exports);
                let proxy = `import __d__ from "${toPosix(imported)}";\nexport default __d__;\n`;
                if (exports.size > 0) {
                    proxy += `export {\n${Array.from(exports).join(",\n")}\n} from "${toPosix(imported)}";\n`;
                }
                return proxy;
            }
            if (id.endsWith("?esm-proxy")) {
                const imported = id.slice(0, -10);
                const exports = new Map<string, string[]>();
                scanEsm(imported, exports, new Set());
                let proxy = "";
                for (const [imported, names] of Array.from(exports.entries())) {
                    proxy += `export {\n${Array.from(names).join(",\n")}\n} from "${toPosix(imported)}";\n`;
                }
                return proxy;
            }
            return null;
        }
    };
}