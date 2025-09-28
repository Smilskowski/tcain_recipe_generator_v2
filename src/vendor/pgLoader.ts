// src/vendor/pgLoader.ts
import fs from "fs";
import path from "path";
import vm from "vm";

export type PGBag = {
  str2seed: (s: string) => number;
  bucket_sort_list_toint64: (arr: number[]) => string | number;
  get_result: (arr: number[], seed: number) => number;
};

export function loadPGBag(): PGBag | null {
  const file = path.join(process.cwd(), "docs", "new_bag4.js");
  if (!fs.existsSync(file)) return null;

  const code = fs.readFileSync(file, "utf8");
  // Sandbox mit globalThis, um Funktionen zu „exportieren“
  const sandbox: any = { console, globalThis: {} };
  vm.createContext(sandbox);
  // Script ausführen – legt Funktionen auf globalThis
  new vm.Script(code, { filename: "new_bag4.js" }).runInContext(sandbox);

  // Suchen der erwarteten Funktionen
  const g = sandbox.globalThis as any;
  const required = ["str2seed", "bucket_sort_list_toint64", "get_result"];
  for (const k of required) {
    if (typeof g[k] !== "function") return null;
  }
  return {
    str2seed: g.str2seed,
    bucket_sort_list_toint64: g.bucket_sort_list_toint64,
    get_result: g.get_result,
  };
}
