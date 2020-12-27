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
exports.useWebModules = exports.importMap = void 0;
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
function updateImportMap(module, bundle) {
    let outputUrl = `/web_modules/${module}.js`;
    let watchFiles = bundle.watchFiles.slice(1);
    for (const file of watchFiles) {
        exports.importMap.imports[module] = outputUrl;
        if (file.charCodeAt(0) !== 0 && !file.endsWith("?commonjs-proxy")) {
            let importUrl = file.substring(file.lastIndexOf("node_modules") + 13).replace(/\\/g, "/");
            exports.importMap.imports[importUrl] = outputUrl;
        }
    }
}
exports.importMap = { imports: {} };
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
function useWebModules(config) {
    const outDir = path.resolve(config.rootDir, "web_modules");
    const resolveImport = async (url, basedir) => {
        let { hostname, pathname, search } = fast_url_parser_1.parse(url);
        if (hostname !== undefined) {
            return url;
        }
        let resolved = exports.importMap.imports[pathname];
        if (resolved) {
            pathname = resolved;
        }
        else if (es_import_utils_1.isBare(pathname)) {
            let [module, filename] = es_import_utils_1.parsePathname(pathname);
            if (module !== null) {
                resolved = exports.importMap.imports[module];
                if (!resolved) {
                    resolved = await rollupWebModule(module);
                }
                if (filename !== null) {
                    resolved = resolved + "/" + filename;
                }
                pathname = resolved;
            }
        }
        if (pathname.charAt(0) !== "/" && basedir) {
            pathname = path.posix.join(basedir, pathname);
        }
        /* everything must be a javascript module: .css -> .css.js, .json -> .json.js */
        const ext = path.extname(pathname).toLowerCase();
        if (ext !== ".js" && ext !== ".mjs") {
            pathname += ".js";
        }
        if (search) {
            return pathname + "?" + search;
        }
        else {
            return pathname;
        }
    };
    const rollupPlugins = [
        plugin_node_resolve_1.nodeResolve({
            rootDir: config.rootDir,
            moduleDirectories: config_1.getModuleDirectories(config)
        }),
        plugin_commonjs_1.default(),
        plugin_json_1.default(),
        rollup_plugin_postcss_1.default(),
        rollup_plugin_sourcemaps_1.default(),
        config.terser && rollup_plugin_terser_1.terser(config.terser)
    ].filter(Boolean);
    const cjsModuleProxy = rollup_plugin_module_proxy_1.moduleProxy("cjs-proxy", resolveImport);
    const esmModuleProxy = rollup_plugin_module_proxy_1.moduleProxy("esm-proxy", resolveImport);
    function pluginModuleProxy(pkg) {
        return pkg.module || pkg["jsnext:main"] || pkg.main.endsWith(".mjs") ? esmModuleProxy : cjsModuleProxy;
    }
    const pending = {};
    function rollupWebModule(module, write = true) {
        // if (options.dir) {
        //     importMap = readImportMap(options.dir);
        // }
        if (exports.importMap.imports[module]) {
            return exports.importMap.imports[module];
        }
        return pending[module] || (pending[module] = new Promise(async function (resolve) {
            let pkg = await readManifest(module, config.resolve);
            const startTime = Date.now();
            const bundle = await rollup_1.rollup({
                input: module,
                plugins: [
                    pluginModuleProxy(pkg),
                    ...rollupPlugins
                ]
            });
            try {
                if (write) {
                    let { output: [firstChunk] } = await bundle.write({
                        file: `${outDir}/${module}.js`,
                        sourcemap: !config.terser
                    });
                    updateImportMap(module, bundle);
                    writeImportMap(outDir, exports.importMap);
                    return exports.importMap.imports[module];
                }
                else {
                    return bundle.generate({
                        sourcemap: !config.terser
                    });
                }
            }
            finally {
                await bundle.close();
                const elapsed = Date.now() - startTime;
                //@ts-ignore
                tiny_node_logger_1.default.info `rolled up: ${chalk_1.default.magenta(module)} in: ${chalk_1.default.magenta(elapsed)}ms`;
            }
        }).finally(function () {
            delete pending[module];
        }));
    }
    return {
        resolveImport,
        rollupWebModule
    };
}
exports.useWebModules = useWebModules;
//# sourceMappingURL=esnext-bundler.js.map