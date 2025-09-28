import _ = require('lodash');
import { ItemPool, ItemQualities } from './Isaac';

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
  calculate(components: number[], seed?: number | string): number {
    if (!Array.isArray(components) || components.length !== 8) {
      throw new Error('Invalid components');
    }
    const s = this.normalizeSeed(seed);
    return get_result(components, s);
  }
}

export default BagOfCrafting;
