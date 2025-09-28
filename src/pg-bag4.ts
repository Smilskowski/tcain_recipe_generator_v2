// src/pg-bag4.ts
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import * as zlib from 'zlib';

function isGzip(buf: Buffer) {
  return buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b;
}

function maybeDecompress(buf: Buffer): Buffer {
  if (isGzip(buf)) {
    return zlib.gunzipSync(buf);
  }
  // optional: brotli fallback, falls nötig
  try {
    // Heuristik: wenn viele nicht druckbare Bytes → evtl. brotli
    const nonPrintable = buf.slice(0, 64).filter(b => b < 9 || (b > 13 && b < 32)).length;
    if (nonPrintable > 40) {
      return zlib.brotliDecompressSync(buf);
    }
  } catch {}
  return buf;
}

function toStringSafe(buf: Buffer): string {
  // UTF-8 zuerst
  let s = buf.toString('utf8');
  // BOM entfernen
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  // Falls sehr viele Ersatzzeichen, nochmal latin1 probieren
  const repl = (s.match(/\uFFFD/g) || []).length;
  if (repl > 10) {
    s = buf.toString('latin1');
  }
  return s;
}

function loadBag4() {
  const p = path.resolve(process.cwd(), 'docs/new_bag4.js');
  const raw = fs.readFileSync(p);
  const decompressed = maybeDecompress(raw);
  const code = toStringSafe(decompressed);

  const sandbox: any = { module: { exports: {} }, exports: {}, window: {}, global: {} };
  sandbox.global = sandbox.window;

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'new_bag4.js' });

  const s2s =
    sandbox.str2seed ??
    sandbox.window?.str2seed ??
    sandbox.global?.str2seed ??
    sandbox.module?.exports?.str2seed;

  const getRes =
    sandbox.get_result ??
    sandbox.window?.get_result ??
    sandbox.global?.get_result ??
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
