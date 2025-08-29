const fs = require('fs');
const path = require('path');

// Read the CSV file
const csvPath = '/Users/jonathanjaklitsch/Downloads/ChefsCart Meals - Sheet4.csv';
const csvContent = fs.readFileSync(csvPath, 'utf8');

// Parse CSV
const lines = csvContent.trim().split('\n');
const header = lines[0].split(',');
const ingredients = lines.slice(1).map(line => {
  const [shoppable_name, remapped, questions] = line.split(',');
  return {
    original: shoppable_name?.trim(),
    remapped: remapped?.trim(),
    questions: questions?.trim()
  };
});

console.log(`📊 Processing ${ingredients.length} ingredients...`);

// Enhanced deduplication and standardization logic
class IngredientStandardizer {
  constructor() {
    // Standard unit mappings for purchasable quantities
    this.purchasableUnits = {
      // Proteins (by weight - typically sold by lb/kg)
      'MEAT': { unit: 'lb', minQuantity: 1, category: 'Meat & Seafood' },
      'FISH': { unit: 'lb', minQuantity: 1, category: 'Meat & Seafood' },
      'POULTRY': { unit: 'lb', minQuantity: 1, category: 'Meat & Seafood' },
      'SEAFOOD': { unit: 'lb', minQuantity: 0.5, category: 'Meat & Seafood' },
      
      // Produce (by count or weight)
      'PRODUCE_COUNT': { unit: 'each', minQuantity: 1, category: 'Produce' },
      'PRODUCE_WEIGHT': { unit: 'lb', minQuantity: 1, category: 'Produce' },
      'PRODUCE_BUNCH': { unit: 'bunch', minQuantity: 1, category: 'Produce' },
      'PRODUCE_BAG': { unit: 'bag', minQuantity: 1, category: 'Produce' },
      
      // Dairy (various units)
      'DAIRY_LIQUID': { unit: 'gallon', minQuantity: 0.5, category: 'Dairy & Eggs' },
      'DAIRY_CHEESE': { unit: 'lb', minQuantity: 0.5, category: 'Dairy & Eggs' },
      'DAIRY_PACKAGE': { unit: 'package', minQuantity: 1, category: 'Dairy & Eggs' },
      
      // Pantry/Packaged goods
      'PANTRY_BOTTLE': { unit: 'bottle', minQuantity: 1, category: 'Pantry Staples' },
      'PANTRY_JAR': { unit: 'jar', minQuantity: 1, category: 'Pantry Staples' },
      'PANTRY_BAG': { unit: 'bag', minQuantity: 1, category: 'Pantry Staples' },
      'PANTRY_BOX': { unit: 'box', minQuantity: 1, category: 'Pantry Staples' },
      'PANTRY_CAN': { unit: 'can', minQuantity: 1, category: 'Canned Goods' },
      
      // Spices & Seasonings
      'SPICE': { unit: 'container', minQuantity: 1, category: 'Spices & Seasonings' },
      
      // Oils & Condiments
      'OIL': { unit: 'bottle', minQuantity: 1, category: 'Oils & Vinegars' },
      'CONDIMENT': { unit: 'bottle', minQuantity: 1, category: 'Condiments' },
    };
    
    // Ingredient classification patterns
    this.classifications = {
      // Proteins
      'beef|steak|ground beef|chuck|brisket|short ribs|oxtail': 'MEAT',
      'pork|bacon|ham|sausage|chorizo|prosciutto|pancetta': 'MEAT',
      'lamb|mutton': 'MEAT',
      'chicken|turkey|duck|poultry': 'POULTRY',
      'salmon|tuna|cod|halibut|mackerel|sardines|anchovies|fish|shrimp|crab|lobster|scallops|mussels|clams': 'SEAFOOD',
      
      // Produce - by count
      'apple|banana|orange|lemon|lime|avocado|onion|garlic|ginger|bell pepper|jalapeño|tomato|cucumber|zucchini|eggplant|potato|sweet potato': 'PRODUCE_COUNT',
      
      // Produce - by weight/bag
      'spinach|kale|lettuce|arugula|carrots|broccoli|cauliflower|green beans|asparagus|brussels sprouts|mushrooms': 'PRODUCE_BAG',
      
      // Produce - by bunch
      'cilantro|parsley|basil|mint|thyme|rosemary|sage|scallions|green onions': 'PRODUCE_BUNCH',
      
      // Dairy
      'milk|cream|yogurt': 'DAIRY_LIQUID',
      'cheese|cheddar|mozzarella|parmesan|feta|goat cheese|cream cheese': 'DAIRY_CHEESE',
      'eggs|butter': 'DAIRY_PACKAGE',
      
      // Oils & Vinegars
      'oil|vinegar': 'OIL',
      
      // Condiments & Sauces
      'sauce|mustard|ketchup|mayo|sriracha|soy sauce|fish sauce|hot sauce': 'CONDIMENT',
      
      // Spices
      'salt|pepper|paprika|cumin|oregano|basil|thyme|garlic powder|onion powder|chili powder': 'SPICE',
      
      // Canned goods
      'canned|tomato paste|tomato sauce|coconut milk|broth|stock': 'PANTRY_CAN',
      
      // Dry goods
      'flour|rice|pasta|noodles|bread|crackers': 'PANTRY_BAG',
      
      // Jarred items
      'jam|jelly|honey|peanut butter|tahini': 'PANTRY_JAR'
    };
  }
  
  // Normalize ingredient names
  normalizeIngredient(ingredient) {
    if (!ingredient) return '';
    
    let normalized = ingredient.toLowerCase().trim();
    
    // Remove common prefixes/suffixes
    normalized = normalized
      .replace(/^(fresh|dried|frozen|canned|jarred|bottled|ground|whole|chopped|minced|sliced|diced)\s+/g, '')
      .replace(/\s+(fresh|dried|frozen|canned|jarred|bottled|ground|whole|chopped|minced|sliced|diced)$/g, '')
      .replace(/\s+or\s+.*/g, '') // Remove "or" alternatives
      .replace(/\s*\(.*\)\s*/g, '') // Remove parenthetical notes
      .replace(/\s+/g, ' ')
      .trim();
    
    // Standardize plurals
    const singularForms = {
      'apples': 'apple',
      'avocados': 'avocado', 
      'onions': 'onion',
      'tomatoes': 'tomato',
      'potatoes': 'potato',
      'carrots': 'carrot',
      'peppers': 'pepper',
      'bell peppers': 'bell pepper',
      'green bell peppers': 'green bell pepper',
      'yellow bell peppers': 'yellow bell pepper',
      'red bell peppers': 'red bell pepper',
      'mushrooms': 'mushroom',
      'beans': 'bean',
      'peas': 'pea',
      'eggs': 'egg',
      'anchovies': 'anchovy',
      'anchovy fillets': 'anchovy fillet',
      'noodles': 'noodle',
      'cloves': 'clove',
      'garlic cloves': 'garlic clove',
      'leaves': 'leaf',
      'basil leaves': 'basil leaf',
      'mint leaves': 'mint leaf',
      'bay leaves': 'bay leaf'
    };
    
    // Apply singular forms
    for (const [plural, singular] of Object.entries(singularForms)) {
      if (normalized === plural) {
        normalized = singular;
        break;
      }
    }
    
    // Standardize common variations
    const standardizations = {
      // Peppers
      'black pepper': 'black pepper',
      'ground black pepper': 'black pepper',
      'white pepper': 'white pepper',
      'ground white pepper': 'white pepper',
      
      // Fish
      'ahi tuna steak': 'tuna steak',
      'fresh tuna steak': 'tuna steak',
      'tuna steaks': 'tuna steak',
      
      // Flour
      'all-purpose flour': 'flour',
      'all purpose flour': 'flour',
      'ap flour': 'flour',
      
      // Oils
      'extra-virgin olive oil': 'olive oil',
      'extra virgin olive oil': 'olive oil',
      'evoo': 'olive oil',
      
      // Common consolidations
      'yellow onion': 'onion',
      'white onion': 'onion',
      'red onion': 'red onion', // Keep red separate
      'sweet onion': 'onion',
      
      'green bell pepper': 'bell pepper',
      'red bell pepper': 'red bell pepper', // Keep colors for peppers
      'yellow bell pepper': 'yellow bell pepper',
      
      // Vinegars
      'apple cider vinegar': 'apple cider vinegar',
      'apple cider': 'apple cider', // Different product
      
      // Consolidate similar items
      'bacon strips': 'bacon',
      'bacon slices': 'bacon',
      
      'baby spinach': 'spinach',
      'baby arugula': 'arugula',
      'baby bok choy': 'bok choy',
      'baby corn': 'corn',
      'baby potatoes': 'potato',
      
      // Miso consolidation
      'white miso paste': 'white miso',
      'red miso paste': 'red miso',
      'miso paste': 'miso',
      
      // Bread
      'whole-grain bread slices': 'whole grain bread',
      'whole grain bread slices': 'whole grain bread',
      
      // Milk
      'whole milk': 'milk',
      'whole-milk yogurt': 'yogurt',
      
      // Mustard
      'whole grain dijon mustard': 'dijon mustard',
      'dijon mustard': 'dijon mustard',
      'yellow mustard': 'mustard'
    };
    
    return standardizations[normalized] || normalized;
  }
  
  // Classify ingredient for purchasable unit
  classifyIngredient(ingredient) {
    const lower = ingredient.toLowerCase();
    
    for (const [pattern, classification] of Object.entries(this.classifications)) {
      const regex = new RegExp(`\\b(${pattern})\\b`, 'i');
      if (regex.test(lower)) {
        return classification;
      }
    }
    
    // Default classification based on common patterns
    if (lower.includes('powder') || lower.includes('ground') || lower.includes('dried')) {
      return 'SPICE';
    }
    if (lower.includes('sauce') || lower.includes('paste')) {
      return 'CONDIMENT';
    }
    if (lower.includes('oil') || lower.includes('vinegar')) {
      return 'OIL';
    }
    if (lower.includes('flour') || lower.includes('meal')) {
      return 'PANTRY_BAG';
    }
    
    return 'PANTRY_BOTTLE'; // Default fallback
  }
  
  // Get purchasable unit info
  getPurchasableUnit(ingredient) {
    const classification = this.classifyIngredient(ingredient);
    return this.purchasableUnits[classification] || this.purchasableUnits['PANTRY_BOTTLE'];
  }
  
  // Process all ingredients
  processIngredients(ingredients) {
    const processed = new Map();
    const duplicates = new Map();
    
    ingredients.forEach(item => {
      if (!item.original) return;
      
      const normalized = this.normalizeIngredient(item.original);
      const purchasableUnit = this.getPurchasableUnit(normalized);
      
      const entry = {
        standardized_name: normalized,
        original_names: [item.original],
        purchasable_unit: purchasableUnit.unit,
        min_quantity: purchasableUnit.minQuantity,
        category: purchasableUnit.category,
        user_remapped: item.remapped || '',
        questions: item.questions || ''
      };
      
      if (processed.has(normalized)) {
        // Duplicate found - merge
        const existing = processed.get(normalized);
        existing.original_names.push(item.original);
        duplicates.set(item.original, normalized);
      } else {
        processed.set(normalized, entry);
      }
    });
    
    return { processed, duplicates };
  }
}

// Process the ingredients
const standardizer = new IngredientStandardizer();
const { processed, duplicates } = standardizer.processIngredients(ingredients);

console.log(`\n📈 Results:`);
console.log(`   • Original ingredients: ${ingredients.length}`);
console.log(`   • Standardized ingredients: ${processed.size}`);
console.log(`   • Duplicates consolidated: ${duplicates.size}`);

// Create output CSV
const outputHeaders = [
  'standardized_name',
  'original_names',
  'purchasable_unit',
  'min_quantity', 
  'category',
  'user_remapped',
  'questions',
  'consolidation_count'
];

let csvOutput = outputHeaders.join(',') + '\n';

// Sort by standardized name
const sortedEntries = Array.from(processed.values()).sort((a, b) => 
  a.standardized_name.localeCompare(b.standardized_name)
);

sortedEntries.forEach(entry => {
  const row = [
    `"${entry.standardized_name}"`,
    `"${entry.original_names.join('; ')}"`,
    entry.purchasable_unit,
    entry.min_quantity,
    entry.category,
    `"${entry.user_remapped}"`,
    `"${entry.questions}"`,
    entry.original_names.length
  ];
  csvOutput += row.join(',') + '\n';
});

// Write output
const outputPath = 'standardized_ingredients.csv';
fs.writeFileSync(outputPath, csvOutput);

console.log(`\n✅ Standardized ingredients exported to: ${outputPath}`);

// Show top consolidations
console.log('\n🔄 Top consolidations (ingredients with most duplicates):');
const topConsolidations = sortedEntries
  .filter(entry => entry.original_names.length > 1)
  .sort((a, b) => b.original_names.length - a.original_names.length)
  .slice(0, 10);

topConsolidations.forEach(entry => {
  console.log(`   • "${entry.standardized_name}" (${entry.original_names.length} variants)`);
  console.log(`     Originals: ${entry.original_names.join(', ')}`);
});

// Show sample purchasable units by category
console.log('\n🏪 Sample purchasable unit mappings by category:');
const categories = {};
sortedEntries.forEach(entry => {
  if (!categories[entry.category]) {
    categories[entry.category] = [];
  }
  if (categories[entry.category].length < 3) {
    categories[entry.category].push(entry);
  }
});

Object.entries(categories).forEach(([category, entries]) => {
  console.log(`\n   ${category}:`);
  entries.forEach(entry => {
    console.log(`     • ${entry.standardized_name} → ${entry.min_quantity} ${entry.purchasable_unit}(s)`);
  });
});