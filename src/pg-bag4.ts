// src/pg-bag4.ts
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import * as zlib from 'zlib';
import { TextDecoder, TextEncoder } from 'util';

function isGzip(b: Buffer) {
  return b.length > 2 && b[0] === 0x1f && b[1] === 0x8b;
}

function tryDecode(raw: Buffer): string {
  const candidates: Buffer[] = [raw];
  if (isGzip(raw)) {
    candidates.push(zlib.gunzipSync(raw));
  } else {
    // falls als brotli abgelegt
    try { candidates.push(zlib.brotliDecompressSync(raw)); } catch {}
  }
  for (const buf of candidates) {
    // bevorzugt utf8, dann latin1 als Fallback
    let s = buf.toString('utf8');
    if (s.includes('get_result') || s.includes('str2seed')) return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
    s = buf.toString('latin1');
    if (s.includes('get_result') || s.includes('str2seed')) return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
  }
  // letzte Chance
  let s = raw.toString('utf8');
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
}

function loadBag4() {
  const p = path.resolve(process.cwd(), 'docs/new_bag4.js');
  const raw = fs.readFileSync(p);
  const code = tryDecode(raw);

  // Browser-Polyfills, die new_bag4.js oft erwartet
  const sandbox: any = {
    module: { exports: {} },
    exports: {},
    window: {},
    self: {},
    global: {},
    globalThis: undefined,
    console,
    TextDecoder,
    TextEncoder,
    atob: (s: string) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s: string) => Buffer.from(s, 'binary').toString('base64'),
    // Minimal-DOM-Stubs, falls referenziert
    document: undefined,
    performance: { now: () => Date.now() },
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);

  // Ausführen; viele Skripte werfen bei fehlenden Polyfills "Error" – das umgehen wir jetzt durch vollständige Stubs
  vm.runInContext(code, sandbox, { filename: 'new_bag4.js' });

  // mögliche Export-Wege durchprobieren
  const candidates = [
    sandbox.module?.exports,
    sandbox.exports,
    sandbox,
    sandbox.window,
    sandbox.global,
  ];

  let str2seedFn: any, getResultFn: any;
  for (const c of candidates) {
    if (!c) continue;
    if (!str2seedFn && typeof c.str2seed === 'function') str2seedFn = c.str2seed;
    if (!getResultFn && typeof c.get_result === 'function') getResultFn = c.get_result;
  }

  if (typeof str2seedFn !== 'function' || typeof getResultFn !== 'function') {
    throw new Error('new_bag4.js: str2seed/get_result nicht gefunden (Encoding/Polyfill)');
  }
  return { str2seed: str2seedFn, get_result: getResultFn };
}

const _bag4 = loadBag4();

export const str2seed: (s: string) => number = _bag4.str2seed;
export const get_result: (components: number[], seed: number) => number = _bag4.get_result;

export default { str2seed, get_result };
