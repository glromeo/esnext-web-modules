import {parse as parseEsm} from "es-module-lexer";
import * as path from "path";
import picomatch from "picomatch";
import resolve, {Opts} from "resolve";
import {OutputOptions, Plugin, RenderedChunk} from "rollup";
import {bareNodeModule, isBare, parsePathname} from "./es-import-utils";
import {ImportMap, ImportResolver} from "./web-modules";

export type PluginRewriteImportsOptions = {
    importMap: ImportMap
    resolveImport: ImportResolver
    entryModules: Set<string>
    resolveOptions: Opts
    external?: string | string[]
}

const REWRITE_IMPORT = "rollup-plugin-rewrite-imports";

export function rollupPluginRewriteImports(options: PluginRewriteImportsOptions): Plugin {
    const {importMap, resolveImport, entryModules, resolveOptions} = options;
    const isExternal = options.external ? picomatch(options.external) : test => false;
    return {
        name: "rollup-plugin-rewrite-imports",
        async resolveId(source, importer) {
            if (importer && source.charCodeAt(0) !== 0) {
                if (isBare(source)) {
                    if (isExternal(source)) {
                        let external = bareNodeModule(resolve.sync(source, resolveOptions));
                        return {id: source, external: true, meta: {[REWRITE_IMPORT]: `/node_modules/${external}`}};
                    }
                    let [module] = parsePathname(source);
                    if (module && entryModules.has(module) || entryModules.has(source)) {
                        return {id: source, external: true, meta: {[REWRITE_IMPORT]: await resolveImport(source)}};
                    }
                } else {
                    let absolute = path.resolve(path.dirname(importer), source);
                    let moduleBareUrl = bareNodeModule(absolute);
                    let resolved = importMap.imports[moduleBareUrl];
                    if (resolved) {
                        return {id: source, external: true, meta: {[REWRITE_IMPORT]: resolved}};
                    }
                }
            }
            return null;
        },
        renderChunk(code: string, chunk: RenderedChunk, options: OutputOptions) {
            let [imports] = parseEsm(code);
            let l = 0, rewritten: string = "";
            for (const {s, e} of imports) {
                let url = code.substring(s, e);
                let resolved = this.getModuleInfo(url)?.meta[REWRITE_IMPORT];
                if (resolved) {
                    rewritten += code.substring(l, s);
                    rewritten += resolved;
                } else {
                    rewritten += code.substring(l, e);
                }
                l = e;
            }
            return {code: rewritten + code.substring(l), map: null};
        }
    };
}
