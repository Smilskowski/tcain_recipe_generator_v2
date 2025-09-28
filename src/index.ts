import fs = require('fs');
import { BagOfCrafting } from './BagOfCrafting';
import { XmlParser } from './XmlParser';
import * as http from 'http';
import * as url from 'url';

let pools = XmlParser.loadPools(fs.readFileSync('assets/itempools.xml', 'utf8'));
let meta = XmlParser.loadMeta(fs.readFileSync('assets/items_metadata.xml', 'utf8'));
let bc = new BagOfCrafting(pools, meta);

// Component names for better readability (Isaac Bag of Crafting component IDs)
const COMPONENT_NAMES = [
    'Red Heart',        // 0
    'Soul Heart',       // 1  
    'Black Heart',      // 2
    'Eternal Heart',    // 3
    'Gold Heart',       // 4
    'Bone Heart',       // 5
    'Rotten Heart',     // 6
    'Penny',            // 7
    'Nickel',           // 8
    'Dime',             // 9
    'Lucky Penny',      // 10
    'Key',              // 11
    'Golden Key',       // 12
    'Charged Key',      // 13
    'Bomb',             // 14
    'Golden Bomb',      // 15
    'Giga Bomb',        // 16
    'Micro Battery',    // 17
    'Mega Battery',     // 18
    'Card',             // 19
    'Pill',             // 20
    'Rune',             // 21
    'Dice Shard',       // 22
    'Cracked Key',      // 23
    'Gold Penny',       // 24
    'Golden Penny'      // 25
];

// Item database for names and search
let itemDatabase: Map<number, { name: string; id: number }> = new Map();
let itemNameToId: Map<string, number> = new Map();

// Load item database from XML
function loadItemDatabase() {
    try {
        const itemsXml = fs.readFileSync('assets/items.xml', 'utf8');
        const itemMatches = itemsXml.match(/<passive[^>]*id="(\d+)"[^>]*name="([^"]*)"[^>]*\/>/g) || [];
        const activeMatches = itemsXml.match(/<active[^>]*id="(\d+)"[^>]*name="([^"]*)"[^>]*\/>/g) || [];
        const familiarMatches = itemsXml.match(/<familiar[^>]*id="(\d+)"[^>]*name="([^"]*)"[^>]*\/>/g) || [];
        
        [...itemMatches, ...activeMatches, ...familiarMatches].forEach(match => {
            const idMatch = match.match(/id="(\d+)"/);
            const nameMatch = match.match(/name="([^"]*)"/);
            
            if (idMatch && nameMatch) {
                const id = parseInt(idMatch[1]);
                const name = nameMatch[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                itemDatabase.set(id, { name, id });
                itemNameToId.set(name.toLowerCase(), id);
            }
        });
        
        console.log(`Loaded ${itemDatabase.size} items from database`);
    } catch (error) {
        console.error('Error loading item database:', error);
    }
}

// Component weights for quality calculation
const COMPONENT_WEIGHTS = [
    0, 1, 4, 5, 5, 5, 5, 1, 1, 3, 5, 8, 2, 5, 5, 2, 6, 10, 2, 4, 8, 2, 2, 4, 4, 2
];

// Quality thresholds
const QUALITY_THRESHOLDS = [
    { min: 0, max: 1, weight: 8 },
    { min: 1, max: 2, weight: 14 },
    { min: 1, max: 3, weight: 18 },
    { min: 0, max: 2, weight: 22 },
    { min: 1, max: 4, weight: 26 },
    { min: 2, max: 4, weight: 30 },
    { min: 3, max: 4, weight: 34 },
    { min: 4, max: 4, weight: Infinity }
];

class RecipeGenerator {
    private bagOfCrafting: BagOfCrafting;
    private itemQualities: Map<number, number>;

    constructor(bagOfCrafting: BagOfCrafting, itemQualities: Map<number, number>) {
        this.bagOfCrafting = bagOfCrafting;
        this.itemQualities = itemQualities;
    }

    // Generate all possible recipes for given components
    generateRecipes(availableComponents: number[], maxRecipesPerItem: number = 20): Map<number, number[][]> {
        const recipes = new Map<number, number[][]>();
        const maxItemId = Math.max(...Array.from(this.itemQualities.keys()));

        // Generate all possible combinations of 8 components
        const combinations = this.generateCombinations(availableComponents, 8);
        
        console.log(`Generating recipes from ${combinations.length} possible combinations...`);
        
        for (const combination of combinations) {
            try {
                const itemId = this.bagOfCrafting.calculate([...combination]);
                
                if (!recipes.has(itemId)) {
                    recipes.set(itemId, []);
                }
                
                if (recipes.get(itemId)!.length < maxRecipesPerItem) {
                    recipes.get(itemId)!.push([...combination]);
                }
            } catch (error) {
                // Skip invalid combinations
            continue;
            }
        }

        return recipes;
    }

    // Generate all combinations of r elements from array (with repetition)
    private generateCombinations(arr: number[], r: number): number[][] {
        const combinations: number[][] = [];
        
        function backtrack(start: number, current: number[]) {
            if (current.length === r) {
                combinations.push([...current]);
                return;
            }
            
            for (let i = start; i < arr.length; i++) {
                current.push(arr[i]);
                backtrack(i, current); // Allow repetition
                current.pop();
            }
        }
        
        backtrack(0, []);
        return combinations;
    }
    
    // Generate unique combinations (no duplicates)
    private generateUniqueCombinations(arr: number[], r: number): number[][] {
        const combinations: number[][] = [];
        const seen = new Set<string>();
        
        function backtrack(start: number, current: number[]) {
            if (current.length === r) {
                const sorted = [...current].sort((a, b) => a - b);
                const key = sorted.join(',');
                if (!seen.has(key)) {
                    seen.add(key);
                    combinations.push([...current]);
                }
                return;
            }
            
            for (let i = start; i < arr.length; i++) {
                current.push(arr[i]);
                backtrack(i, current); // Allow repetition
                current.pop();
            }
        }
        
        backtrack(0, []);
        return combinations;
    }

    // Calculate total weight of components
    calculateWeight(components: number[]): number {
        return components.reduce((sum, comp) => sum + COMPONENT_WEIGHTS[comp], 0);
    }

    // Get quality range for weight
    getQualityRange(weight: number): { min: number; max: number } {
        for (const threshold of QUALITY_THRESHOLDS) {
            if (weight <= threshold.weight) {
                return { min: threshold.min, max: threshold.max };
            }
        }
        return { min: 4, max: 4 };
    }

    // Format recipe for display
    formatRecipe(components: number[]): string {
        return components.map(comp => COMPONENT_NAMES[comp]).join(', ');
    }

    // Get item quality
    getItemQuality(itemId: number): number {
        return this.itemQualities.get(itemId) || 0;
    }
}

// Load item database
loadItemDatabase();

// Web server setup
const generator = new RecipeGenerator(bc, meta);

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url!, true);
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (parsedUrl.pathname === '/api/recipes' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { components, targetItemId, targetItemName, seed, maxRecipes = 20 } = data;
                
                if (!components || components.length === 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'At least 1 component required' }));
                    return;
                }
                
                let finalTargetItemId = targetItemId;
                
                // Handle item name search
                if (targetItemName && !targetItemId) {
                    const foundId = itemNameToId.get(targetItemName.toLowerCase());
                    if (foundId) {
                        finalTargetItemId = foundId;
                    } else {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Item not found: ' + targetItemName }));
                        return;
                    }
                }
                
                if (!finalTargetItemId) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Target item ID or name required' }));
                    return;
                }
                
                // Generate recipes for specific target item
                const recipes = generateRecipesForItem(components, finalTargetItemId, maxRecipes, seed);
                const itemInfo = itemDatabase.get(finalTargetItemId);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    targetItemId: finalTargetItemId,
                    targetItemName: itemInfo?.name || 'Unknown Item',
                    recipes: recipes,
                    totalFound: recipes.length
                }));
                
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
    } else if (parsedUrl.pathname === '/api/components' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            components: COMPONENT_NAMES.map((name, index) => ({
                id: index,
                name: name,
                weight: COMPONENT_WEIGHTS[index]
            }))
        }));
    } else if (parsedUrl.pathname === '/api/items' && req.method === 'GET') {
        const query = parsedUrl.query.q as string;
        let items = Array.from(itemDatabase.values());
        
        if (query) {
            items = items.filter(item => 
                item.name.toLowerCase().includes(query.toLowerCase()) ||
                item.id.toString().includes(query)
            );
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            items: items.slice(0, 50) // Limit to 50 results
        }));
    } else if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html') {
        // Serve the HTML file
        fs.readFile('index.html', (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

function generateRecipesForItem(components: number[], targetItemId: number, maxRecipes: number, seed?: number | string) {
    const recipes: any[] = [];
    const seenRecipes = new Set<string>();
    
    // If we have less than 8 components, pad with the first component to make 8
    let paddedComponents = [...components];
    while (paddedComponents.length < 8) {
        paddedComponents.push(components[0]);
    }
    
    console.log(`Searching for Item ${targetItemId} with components: [${paddedComponents.join(', ')}]`);
    if (seed) {
        console.log(`Using seed: ${seed} (type: ${typeof seed})`);
    }
    
    // Generate combinations more efficiently
    const maxCombinations = Math.min(10000, Math.pow(paddedComponents.length, 8)); // Limit to prevent browser freeze
    let checked = 0;
    
    function generateCombinationsRecursive(current: number[], depth: number) {
        if (recipes.length >= maxRecipes || checked >= maxCombinations) {
            return;
        }
        
        if (depth === 8) {
            checked++;
            
            try {
                // Create a unique key for this combination (sorted)
                const sortedCombo = [...current].sort((a, b) => a - b);
                const recipeKey = sortedCombo.join(',');
                
                // Skip if we've already seen this exact combination
                if (seenRecipes.has(recipeKey)) {
                    return;
                }
                seenRecipes.add(recipeKey);
                
                const itemId = bc.calculate([...current], seed);
                
                if (itemId === targetItemId) {
                    const weight = generator.calculateWeight(current);
                    const qualityRange = generator.getQualityRange(weight);
                    const itemQuality = generator.getItemQuality(itemId);
                    
                    recipes.push({
                        components: [...current],
                        weight: weight,
                        qualityRange: qualityRange,
                        itemQuality: itemQuality,
                        formatted: generator.formatRecipe(current)
                    });
                }
            } catch (error) {
                // Skip invalid combinations
            }
            return;
        }
        
        // Generate next component
        for (let i = 0; i < paddedComponents.length; i++) {
            current[depth] = paddedComponents[i];
            generateCombinationsRecursive(current, depth + 1);
        }
    }
    
    generateCombinationsRecursive(new Array(8), 0);
    
    console.log(`Checked ${checked} combinations, found ${recipes.length} recipes`);
    
    // Debug: Test with a simple combination to see if algorithm works at all
    if (recipes.length === 0) {
        console.log('Debug: Testing with simple combination [0,0,0,0,0,0,0,0]...');
        try {
            const testResult = bc.calculate([0,0,0,0,0,0,0,0], seed);
            console.log(`Debug: [0,0,0,0,0,0,0,0] with seed ${seed} gives item ${testResult}`);
        } catch (error) {
            console.log(`Debug: Error with test combination: ${error.message}`);
        }
        
        // Test with your exact components
        console.log('Debug: Testing with your exact components [0,1,5,8,20,0,0,0]...');
        try {
            const testResult2 = bc.calculate([0,1,5,8,20,0,0,0], seed);
            console.log(`Debug: [0,1,5,8,20,0,0,0] with seed ${seed} gives item ${testResult2}`);
        } catch (error) {
            console.log(`Debug: Error with your combination: ${error.message}`);
        }
        
        // Find ALL items that can be crafted with these components
        console.log('Debug: Finding ALL items craftable with these components...');
        const allItems = new Map<number, number>();
        let testCount = 0;
        const maxTest = 1000; // Limit to prevent infinite loop
        
        function testAllCombinations(current: number[], depth: number) {
            if (testCount >= maxTest) return;
            
            if (depth === 8) {
                testCount++;
                try {
                    const itemId = bc.calculate([...current], seed);
                    allItems.set(itemId, (allItems.get(itemId) || 0) + 1);
                } catch (error) {
                    // Skip invalid combinations
                }
                return;
            }
            
            for (let i = 0; i < paddedComponents.length; i++) {
                current[depth] = paddedComponents[i];
                testAllCombinations(current, depth + 1);
            }
        }
        
        testAllCombinations(new Array(8), 0);
        
        console.log(`Debug: Found ${allItems.size} different items in ${testCount} tests:`);
        for (const [itemId, count] of allItems) {
            const itemInfo = itemDatabase.get(itemId);
            console.log(`  Item ${itemId}: ${itemInfo?.name || 'Unknown'} (${count} recipes)`);
        }
        
        // Debug: Check if item 609 is in any pool
        console.log('Debug: Checking if item 609 is in pools...');
        for (let i = 0; i < pools.length; i++) {
            const pool = pools[i];
            const hasItem609 = pool.items.some(item => item.id === 609);
            if (hasItem609) {
                console.log(`  Item 609 found in pool ${i}: ${pool.name}`);
            }
        }
    }
    
    return recipes;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('🔮 Isaac Bag of Crafting Recipe Generator');
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log(`  GET  /api/components - Get all available components`);
    console.log(`  POST /api/recipes   - Generate recipes for specific item`);
    console.log(`  GET  /              - Web interface`);
});