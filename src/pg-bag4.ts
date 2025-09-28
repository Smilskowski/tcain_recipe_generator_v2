// src/pg-bag4.ts
import * as https from 'https';
import * as vm from 'vm';

interface BagAPI {
  str2seed: (s: string) => number;
  get_result: (comps: number[], seed: number) => number;
}

let cached: BagAPI | null = null;

/**
 * Lädt die Original‑Bag-of-Crafting‑Logik über HTTPS,
 * evaluiert sie in einer VM und cached die Exporte.
 */
function loadBagOfCrafting(): Promise<BagAPI> {
  if (cached) return Promise.resolve(cached);
  const url = 'https://platinumgod.co.uk/bag-of-crafting/new_bag4.js';
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const sandbox: any = { module: { exports: {} }, exports: {}, console };
            vm.createContext(sandbox);
            vm.runInContext(data, sandbox, { filename: 'new_bag4.js' });
            const str2seed =
              sandbox.str2seed ||
              sandbox.module?.exports?.str2seed ||
              sandbox.exports?.str2seed;
            const get_result =
              sandbox.get_result ||
              sandbox.module?.exports?.get_result ||
              sandbox.exports?.get_result;
            if (typeof str2seed !== 'function' || typeof get_result !== 'function') {
              reject(
                new Error(
                  'new_bag4.js enthält keine str2seed()/get_result()-Funktionen'
                )
              );
              return;
            }
            cached = { str2seed, get_result };
            resolve(cached);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', err => reject(err));
  });
}

export async function str2seed(s: string): Promise<number> {
  const api = await loadBagOfCrafting();
  return api.str2seed(s);
}

export async function get_result(
  comps: number[],
  seed: number
): Promise<number> {
  const api = await loadBagOfCrafting();
  return api.get_result(comps, seed);
}

export default { str2seed, get_result };
