// src/pg-bag4.ts
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadBag4() {
  const p = path.resolve(process.cwd(), 'docs/new_bag4.js');
  let code: string;
  try {
    code = fs.readFileSync(p, 'utf8');
  } catch (_e) {
    // Fallback, falls Git „binär/Encoding“ meldet
    const buf = fs.readFileSync(p);
    code = buf.toString('latin1');
  }

  const sandbox: any = { module: {}, exports: {}, window: {}, global: {} };
  sandbox.global = sandbox.window;

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'new_bag4.js' });

  const s2s =
    sandbox.str2seed ||
    sandbox.window?.str2seed ||
    sandbox.global?.str2seed ||
    sandbox.module?.exports?.str2seed;

  const getRes =
    sandbox.get_result ||
    sandbox.window?.get_result ||
    sandbox.global?.get_result ||
    sandbox.module?.exports?.get_result;

  if (typeof s2s !== 'function' || typeof getRes !== 'function') {
    throw new Error('new_bag4.js did not expose str2seed/get_result');
  }
  return { str2seed: s2s, get_result: getRes };
}

const _bag4 = loadBag4();

export const str2seed: (s: string) => number = _bag4.str2seed;
export const get_result: (components: number[], seed: number) => number = _bag4.get_result;

export default { str2seed, get_result };
