import isNodeBuiltin from "is-builtin-module";
import {Plugin} from "rollup";

/**
 * rollup-plugin-catch-unresolved
 *
 * Catch any unresolved imports to give proper warnings (Rollup default is to ignore).
 */
export function rollupPluginCatchUnresolved(): Plugin {
    return {
        name: "rollup-plugin-catch-unresolved",
        resolveId(id, importer) {

            if (id.startsWith("http://") || id.startsWith("https://")) {
                return false;
            }

            if (isNodeBuiltin(id)) {
                this.warn({
                    id: importer,
                    message: `Module "${id}" (Node.js built-in) is not available in the browser.`
                });
            } else {
                this.warn({
                    id: importer,
                    message: `Module "${id}" could not be resolved ...is it installed?`
                });
            }
            return false;
        }
    };
}
