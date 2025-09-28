// src/Isaac.ts
export interface Item {
  id: number;
  name: string;
  description: string;
  quality: number;
  pools: string[];
}

export interface ItemPool {
  name: string;
  items: number[];
}

export interface ItemQualities {
  [itemId: number]: number;
}

export interface Component {
  id: number;
  name: string;
  quality: number;
  sprite?: string;
}

export interface CraftingRecipe {
  components: number[];
  result: number;
  seed?: string | number;
}

export interface BagOfCraftingOptions {
  seed?: string | number;
  maxRecipesPerItem?: number;
  includeQuality0?: boolean;
}

// Component mappings for the Bag of Crafting
export const CRAFTING_COMPONENTS: Component[] = [
  { id: 0, name: "Empty", quality: 0 },
  { id: 1, name: "Red Heart", quality: 1 },
  { id: 2, name: "Soul Heart", quality: 4 },
  { id: 3, name: "Black Heart", quality: 2 },
  { id: 4, name: "Eternal Heart", quality: 2 },
  { id: 5, name: "Bone Heart", quality: 3 },
  { id: 6, name: "Gold Heart", quality: 2 },
  { id: 7, name: "Penny", quality: 2 },
  { id: 8, name: "Nickel", quality: 3 },
  { id: 9, name: "Dime", quality: 4 },
  { id: 10, name: "Lucky Penny", quality: 2 },
  { id: 11, name: "Key", quality: 1 },
  { id: 12, name: "Golden Key", quality: 3 },
  { id: 13, name: "Charged Key", quality: 3 },
  { id: 14, name: "Bomb", quality: 1 },
  { id: 15, name: "Golden Bomb", quality: 2 },
  { id: 16, name: "Giga Bomb", quality: 3 },
  { id: 17, name: "Micro Battery", quality: 1 },
  { id: 18, name: "Lil Battery", quality: 2 },
  { id: 19, name: "Mega Battery", quality: 3 },
  { id: 20, name: "Card", quality: 2 },
  { id: 21, name: "Pill", quality: 2 },
  { id: 22, name: "Rune", quality: 2 },
  { id: 23, name: "Dice Shard", quality: 3 },
  { id: 24, name: "Cracked Key", quality: 2 },
  { id: 25, name: "Poop", quality: 1 },
  { id: 26, name: "Red Poop", quality: 2 },
  { id: 27, name: "Gold Poop", quality: 3 },
  { id: 28, name: "Rainbow Poop", quality: 4 },
  { id: 29, name: "Lucky Poop", quality: 2 }
];

// Quality levels for items (simplified)
export const ITEM_QUALITY_LEVELS = {
  0: "Special/No Quality",
  1: "Common",
  2: "Uncommon", 
  3: "Rare",
  4: "Very Rare"
} as const;

// Helper functions
export function getComponentById(id: number): Component | undefined {
  return CRAFTING_COMPONENTS.find(comp => comp.id === id);
}

export function getComponentName(id: number): string {
  const component = getComponentById(id);
  return component ? component.name : `Unknown (${id})`;
}

export function getComponentQuality(id: number): number {
  const component = getComponentById(id);
  return component ? component.quality : 0;
}

export function isValidComponentId(id: number): boolean {
  return id >= 0 && id < CRAFTING_COMPONENTS.length;
}

export function validateRecipe(components: number[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!Array.isArray(components)) {
    errors.push("Components must be an array");
    return { valid: false, errors };
  }
  
  if (components.length !== 8) {
    errors.push("Recipe must have exactly 8 components");
  }
  
  components.forEach((comp, index) => {
    if (!Number.isInteger(comp)) {
      errors.push(`Component ${index} must be an integer, got ${comp}`);
    } else if (comp < 0) {
      errors.push(`Component ${index} must be non-negative, got ${comp}`);
    } else if (!isValidComponentId(comp)) {
      errors.push(`Component ${index} has invalid ID ${comp}`);
    }
  });
  
  return { valid: errors.length === 0, errors };
}

// Default item pools (simplified)
export const DEFAULT_ITEM_POOLS: ItemPool[] = [
  {
    name: "treasure",
    items: Array.from({ length: 200 }, (_, i) => i + 1)
  },
  {
    name: "shop", 
    items: Array.from({ length: 100 }, (_, i) => i + 201)
  },
  {
    name: "boss",
    items: Array.from({ length: 50 }, (_, i) => i + 301)
  }
];

export const DEFAULT_ITEM_QUALITIES: ItemQualities = {
  // This would normally be loaded from items_metadata.xml
  // For now we'll use a simple mapping
  609: 4 // Eternal D6 - high quality
};

// Export default instance
export default {
  CRAFTING_COMPONENTS,
  ITEM_QUALITY_LEVELS,
  DEFAULT_ITEM_POOLS,
  DEFAULT_ITEM_QUALITIES,
  getComponentById,
  getComponentName,
  getComponentQuality,
  isValidComponentId,
  validateRecipe
};
