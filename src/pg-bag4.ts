// src/pg-bag4.ts
import * as vm from 'vm';
import { execFileSync, execSync } from 'child_process';

function fetchScriptSync(url: string): string {
  try {
    // 1) curl (Windows 10+ hat curl)
    const out = execFileSync('curl', ['-sL', url], { encoding: 'utf8' });
    if (out && out.includes('function') && out.includes('get_result')) return out;
  } catch {}
  try {
    // 2) PowerShell Fallback (ohne curl)
    const ps = `powershell -NoProfile -ExecutionPolicy Bypass -Command "(New-Object Net.WebClient).DownloadString('${url}')"`;
    const out = execSync(ps, { encoding: 'utf8' });
    if (out && out.includes('function') && out.includes('get_result')) return out;
  } catch {}
  throw new Error('Konnte new_bag4.js nicht synchron laden (curl/PowerShell fehlt?).');
}

const CODE = fetchScriptSync('https://platinumgod.co.uk/bag-of-crafting/new_bag4.js');

const sandbox: any = { module: { exports: {} }, exports: {}, console };
vm.createContext(sandbox);
vm.runInContext(CODE, sandbox, { filename: 'new_bag4.js' });

const _str2seed =
  sandbox.str2seed || sandbox.module?.exports?.str2seed || sandbox.exports?.str2seed;
const _get_result =
  sandbox.get_result || sandbox.module?.exports?.get_result || sandbox.exports?.get_result;

if (typeof _str2seed !== 'function' || typeof _get_result !== 'function') {
  throw new Error('str2seed/get_result nicht gefunden.');
}

export const str2seed: (s: string) => number = _str2seed;
export const get_result: (components: number[], seed: number) => number = _get_result;

export default { str2seed, get_result };
