"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModuleDirectories = void 0;
function getModuleDirectories(config) {
    const moduleDirectory = config.resolve.moduleDirectory;
    return typeof moduleDirectory === "string" ? [moduleDirectory] : moduleDirectory;
}
exports.getModuleDirectories = getModuleDirectories;
//# sourceMappingURL=config.js.map