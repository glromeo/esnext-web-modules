import {init as parseEsmReady, parse as parseEsm} from "es-module-lexer";
import * as fs from "fs";
import * as path from "path";
import {Plugin} from "rollup";
import {isBare, toPosix} from "./es-import-utils";

function scanEsm(
    filename: string,
    exportsByFilename = new Map<string, string[]>(),
    exports = new Set<string>()
): Map<string, string[]> {
    let source = fs.readFileSync(filename, "utf-8");
    let [
        moduleImports,
        moduleExports
    ] = parseEsm(source);

    let uniqueExports: string[] = [];
    for (const e of moduleExports) if (!exports.has(e)) {
        uniqueExports.push(e);
        exports.add(e);
    }

    exportsByFilename.set(filename, uniqueExports);

    for (const {s, e} of moduleImports) {
        let moduleImport = source.substring(s, e);
        if (!isBare(moduleImport)) {
            if (moduleImport === "..") {
                moduleImport = "../index";
            } else if (moduleImport === ".") {
                moduleImport = "./index";
            }
            let importedFilename = require.resolve(moduleImport, {paths: [path.dirname(filename)]});
            if (!exportsByFilename.has(importedFilename)) {
                scanEsm(importedFilename, exportsByFilename, exports);
            }
        }
    }

    return exportsByFilename;
}

export type PluginEsmProxyOptions = {
    entryModules: Set<string>
}

/**
 *              _ _             _____  _             _       ______               _____
 *             | | |           |  __ \| |           (_)     |  ____|             |  __ \
 *    _ __ ___ | | |_   _ _ __ | |__) | |_   _  __ _ _ _ __ | |__   ___ _ __ ___ | |__) | __ _____  ___   _
 *   | '__/ _ \| | | | | | '_ \|  ___/| | | | |/ _` | | '_ \|  __| / __| '_ ` _ \|  ___/ '__/ _ \ \/ / | | |
 *   | | | (_) | | | |_| | |_) | |    | | |_| | (_| | | | | | |____\__ \ | | | | | |   | | | (_) >  <| |_| |
 *   |_|  \___/|_|_|\__,_| .__/|_|    |_|\__,_|\__, |_|_| |_|______|___/_| |_| |_|_|   |_|  \___/_/\_\\__, |
 *                       | |                    __/ |                                                  __/ |
 *                       |_|                   |___/                                                  |___/
 *
 * @param entryModules
 */
export function rollupPluginEsmProxy({entryModules}: PluginEsmProxyOptions): Plugin {
    return {
        name: "rollup-plugin-esm-proxy",
        async buildStart(options) {
            await parseEsmReady;
        },
        async resolveId(source, importer) {
            if (!importer && entryModules.has(source)) {
                let resolution = await this.resolve(source, importer, {skipSelf: true});
                if (resolution) {
                    return `${resolution.id}?esm-proxy`;
                }
            }
            return null;
        },
        load(id) {
            if (id.endsWith("?esm-proxy")) {
                const imported = id.slice(0, -10);
                const exportsByFilename = scanEsm(imported);
                let proxy = "";
                for (const [filename, exports] of exportsByFilename.entries()) {
                    if (exports.length > 0) {
                        let importUrl = toPosix(filename);
                        proxy += `export {\n${exports.join(",\n")}\n} from "${importUrl}";\n`;
                    }
                }
                return proxy || fs.readFileSync(imported, "utf-8");
            }
            return null;
        }
    };
}
