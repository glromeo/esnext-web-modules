import {traverse} from "@babel/core";
import path from "path";
import log from "tiny-node-logger";
import {memoize} from "esnext-server-extras";
import {isBare} from "./es-import-utils";
import {useWebModules} from "./web-modules";

export const useWebModulesPlugin = memoize(config => {

    const {resolveImport} = useWebModules(config);

    function resolveBabelRuntime(importUrl) {
        if (importUrl.startsWith("@babel/")) return `/web_modules/${importUrl}.js`;
    }

    function rewriteImports({types}):any {

        let filename, imports, importMap;

        function rewriteImport(path, source) {

            const importUrl = source.node.value;
            const resolvedUrl = importMap.get(importUrl) || resolveBabelRuntime(importUrl) || importUrl;

            if (importUrl !== resolvedUrl) try {
                log.debug("resolved import:", `'${importUrl}'`, "as:", resolvedUrl);
                source.replaceWith(types.stringLiteral(resolvedUrl));
            } catch (error) {
                throwCodeFrameError(path, importUrl, error);
            }

            if (!isBare(resolvedUrl)) {
                imports.add(resolvedUrl);
                log.debug(filename, "collected link:", resolvedUrl);
            }
        }

        return {
            inherits: require("@babel/plugin-syntax-dynamic-import").default,
            pre(state) {
                filename = this.filename;
                importMap = this.opts.importMap;
                imports = new Set();
            },
            post(state) {
                this.file.metadata.imports = imports;
            },
            visitor: {
                "CallExpression"(path, state) {
                    const isImport = path.node.callee.type === "Import";
                    const isRequire = path.node.callee.name === "require";
                    if (isImport || isRequire) {
                        const [source] = path.get("arguments");
                        if (source.type === "StringLiteral") {
                            rewriteImport(path, source);
                        } else {
                            log.debug`source.type is not a StringLiteral at: ${path.toString()}, in: ${this.filename}`;
                        }
                    }
                },
                "ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration"(path, state) {
                    const source = path.get("source");
                    if (source.node !== null) {
                        rewriteImport(path, source);
                    }
                }
            } as any
        };
    }

    async function resolveImports(filename, parsedAst) {

        const dirname = path.dirname(filename);
        const importMap = new Map();

        traverse(parsedAst, {
            "CallExpression"(path:any, state) {
                const isImport = path.node.callee.type === "Import";
                const isRequire = path.node.callee.name === "require";
                if (isImport || isRequire) {
                    const [source] = path.get("arguments");
                    if (source.type === "StringLiteral") {
                        const importUrl = source.node.value;
                        const resolved = resolveImport(importUrl, dirname);
                        importMap.set(importUrl, resolved.catch(error => throwCodeFrameError(path, importUrl, error)));
                    }
                }
            },
            "ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration"(path, state) {
                const source = path.get("source");
                if (source.node !== null) {
                    const importUrl = source.node.value;
                    const resolved = resolveImport(importUrl, dirname);
                    importMap.set(importUrl, resolved.catch(error => throwCodeFrameError(path, importUrl, error)));
                }
            }
        } as any);

        for (const [key, value] of importMap.entries()) importMap.set(key, await value);

        return importMap;
    }

    function throwCodeFrameError(path, url, error) {
        if (path.hub) {
            throw path.buildCodeFrameError(`Could not rewrite '${url}'. ${error.message}`);
        } else {
            throw error;
        }
    }

    return {
        resolveImports,
        rewriteImports
    };

});
