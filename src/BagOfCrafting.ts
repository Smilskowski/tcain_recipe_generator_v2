import _ = require('lodash');
import { ItemPool, ItemQualities } from './Isaac';
import { str2seed, get_result } from './pg-bag4';

// Offizielle PlatinumGod-Logik (Wrapper)
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

  /**
   * Ermittelt das Ergebnis (Item-ID) für genau 8 Komponenten.
   * Delegiert vollständig an die offizielle Logik aus docs/new_bag4.js.
   */
  
 calculate(components: number[], seed?: number | string): Promise<number> {
  if (!Array.isArray(components) || components.length !== 8) {
    return Promise.reject(new Error('Invalid components'));
  }
  let rngSeed = 0;
  if (typeof seed === 'string') {
    // Seed-String → Zahl
    return str2seed(seed).then(s => get_result(components, s >>> 0));
  } else if (typeof seed === 'number') {
    rngSeed = seed >>> 0;
  }
  // Wenn seed undefined oder Zahl
  return get_result(components, rngSeed);
}
}
export default BagOfCrafting;
