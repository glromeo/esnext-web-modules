import {init as initCjs, parse as parseCjs} from "cjs-module-lexer";
import * as fs from "fs";
import * as path from "path";
import {Plugin} from "rollup";
import log from "tiny-node-logger";
import {isBare, toPosix} from "./es-import-utils";

const parseCjsReady = initCjs();

function scanCjs(
    filename: string,
    collected: Set<string> = new Set<string>()
): Set<string> {
    let source = fs.readFileSync(filename, "utf-8");
    let {
        exports,
        reexports
    } = parseCjs(source);

    for (const e of exports) {
        collected.add(e);
    }

    for (let required of reexports) {
        if (!isBare(required)) {
            if (required === "..") {
                required = "../index";
            } else if (required === ".") {
                required = "./index";
            }
            let requiredFilename = require.resolve(required, {paths: [path.dirname(filename)]});
            scanCjs(requiredFilename, collected);
        }
    }

    return collected;
}

export type PluginCjsProxyOptions = {
    entryModules: Set<string>
}

/**
 *              _ _             _____  _             _        _____ _     _____
 *             | | |           |  __ \| |           (_)      / ____(_)   |  __ \
 *    _ __ ___ | | |_   _ _ __ | |__) | |_   _  __ _ _ _ __ | |     _ ___| |__) | __ _____  ___   _
 *   | '__/ _ \| | | | | | '_ \|  ___/| | | | |/ _` | | '_ \| |    | / __|  ___/ '__/ _ \ \/ / | | |
 *   | | | (_) | | | |_| | |_) | |    | | |_| | (_| | | | | | |____| \__ \ |   | | | (_) >  <| |_| |
 *   |_|  \___/|_|_|\__,_| .__/|_|    |_|\__,_|\__, |_|_| |_|\_____| |___/_|   |_|  \___/_/\_\\__, |
 *                       | |                    __/ |             _/ |                         __/ |
 *                       |_|                   |___/             |__/                         |___/
 *
 * @param entryModules
 */
export function rollupPluginCjsProxy({entryModules}: PluginCjsProxyOptions): Plugin {
    return {
        name: "rollup-plugin-cjs-proxy",
        async buildStart(options) {
            await parseCjsReady;
        },
        async resolveId(source, importer) {
            if (!importer && source.charCodeAt(0) !== 0 && entryModules.has(source)) {
                let resolution = await this.resolve(source, undefined, {skipSelf: true});
                if (resolution) {
                    log.debug("cjs-proxy resolved:", source, resolution.id);
                    return `${resolution.id}?cjs-proxy`;
                }
            }
            return null;
        },
        load(id) {
            if (id.endsWith("?cjs-proxy")) {
                const entryId = id.slice(0, -10);
                const entryUrl = toPosix(entryId);
                const exports = scanCjs(entryId);
                exports.delete("__esModule");
                let proxy = "";
                if (!exports.has("default")) {
                    proxy += `import __default__ from "${entryUrl}";\nexport default __default__;\n`;
                }
                if (exports.size > 0) {
                    proxy += `export {\n${Array.from(exports).join(",\n")}\n} from "${entryUrl}";\n`;
                }
                return proxy || fs.readFileSync(entryId, "utf-8");
            }
            return null;
        }
    };
}
