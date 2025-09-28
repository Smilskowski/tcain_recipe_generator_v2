// src/selftest.ts
import { str2seed, get_result } from './pg-bag4';

function test(seedStr: string, comps: number[]) {
  const seed = str2seed(seedStr) >>> 0;
  const res = get_result(comps, seed);
  console.log('SeedStr:', seedStr, '=> uint32:', seed);
  console.log('Components:', JSON.stringify(comps));
  console.log('Result Item ID:', res);
}

test('2LP2D89M', [0,1,5,8,20,0,0,0]); // Erwartung: 609 (Eternal D6)
