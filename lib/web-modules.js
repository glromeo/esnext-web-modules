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
const plugin_commonjs_1 = __importDefault(require("@rollup/plugin-commonjs"));
const plugin_json_1 = __importDefault(require("@rollup/plugin-json"));
const plugin_node_resolve_1 = require("@rollup/plugin-node-resolve");
const chalk_1 = __importDefault(require("chalk"));
const fast_url_parser_1 = require("fast-url-parser");
const fs = __importStar(require("fs"));
const fs_1 = require("fs");
const path_1 = __importStar(require("path"));
const picomatch_1 = __importDefault(require("picomatch"));
const resolve_1 = __importDefault(require("resolve"));
const rollup_1 = require("rollup");
const rollup_plugin_sourcemaps_1 = __importDefault(require("rollup-plugin-sourcemaps"));
const rollup_plugin_terser_1 = require("rollup-plugin-terser");
const tiny_node_logger_1 = __importDefault(require("tiny-node-logger"));
const es_import_utils_1 = require("./es-import-utils");
const rollup_plugin_dummy_module_1 = require("./rollup-plugin-dummy-module");
const rollup_plugin_module_proxy_1 = require("./rollup-plugin-module-proxy");
const rollup_plugin_rewrite_imports_1 = require("./rollup-plugin-rewrite-imports");
const workspaces_1 = require("./workspaces");
function loadWebModulesConfig() {
    return require(require.resolve("./web-modules.config.js"));
}
exports.loadWebModulesConfig = loadWebModulesConfig;
function useWebModules(config = loadWebModulesConfig()) {
    const outDir = path_1.default.join(config.rootDir, "web_modules");
    if (config.clean) {
        fs_1.rmdirSync(outDir, { recursive: true });
        tiny_node_logger_1.default.info("cleaned web_modules directory");
    }
    fs_1.mkdirSync(outDir, { recursive: true });
    if (!config.resolve) {
        config.resolve = {
            paths: [path_1.default.join(config.rootDir, "node_modules")]
        };
    }
    if (!config.squash) {
        config.squash = ["@babel/runtime/**"];
    }
    const squash = config.squash ? picomatch_1.default(config.squash) : test => false;
    const importMap = {
        imports: {
            ...readImportMap(outDir).imports,
            ...workspaces_1.readWorkspaces(config.rootDir).imports
        },
        __clear__() {
            this.imports = {};
        }
    };
    function readImportMap(outDir) {
        try {
            let importMap = JSON.parse(fs_1.readFileSync(`${outDir}/import-map.json`, "utf-8"));
            for (const [key, pathname] of Object.entries(importMap.imports))
                try {
                    let { mtime } = fs_1.statSync(path_1.default.join(config.rootDir, String(pathname)));
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
        return fs.promises.writeFile(`${outDir}/import-map.json`, JSON.stringify(importMap, null, "  "));
    }
    /**
     * bundle.watchFiles[0] is the synthetic proxy
     *
     * TODO: To implement squash properly I need to use the imported/required files list
     * that can be collected by the proxy plugin instead of the
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
    function resolveModuleType(ext, basedir) {
        return "module";
    }
    async function resolveImport(url, basedir) {
        let { hostname, pathname, search } = fast_url_parser_1.parse(url);
        if (hostname !== null) {
            return url;
        }
        let resolved = importMap.imports[pathname];
        if (!resolved) {
            let [module, filename] = es_import_utils_1.parsePathname(pathname);
            if (module !== null && !importMap.imports[module]) {
                await rollupWebModule(module);
                resolved = importMap.imports[module];
            }
            if (filename) {
                let ext = path_1.posix.extname(filename);
                if (!ext) {
                    ext = ".js";
                    filename += ext;
                }
                if (ext !== ".js" && ext !== ".mjs") {
                    let type = resolveModuleType(ext, basedir);
                    search = search ? `type=${type}&${search.substring(1)}` : `type=${type}`;
                    if (module) {
                        resolved = `/node_modules/${module}/${filename}`;
                    }
                    else {
                        resolved = filename;
                    }
                }
                else {
                    if (module) {
                        let bundled = importMap.imports[path_1.posix.join(module, filename)];
                        if (bundled) {
                            resolved = bundled;
                        }
                        else {
                            resolved = `/web_modules/${module}/${filename}`;
                        }
                    }
                    else {
                        resolved = filename;
                    }
                }
            }
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
        rollup_plugin_rewrite_imports_1.rewriteImports({ importMap, resolver: resolveImport, squash }),
        plugin_node_resolve_1.nodeResolve({
            rootDir: config.rootDir,
            moduleDirectories: config.resolve.paths
        }),
        plugin_commonjs_1.default(),
        plugin_json_1.default(),
        rollup_plugin_sourcemaps_1.default(),
        config.terser && rollup_plugin_terser_1.terser(config.terser),
        ...(config.plugins || [])
    ].filter(Boolean);
    const cjsModuleProxy = rollup_plugin_module_proxy_1.moduleProxy("cjs-proxy");
    const esmModuleProxy = rollup_plugin_module_proxy_1.moduleProxy("esm-proxy");
    function taskPlugins(pkg, filename) {
        var _a;
        if (filename) {
            if (squash(pkg.name)) {
                return [esmModuleProxy, ...rollupPlugins];
            }
        }
        else {
            if (squash(pkg.name)) {
                return rollupPlugins.slice(2);
            }
            if (pkg.module || pkg["jsnext:main"] || ((_a = pkg.main) === null || _a === void 0 ? void 0 : _a.endsWith(".mjs"))) {
                return [esmModuleProxy, ...rollupPlugins];
            }
            else {
                return [cjsModuleProxy, ...rollupPlugins];
            }
        }
        return rollupPlugins;
    }
    const pending = new Map();
    const resolveOptions = { basedir: config.rootDir, moduleDirectory: config.resolve.paths };
    function requireManifest(module) {
        return new Promise(function (done, fail) {
            resolve_1.default(`${module}/package.json`, resolveOptions, function (err, resolved, pkg) {
                if (pkg) {
                    done(pkg);
                }
                else {
                    fail(err);
                }
            });
        });
    }
    async function rollupWebModule(pathname) {
        if (importMap.imports[pathname]) {
            return;
        }
        if (!pending.has(pathname)) {
            let [module, filename] = es_import_utils_1.parsePathname(pathname);
            pending.set(pathname, rollupWebModuleTask(module, filename)
                .finally(function () {
                pending.delete(pathname);
            }));
        }
        await pending.get(pathname);
        async function rollupWebModuleTask(module, filename) {
            tiny_node_logger_1.default.info("rollup web module:", pathname);
            if (filename && !importMap.imports[module] && !squash(module)) {
                await rollupWebModule(module);
            }
            const pkg = await requireManifest(module);
            const startTime = Date.now();
            const bundle = await rollup_1.rollup({
                input: pathname,
                plugins: taskPlugins(pkg, filename),
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
                await writeImportMap(outDir, importMap);
            }
            finally {
                await bundle.close();
                const elapsed = Date.now() - startTime;
                tiny_node_logger_1.default.info `rolled up: ${chalk_1.default.magenta(pathname)} in: ${chalk_1.default.magenta(elapsed)}ms`;
            }
        }
    }
    return {
        importMap,
        resolveImport,
        rollupWebModule
    };
}
exports.useWebModules = useWebModules;
//# sourceMappingURL=web-modules.js.map