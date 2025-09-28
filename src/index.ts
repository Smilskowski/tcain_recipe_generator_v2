// src/index.ts
import * as fs from 'fs';
import * as path from 'path';
// import * as xml2js from 'xml2js'; // Optional - only if xml2js is installed
import _ = require('lodash');
import BagOfCrafting from './BagOfCrafting';
import { ItemPool, ItemQualities, CRAFTING_COMPONENTS, validateRecipe } from './Isaac';

interface ItemData {
  id: number;
  name: string;
  quality: number;
}

interface GenerationOptions {
  seed?: string;
  maxRecipesPerItem?: number;
  targetItemId?: number;
  includeComponents?: number[];
  excludeComponents?: number[];
  maxQuality?: number;
  minQuality?: number;
}

class RecipeGenerator {
  private bagOfCrafting: BagOfCrafting;
  private items: Map<number, ItemData> = new Map();

  constructor() {
    console.log('Initializing Recipe Generator...');
    
    // Load item data
    this.loadItemData();
    
    // Create BagOfCrafting instance with default pools
    const defaultPools: ItemPool[] = [
      { name: 'treasure', items: Array.from(this.items.keys()) }
    ];
    
    const defaultQualities: ItemQualities = {};
    this.items.forEach((item, id) => {
      defaultQualities[id] = item.quality;
    });
    
    this.bagOfCrafting = new BagOfCrafting(defaultPools, defaultQualities);
    console.log('Recipe Generator initialized successfully!');
  }

  private loadItemData(): void {
    try {
      // Try to load from XML files if they exist
      const itemsPath = path.join(__dirname, 'assets', 'items.xml');
      const metadataPath = path.join(__dirname, 'assets', 'items_metadata.xml');
      
      if (fs.existsSync(itemsPath) && fs.existsSync(metadataPath)) {
        console.log('Loading items from XML files...');
        this.loadFromXML(itemsPath, metadataPath);
      } else {
        console.log('XML files not found, using default item data...');
        this.loadDefaultItems();
      }
      
      console.log(`Loaded ${this.items.size} items`);
    } catch (error) {
      console.warn('Failed to load item data from XML, using defaults:', error);
      this.loadDefaultItems();
    }
  }

  private loadFromXML(itemsPath: string, metadataPath: string): void {
    // This is a simplified XML loader - in a real implementation you'd parse the actual XML structure
    // For now we'll use default data
    this.loadDefaultItems();
  }

  private loadDefaultItems(): void {
    // Add some common Isaac items for testing
    const defaultItems: ItemData[] = [
      { id: 15, name: "15", quality: 1 },
      { id: 16, name: "16", quality: 1 },
      { id: 609, name: "Eternal D6", quality: 4 },
      { id: 1, name: "Sad Onion", quality: 2 },
      { id: 2, name: "Inner Eye", quality: 3 },
      { id: 3, name: "Spoon Bender", quality: 3 },
      { id: 4, name: "Cricket's Head", quality: 4 },
      { id: 5, name: "My Reflection", quality: 1 },
      { id: 6, name: "Number One", quality: 2 },
      { id: 7, name: "Blood of the Martyr", quality: 3 }
    ];

    // Add more items in ranges
    for (let i = 10; i <= 750; i++) {
      if (!defaultItems.find(item => item.id === i)) {
        const quality = Math.floor(Math.random() * 5); // Random quality 0-4
        defaultItems.push({ id: i, name: `Item ${i}`, quality });
      }
    }

    defaultItems.forEach(item => {
      this.items.set(item.id, item);
    });
  }

  public generateRecipe(targetItemId: number, options: GenerationOptions = {}): number[][] {
    const {
      seed = 'DEFAULT',
      maxRecipesPerItem = 10,
      includeComponents = [],
      excludeComponents = [],
      maxQuality = 4,
      minQuality = 0
    } = options;

    console.log(`Generating recipes for item ${targetItemId} with seed "${seed}"`);
    
    const recipes: number[][] = [];
    const availableComponents = CRAFTING_COMPONENTS
      .filter(comp => {
        if (includeComponents.length > 0 && !includeComponents.includes(comp.id)) return false;
        if (excludeComponents.includes(comp.id)) return false;
        if (comp.quality > maxQuality || comp.quality < minQuality) return false;
        return true;
      })
      .map(comp => comp.id);

    console.log(`Searching with ${availableComponents.length} available components`);

    let attempts = 0;
    const maxAttempts = 100000; // Limit attempts to prevent infinite loops

    while (recipes.length < maxRecipesPerItem && attempts < maxAttempts) {
      attempts++;
      
      // Generate a random combination of components
      const combination = this.generateRandomCombination(availableComponents);
      
      // Validate the combination
      const validation = validateRecipe(combination);
      if (!validation.valid) continue;

      try {
        // Calculate what item this combination would create
        const resultItemId = this.bagOfCrafting.calculate(combination, seed);
        
        // Check if this is the item we want
        if (resultItemId === targetItemId) {
          // Check if we already have this exact recipe
          const isDuplicate = recipes.some(recipe => 
            recipe.length === combination.length &&
            recipe.every((comp, index) => comp === combination[index])
          );
          
          if (!isDuplicate) {
            recipes.push([...combination]);
            console.log(`Found recipe ${recipes.length}/${maxRecipesPerItem}: [${combination.join(', ')}]`);
          }
        }
      } catch (error) {
        // Skip invalid combinations
        continue;
      }

      // Progress update
      if (attempts % 10000 === 0) {
        console.log(`Attempt ${attempts}: Found ${recipes.length} recipes so far...`);
      }
    }

    console.log(`Recipe generation complete: Found ${recipes.length} recipes in ${attempts} attempts`);
    return recipes;
  }

  private generateRandomCombination(availableComponents: number[]): number[] {
    const combination: number[] = [];
    
    // Fill 8 slots
    for (let i = 0; i < 8; i++) {
      // Sometimes add empty slots for variety
      if (Math.random() < 0.2) {
        combination.push(0); // Empty
      } else {
        const randomComponent = availableComponents[Math.floor(Math.random() * availableComponents.length)];
        combination.push(randomComponent);
      }
    }
    
    return combination;
  }

  public findAllRecipes(options: GenerationOptions = {}): Map<number, number[][]> {
    const {
      maxRecipesPerItem = 3,
      targetItemId
    } = options;

    const allRecipes = new Map<number, number[][]>();
    
    if (targetItemId) {
      // Generate recipes for specific item
      const recipes = this.generateRecipe(targetItemId, options);
      if (recipes.length > 0) {
        allRecipes.set(targetItemId, recipes);
      }
    } else {
      // Generate recipes for all items (limited set for performance)
      const itemsToProcess = Array.from(this.items.keys()).slice(0, 50); // Limit for demo
      
      for (const itemId of itemsToProcess) {
        console.log(`Processing item ${itemId}...`);
        const recipes = this.generateRecipe(itemId, { ...options, maxRecipesPerItem });
        if (recipes.length > 0) {
          allRecipes.set(itemId, recipes);
        }
      }
    }

    return allRecipes;
  }

  public testSpecificRecipe(): void {
    console.log('\n=== Testing Specific Recipe ===');
    console.log('Testing: Seed 2LP2D89M, Item 609, Components: Red Heart, Soul Heart, Bone Heart, Pill, Nickel');
    
    const testSeed = '2LP2D89M';
    const testComponents = [0, 1, 5, 8, 20, 0, 0, 0]; // Red Heart, Bone Heart, Nickel, Card
    const expectedItemId = 609;

    try {
      const result = this.bagOfCrafting.calculate(testComponents, testSeed);
      console.log(`Result: Item ID ${result}`);
      
      if (result === expectedItemId) {
        console.log('✅ Test PASSED!');
      } else {
        console.log(`❌ Test FAILED! Expected ${expectedItemId}, got ${result}`);
      }
    } catch (error) {
      console.error('❌ Test ERROR:', error);
    }
  }

  public getItemName(itemId: number): string {
    const item = this.items.get(itemId);
    return item ? item.name : `Unknown Item ${itemId}`;
  }

  public printRecipes(recipes: Map<number, number[][]>): void {
    console.log('\n=== Recipe Results ===');
    
    if (recipes.size === 0) {
      console.log('No recipes found.');
      return;
    }

    recipes.forEach((itemRecipes, itemId) => {
      console.log(`\nItem ${itemId} (${this.getItemName(itemId)}):`);
      itemRecipes.forEach((recipe, index) => {
        const componentNames = recipe.map(compId => {
          const comp = CRAFTING_COMPONENTS.find(c => c.id === compId);
          return comp ? comp.name : `Unknown(${compId})`;
        });
        console.log(`  Recipe ${index + 1}: [${componentNames.join(', ')}]`);
      });
    });
  }
}

// Main execution
function main(): void {
  console.log('=== Tainted Cain Recipe Generator ===\n');
  
  try {
    const generator = new RecipeGenerator();
    
    // Run the specific test case first
    generator.testSpecificRecipe();
    
    // Test generating recipes for the target item
    console.log('\n=== Generating Recipes for Item 609 ===');
    const recipes = generator.findAllRecipes({
      targetItemId: 609,
      seed: '2LP2D89M',
      maxRecipesPerItem: 5,
      includeComponents: [0, 1, 2, 5, 8, 20, 21] // Include the components from your test
    });
    
    generator.printRecipes(recipes);
    
    console.log('\n=== Recipe Generation Complete ===');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  main();
}

export default RecipeGenerator;
