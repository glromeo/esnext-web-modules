"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWebModules = exports.loadWebModulesConfig = void 0;
const rollup_1 = require("rollup");
const plugin_node_resolve_1 = require("@rollup/plugin-node-resolve");
const plugin_commonjs_1 = __importDefault(require("@rollup/plugin-commonjs"));
const plugin_json_1 = __importDefault(require("@rollup/plugin-json"));
const rollup_plugin_postcss_1 = __importDefault(require("rollup-plugin-postcss"));
const rollup_plugin_sourcemaps_1 = __importDefault(require("rollup-plugin-sourcemaps"));
const rollup_plugin_module_proxy_1 = require("./rollup-plugin-module-proxy");
const rollup_plugin_terser_1 = require("rollup-plugin-terser");
const fs = __importStar(require("fs"));
const tiny_node_logger_1 = __importDefault(require("tiny-node-logger"));
const chalk_1 = __importDefault(require("chalk"));
const resolve_1 = __importDefault(require("resolve"));
const config_1 = require("./config");
const path = __importStar(require("path"));
const fast_url_parser_1 = require("fast-url-parser");
const es_import_utils_1 = require("./es-import-utils");
const rollup_plugin_rewrite_imports_1 = require("./rollup-plugin-rewrite-imports");
const rollup_plugin_dummy_module_1 = require("./rollup-plugin-dummy-module");
function loadWebModulesConfig() {
    return require(resolve_1.default.sync("./web-modules.config.js", { basedir: process.cwd() }));
}
exports.loadWebModulesConfig = loadWebModulesConfig;
function useWebModules(config = loadWebModulesConfig()) {
    const outDir = path.resolve(config.rootDir, "web_modules");
    const importMap = readImportMap(outDir);
    async function resolveImport(url, basedir) {
        let { hostname, pathname, search } = fast_url_parser_1.parse(url);
        if (hostname !== null) {
            return url;
        }
        let resolved = importMap.imports[pathname];
        if (!resolved && es_import_utils_1.isBare(pathname)) {
            let [module, filename] = es_import_utils_1.parsePathname(pathname);
            if (module !== null) {
                resolved = importMap.imports[module];
                if (!resolved) {
                    await rollupWebModule(module);
                    resolved = importMap.imports[module];
                }
                if (filename !== null) {
                    resolved = resolved.slice(0, -3) + "/" + filename;
                }
            }
        }
        if (resolved.charAt(0) !== "/" && basedir) {
            resolved = path.posix.join(basedir, resolved);
        }
        /* everything must be a javascript module: .css -> .css.js, .json -> .json.js */
        const ext = path.extname(resolved).toLowerCase();
        if (ext !== ".js" && ext !== ".mjs") {
            resolved += ".js";
        }
        try {
            let { mtime } = fs.statSync(path.join(config.rootDir, resolved));
        }
        catch (e) {
            await rollupWebModule(resolved.substring(13));
        }
        if (search) {
            return resolved + "?" + search;
        }
        else {
            return resolved;
        }
    }
    const rollupPlugins = [
        rollup_plugin_dummy_module_1.dummyModule(config),
        rollup_plugin_rewrite_imports_1.rewriteImports({ imports: importMap.imports, resolver: resolveImport }),
        plugin_node_resolve_1.nodeResolve({
            rootDir: config.rootDir,
            moduleDirectories: config_1.getModuleDirectories(config)
        }),
        plugin_commonjs_1.default(),
        plugin_json_1.default(),
        rollup_plugin_postcss_1.default(),
        rollup_plugin_sourcemaps_1.default(),
        config.terser && rollup_plugin_terser_1.terser(config.terser),
        ...(config.plugins || [])
    ].filter(Boolean);
    const cjsModuleProxy = rollup_plugin_module_proxy_1.moduleProxy("cjs-proxy");
    const esmModuleProxy = rollup_plugin_module_proxy_1.moduleProxy("esm-proxy");
    const pending = new Map();
    const readManifest = (module, options) => new Promise((done, fail) => {
        resolve_1.default(module, options, (err, resolved, pkg) => {
            if (pkg) {
                done(pkg);
            }
            else {
                fail(err);
            }
        });
    });
    async function isEsModule(module) {
        var _a;
        const pkg = await readManifest(module, config.resolve);
        return pkg.module || pkg["jsnext:main"] || ((_a = pkg.main) === null || _a === void 0 ? void 0 : _a.endsWith(".mjs"));
    }
    function rollupWebModule(pathname) {
        if (importMap.imports[pathname]) {
            return importMap.imports[pathname];
        }
        if (!pending.has(pathname)) {
            let [module, filename] = es_import_utils_1.parsePathname(pathname);
            pending.set(pathname, task(module, filename)
                .catch(function (err) {
                return tiny_node_logger_1.default.error(err);
            })
                .finally(function () {
                pending.delete(pathname);
            }));
        }
        return pending.get(pathname);
        async function task(module, filename) {
            if (!importMap.imports[module] && filename) {
                await rollupWebModule(module);
            }
            const startTime = Date.now();
            const bundle = await rollup_1.rollup({
                input: pathname,
                plugins: filename ? rollupPlugins : [
                    await isEsModule(module) ? esmModuleProxy : cjsModuleProxy,
                    ...rollupPlugins
                ],
                external: config.external
            });
            try {
                await bundle.write({
                    file: `${outDir}/${filename ? pathname : module + ".js"}`,
                    sourcemap: !config.terser
                });
                if (!filename) {
                    updateImportMap(module, bundle);
                }
                writeImportMap(outDir, importMap);
            }
            finally {
                await bundle.close();
                const elapsed = Date.now() - startTime;
                //@ts-ignore
                tiny_node_logger_1.default.info `rolled up: ${chalk_1.default.magenta(pathname)} in: ${chalk_1.default.magenta(elapsed)}ms`;
            }
        }
    }
    function readImportMap(outDir) {
        try {
            return JSON.parse(fs.readFileSync(`${outDir}/import-map.json`, "utf-8"));
        }
        catch (e) {
            return { imports: {} };
        }
    }
    function writeImportMap(outDir, importMap) {
        fs.writeFileSync(`${outDir}/import-map.json`, JSON.stringify(importMap, null, "  "));
    }
    /**
     * Ideally ImportMap should be a trie in memory
     * bundle.watchFiles[0] is the synthetic proxy
     *
     * @param module
     * @param bundle
     */
    function updateImportMap(module, bundle) {
        let outputUrl = `/web_modules/${module}.js`;
        for (const file of bundle.watchFiles.slice(1)) {
            if (file.charCodeAt(0) !== 0 && !file.endsWith("?commonjs-proxy")) {
                let bare = es_import_utils_1.bareNodeModule(file);
                importMap.imports[bare] = outputUrl;
            }
        }
        importMap.imports[module] = outputUrl;
    }
    return {
        importMap,
        resolveImport,
        rollupWebModule
    };
}
exports.useWebModules = useWebModules;
//# sourceMappingURL=web-modules.js.map