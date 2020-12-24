import {Plugin} from "rollup";
import * as path from "path";

import {init as initCjs, parse as parseCjs} from "cjs-module-lexer";
import {init as parseEsmReady, parse as parseEsm} from "es-module-lexer";
import * as fs from "fs";
import resolve from "resolve";
import {bundleWebModule, importMap, WebModuleBundlerOptions} from "./esnext-bundler";

export type ModuleProxyPluginOptions = WebModuleBundlerOptions & {};

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

function rewriteImports(code: string, importMap: { imports: {} }) {
    let [imports] = parseEsm(code);
    let i = 0, rewritten: string = "";
    for (const {s, e} of imports) {
        rewritten += code.substring(i, s);
        rewritten += importMap.imports[code.substring(s, e)]
        i = e;
    }
    return rewritten + code.substring(i);
}

export function moduleProxy(options: ModuleProxyPluginOptions): Plugin {
    return {
        name: "module-proxy",
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
                    let pkg = require(resolve.sync(`${source}/package.json`, {basedir: path.dirname(resolution.id)}));
                    if (pkg.module || pkg["jsnext:main"]) {
                        return `${resolution.id}?esm-proxy`;
                    } else {
                        return `${resolution.id}?cjs-proxy`;
                    }
                }
                return null;
            }
            if (source.charCodeAt(0) !== 0 && !/^\.{0,2}\//.test(source)) {
                try {
                    await bundleWebModule(source, options);
                } catch (e) {
                    console.error(e);
                }
                return false;
            }
            return null;
        },
        async load(id) {
            if (id.endsWith("?cjs-proxy")) {
                const imported = id.slice(0, -10);
                await parseCjsReady;
                const exports = new Set<string>();
                scanCjs(imported, exports);
                return `export {\n${Array.from(exports).join(",\n")}\n} from "${imported.replace(/\\/g, "/")}";\n`;
            }
            if (id.endsWith("?esm-proxy")) {
                const imported = id.slice(0, -10);
                await parseEsmReady;
                const exports = new Map<string, string[]>();
                scanEsm(imported, exports, new Set());
                let proxy = "";
                for (const [filename, names] of Array.from(exports.entries())) {
                    proxy += `export {\n${Array.from(names).join(",\n")}\n} from "${filename.replace(/\\/g, "/")}";\n`;
                }
                return proxy;
            }
            return null;
        },
        renderChunk(code) {
            return {code: rewriteImports(code, importMap), map: null};
        }
    };
}
