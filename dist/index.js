"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const BagOfCrafting_1 = require("./BagOfCrafting");
const XmlParser_1 = require("./XmlParser");
const http = __importStar(require("http"));
const url = __importStar(require("url"));
let pools = XmlParser_1.XmlParser.loadPools(fs.readFileSync('assets/itempools.xml', 'utf8'));
let meta = XmlParser_1.XmlParser.loadMeta(fs.readFileSync('assets/items_metadata.xml', 'utf8'));
let bc = new BagOfCrafting_1.BagOfCrafting(pools, meta);
// Component names for better readability (Isaac Bag of Crafting component IDs)
const COMPONENT_NAMES = [
    'Red Heart',
    'Soul Heart',
    'Black Heart',
    'Eternal Heart',
    'Gold Heart',
    'Bone Heart',
    'Rotten Heart',
    'Penny',
    'Nickel',
    'Dime',
    'Lucky Penny',
    'Key',
    'Golden Key',
    'Charged Key',
    'Bomb',
    'Golden Bomb',
    'Giga Bomb',
    'Micro Battery',
    'Mega Battery',
    'Card',
    'Pill',
    'Rune',
    'Dice Shard',
    'Cracked Key',
    'Gold Penny',
    'Golden Penny' // 25
];
// Item database for names and search
let itemDatabase = new Map();
let itemNameToId = new Map();
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
    }
    catch (error) {
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
    constructor(bagOfCrafting, itemQualities) {
        this.bagOfCrafting = bagOfCrafting;
        this.itemQualities = itemQualities;
    }
    // Generate all possible recipes for given components
    generateRecipes(availableComponents, maxRecipesPerItem = 20) {
        const recipes = new Map();
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
                if (recipes.get(itemId).length < maxRecipesPerItem) {
                    recipes.get(itemId).push([...combination]);
                }
            }
            catch (error) {
                // Skip invalid combinations
                continue;
            }
        }
        return recipes;
    }
    // Generate all combinations of r elements from array (with repetition)
    generateCombinations(arr, r) {
        const combinations = [];
        function backtrack(start, current) {
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
    generateUniqueCombinations(arr, r) {
        const combinations = [];
        const seen = new Set();
        function backtrack(start, current) {
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
    calculateWeight(components) {
        return components.reduce((sum, comp) => sum + COMPONENT_WEIGHTS[comp], 0);
    }
    // Get quality range for weight
    getQualityRange(weight) {
        for (const threshold of QUALITY_THRESHOLDS) {
            if (weight <= threshold.weight) {
                return { min: threshold.min, max: threshold.max };
            }
        }
        return { min: 4, max: 4 };
    }
    // Format recipe for display
    formatRecipe(components) {
        return components.map(comp => COMPONENT_NAMES[comp]).join(', ');
    }
    // Get item quality
    getItemQuality(itemId) {
        return this.itemQualities.get(itemId) || 0;
    }
}
// Load item database
loadItemDatabase();
// Web server setup
const generator = new RecipeGenerator(bc, meta);
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
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
                    }
                    else {
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
                    targetItemName: (itemInfo === null || itemInfo === void 0 ? void 0 : itemInfo.name) || 'Unknown Item',
                    recipes: recipes,
                    totalFound: recipes.length
                }));
            }
            catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
    }
    else if (parsedUrl.pathname === '/api/components' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            components: COMPONENT_NAMES.map((name, index) => ({
                id: index,
                name: name,
                weight: COMPONENT_WEIGHTS[index]
            }))
        }));
    }
    else if (parsedUrl.pathname === '/api/items' && req.method === 'GET') {
        const query = parsedUrl.query.q;
        let items = Array.from(itemDatabase.values());
        if (query) {
            items = items.filter(item => item.name.toLowerCase().includes(query.toLowerCase()) ||
                item.id.toString().includes(query));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            items: items.slice(0, 50) // Limit to 50 results
        }));
    }
    else if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html') {
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
    }
    else {
        res.writeHead(404);
        res.end('Not found');
    }
});
function generateRecipesForItem(components, targetItemId, maxRecipes, seed) {
    const recipes = [];
    const seenRecipes = new Set();
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
    function generateCombinationsRecursive(current, depth) {
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
            }
            catch (error) {
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
            const testResult = bc.calculate([0, 0, 0, 0, 0, 0, 0, 0], seed);
            console.log(`Debug: [0,0,0,0,0,0,0,0] with seed ${seed} gives item ${testResult}`);
        }
        catch (error) {
            console.log(`Debug: Error with test combination: ${error.message}`);
        }
        // Test with your exact components
        console.log('Debug: Testing with your exact components [0,1,5,8,20,0,0,0]...');
        try {
            const testResult2 = bc.calculate([0, 1, 5, 8, 20, 0, 0, 0], seed);
            console.log(`Debug: [0,1,5,8,20,0,0,0] with seed ${seed} gives item ${testResult2}`);
        }
        catch (error) {
            console.log(`Debug: Error with your combination: ${error.message}`);
        }
        // Find ALL items that can be crafted with these components
        console.log('Debug: Finding ALL items craftable with these components...');
        const allItems = new Map();
        let testCount = 0;
        const maxTest = 1000; // Limit to prevent infinite loop
        function testAllCombinations(current, depth) {
            if (testCount >= maxTest)
                return;
            if (depth === 8) {
                testCount++;
                try {
                    const itemId = bc.calculate([...current], seed);
                    allItems.set(itemId, (allItems.get(itemId) || 0) + 1);
                }
                catch (error) {
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
            console.log(`  Item ${itemId}: ${(itemInfo === null || itemInfo === void 0 ? void 0 : itemInfo.name) || 'Unknown'} (${count} recipes)`);
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
//# sourceMappingURL=index.js.map