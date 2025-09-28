"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPGBag = void 0;
// src/vendor/pgLoader.ts
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const vm_1 = __importDefault(require("vm"));
function loadPGBag() {
    const file = path_1.default.join(process.cwd(), "docs", "new_bag4.js");
    if (!fs_1.default.existsSync(file))
        return null;
    const code = fs_1.default.readFileSync(file, "utf8");
    // Sandbox mit globalThis, um Funktionen zu „exportieren“
    const sandbox = { console, globalThis: {} };
    vm_1.default.createContext(sandbox);
    // Script ausführen – legt Funktionen auf globalThis
    new vm_1.default.Script(code, { filename: "new_bag4.js" }).runInContext(sandbox);
    // Suchen der erwarteten Funktionen
    const g = sandbox.globalThis;
    const required = ["str2seed", "bucket_sort_list_toint64", "get_result"];
    for (const k of required) {
        if (typeof g[k] !== "function")
            return null;
    }
    return {
        str2seed: g.str2seed,
        bucket_sort_list_toint64: g.bucket_sort_list_toint64,
        get_result: g.get_result,
    };
}
exports.loadPGBag = loadPGBag;
//# sourceMappingURL=pgLoader.js.map