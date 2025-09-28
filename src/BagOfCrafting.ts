import _ = require('lodash');
import { ItemPool, ItemQualities } from './Isaac';

// SYNCHRON: keine Promises
const { str2seed, get_result } = require('./pg-bag4');

function fallbackSeedHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) >>> 0;
}

export class BagOfCrafting {
  private pools: ItemPool[];
  private itemQualities: ItemQualities;

  constructor(pools: ItemPool[], itemQualities: ItemQualities) {
    this.pools = pools;
    this.itemQualities = itemQualities;
  }

  private normalizeSeed(seed?: number | string): number {
    if (seed === undefined || seed === null) return 0;
    if (typeof seed === 'number') return seed >>> 0;
    try {
      return str2seed(seed) >>> 0;
    } catch {
      return fallbackSeedHash(seed) >>> 0;
    }
  }

  // GIBT NUMBER ZURÜCK (synchron)
  calculate(components: number[], seed?: number | string): number {
    if (!Array.isArray(components) || components.length !== 8) {
      throw new Error('Invalid components');
    }
    const s = this.normalizeSeed(seed);
    return get_result(components, s);
  }
}

export default BagOfCrafting;
