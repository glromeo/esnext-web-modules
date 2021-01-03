"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWebModulesPlugin = void 0;
const core_1 = require("@babel/core");
const path_1 = __importDefault(require("path"));
const tiny_node_logger_1 = __importDefault(require("tiny-node-logger"));
const esnext_server_extras_1 = require("esnext-server-extras");
const es_import_utils_1 = require("./es-import-utils");
const web_modules_1 = require("./web-modules");
exports.useWebModulesPlugin = esnext_server_extras_1.memoize(config => {
    const { resolveImport } = web_modules_1.useWebModules(config);
    function resolveBabelRuntime(importUrl) {
        if (importUrl.startsWith("@babel/"))
            return `/web_modules/${importUrl}.js`;
    }
    function rewriteImports({ types }) {
        let filename, imports, importMap;
        function rewriteImport(path, source) {
            const importUrl = source.node.value;
            const resolvedUrl = importMap.get(importUrl) || resolveBabelRuntime(importUrl) || importUrl;
            if (importUrl !== resolvedUrl)
                try {
                    tiny_node_logger_1.default.debug("resolved import:", `'${importUrl}'`, "as:", resolvedUrl);
                    source.replaceWith(types.stringLiteral(resolvedUrl));
                }
                catch (error) {
                    throwCodeFrameError(path, importUrl, error);
                }
            if (!es_import_utils_1.isBare(resolvedUrl)) {
                imports.add(resolvedUrl);
                tiny_node_logger_1.default.debug(filename, "collected link:", resolvedUrl);
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
                        }
                        else {
                            tiny_node_logger_1.default.debug `source.type is not a StringLiteral at: ${path.toString()}, in: ${this.filename}`;
                        }
                    }
                },
                "ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration"(path, state) {
                    const source = path.get("source");
                    if (source.node !== null) {
                        rewriteImport(path, source);
                    }
                }
            }
        };
    }
    async function resolveImports(filename, parsedAst) {
        const dirname = path_1.default.dirname(filename);
        const importMap = new Map();
        core_1.traverse(parsedAst, {
            "CallExpression"(path, state) {
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
        });
        for (const [key, value] of importMap.entries())
            importMap.set(key, await value);
        return importMap;
    }
    function throwCodeFrameError(path, url, error) {
        if (path.hub) {
            throw path.buildCodeFrameError(`Could not rewrite '${url}'. ${error.message}`);
        }
        else {
            throw error;
        }
    }
    return {
        resolveImports,
        rewriteImports
    };
});
//# sourceMappingURL=babel-plugin-web-modules.js.map