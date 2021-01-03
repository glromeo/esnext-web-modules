import {parse as parseEsm} from "es-module-lexer";
import * as path from "path";
import {OutputOptions, Plugin, RenderedChunk} from "rollup";
import {bareNodeModule, isBare} from "./es-import-utils";
import {ImportMap, ImportResolver} from "./web-modules";

export type RewriteImportsOptions = {
    importMap: ImportMap
    resolver: ImportResolver
    squash: (test: string) => boolean
}

const REWRITE_IMPORT = "rollup-plugin-rewrite-imports";

export function rollupPluginRewriteImports({importMap, resolver: resolveImport, squash}: RewriteImportsOptions): Plugin {
    return {
        name: "rollup-plugin-rewrite-imports",
        async resolveId(source, importer) {
            if (importer && source.charCodeAt(0) !== 0) {
                if (isBare(source)) {
                    if (squash(source)) {
                        return null;
                    }
                    return {id:source, external: true, meta: {[REWRITE_IMPORT]: await resolveImport(source)}};
                } else {
                    let absolute = path.resolve(path.dirname(importer), source);
                    let moduleBareUrl = bareNodeModule(absolute);
                    let resolved = importMap.imports[moduleBareUrl];
                    if (resolved) {
                        return {id:source, external: true, meta: {[REWRITE_IMPORT]: resolved}};
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
