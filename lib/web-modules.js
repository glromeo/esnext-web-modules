"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWebModules = exports.loadWebModulesConfig = void 0;
const plugin_commonjs_1 = __importDefault(require("@rollup/plugin-commonjs"));
const plugin_json_1 = __importDefault(require("@rollup/plugin-json"));
const plugin_node_resolve_1 = require("@rollup/plugin-node-resolve");
const chalk_1 = __importDefault(require("chalk"));
const fast_url_parser_1 = require("fast-url-parser");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const resolve_1 = __importDefault(require("resolve"));
const rollup_1 = require("rollup");
const rollup_plugin_postcss_1 = __importDefault(require("rollup-plugin-postcss"));
const rollup_plugin_sourcemaps_1 = __importDefault(require("rollup-plugin-sourcemaps"));
const rollup_plugin_terser_1 = require("rollup-plugin-terser");
const tiny_node_logger_1 = __importDefault(require("tiny-node-logger"));
const config_1 = require("./config");
const es_import_utils_1 = require("./es-import-utils");
const rollup_plugin_dummy_module_1 = require("./rollup-plugin-dummy-module");
const rollup_plugin_module_proxy_1 = require("./rollup-plugin-module-proxy");
const rollup_plugin_rewrite_imports_1 = require("./rollup-plugin-rewrite-imports");
const workspaces_1 = require("./workspaces");
function loadWebModulesConfig() {
    return require(resolve_1.default.sync("./web-modules.config.js", { basedir: process.cwd() }));
}
exports.loadWebModulesConfig = loadWebModulesConfig;
function useWebModules(config = loadWebModulesConfig()) {
    const outDir = path_1.default.resolve(config.rootDir, "web_modules");
    const importMap = {
        imports: {
            ...readImportMap(outDir).imports,
            ...workspaces_1.readWorkspaces(config.rootDir).imports
        }
    };
    async function resolveImport(url, basedir) {
        let { hostname, pathname, search } = fast_url_parser_1.parse(url);
        if (hostname !== null) {
            return url;
        }
        let resolved = importMap.imports[pathname];
        if (!resolved) {
            if (es_import_utils_1.isBare(pathname)) {
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
        }
        if (resolved.charAt(0) !== "/" && basedir) {
            resolved = path_1.default.posix.join(basedir, resolved);
        }
        /* everything must be a javascript module: .css -> .css.js, .json -> .json.js */
        const ext = path_1.default.extname(resolved).toLowerCase();
        if (ext !== ".js" && ext !== ".mjs") {
            resolved += ".js";
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
                tiny_node_logger_1.default.error(err.message);
                throw err;
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
            let importMap = JSON.parse(fs_1.default.readFileSync(`${outDir}/import-map.json`, "utf-8"));
            for (const [key, pathname] of Object.entries(importMap.imports))
                try {
                    let { mtime } = fs_1.default.statSync(path_1.default.join(config.rootDir, String(pathname)));
                    tiny_node_logger_1.default.info("import:", key, pathname, mtime.toISOString());
                }
                catch (e) {
                    tiny_node_logger_1.default.warn("import:", key, "was stale");
                    delete importMap[key];
                }
            return importMap;
        }
        catch (e) {
            return { imports: {} };
        }
    }
    function writeImportMap(outDir, importMap) {
        fs_1.default.writeFileSync(`${outDir}/import-map.json`, JSON.stringify(importMap, null, "  "));
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