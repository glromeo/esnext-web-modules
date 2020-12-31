import picomatch from "picomatch";
import {OutputOptions, Plugin, RenderedChunk} from "rollup";
import {parse as parseEsm} from "es-module-lexer";
import log from "tiny-node-logger";
import {ImportMap, ImportResolver} from "./web-modules";
import {bareNodeModule, isBare} from "./es-import-utils";
import * as path from "path";

export type RewriteImportsOptions = {
    importMap: ImportMap
    resolver: ImportResolver
    squash: (test: string) => boolean
}

const RESOLVED_IMPORT = "rewrite-imports:resolved_import";

export function rewriteImports({importMap, resolver: resolveImport, squash}: RewriteImportsOptions): Plugin {
    return {
        name: "rewrite-imports",
        async resolveId(source, importer) {
            if (importer && source.charCodeAt(0) !== 0) {
                if (isBare(source)) {
                    if (squash(source)) {
                        return null;
                    }
                    let resolved = await resolveImport(source);
                    return {id:source, external: true, meta: {[RESOLVED_IMPORT]: resolved}};
                } else {
                    let absolute = path.resolve(path.dirname(importer), source);
                    let moduleBareUrl = bareNodeModule(absolute);
                    let resolved = importMap.imports[moduleBareUrl];
                    if (resolved) {
                        return {id:source, external: true, meta: {[RESOLVED_IMPORT]: resolved}};
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
                let resolved = this.getModuleInfo(url)?.meta[RESOLVED_IMPORT];
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
