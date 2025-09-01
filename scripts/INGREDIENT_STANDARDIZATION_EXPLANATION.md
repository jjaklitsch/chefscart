# Ingredient Standardization System - Technical Explanation

## Overview
The ingredient standardization system is integrated into the main meal generation script (`generate-meal-data.js`) and ensures consistent, Instacart-compatible ingredient data across all generated meals.

## Core Problem Being Solved
- **Inconsistent AI Output**: GPT-5-mini generates ingredient names with variations ("onion" vs "yellow onion", "salt" vs "kosher salt")
- **Unit Standardization**: Different recipes use different units for the same ingredient (tablespoons vs teaspoons for spices)
- **Category Consistency**: Ensures ingredients are properly categorized for Instacart API compatibility
- **Scale**: 532 meals with 750+ unique ingredients need consistent standardization

## Data Sources

### 1. CSV Analysis Data
**File**: `/Users/jonathanjaklitsch/Downloads/deduped_ingredients_v6.csv`
- **Content**: 750+ deduplicated ingredients from existing 532 meals
- **Key Fields**: `canonical_name`, `unit`, `category`, `count` (usage frequency)
- **Purpose**: Used to identify top 200 most common ingredients for standardization priority

### 2. Integrated Constants (in generate-meal-data.js)
```javascript
// TOP 200 STANDARDIZED INGREDIENTS (ranked by usage frequency)
const STANDARD_INGREDIENTS = [
  // Format: [canonical_name, unit, category]
  ['Garlic', 'head', 'Produce'],                    // 468 uses
  ['Lemons', 'each', 'Produce'],                    // 333 uses  
  ['Yellow Onion', 'each', 'Produce'],              // 170 uses
  // ... 200+ total ingredients
];

// Auto-generated lookup maps
const INGREDIENT_STANDARDS = {};      // canonical_name -> {name, unit, category}
const INGREDIENT_NAME_MAP = {};       // lowercase_variation -> canonical_name
```

### 3. Variation Mapping
```javascript
// Examples of automatic variation handling:
"onion" → "Yellow Onion"
"salt" → "Kosher Salt"  
"pepper" → "Black Pepper"
"garlic" → "Garlic"
"lemon" → "Lemons"
```

## Order of Operations

### Phase 1: System Initialization
1. **Load Constants**: STANDARD_INGREDIENTS array with top 200 ingredients
2. **Build Lookup Maps**: 
   - `INGREDIENT_STANDARDS`: Fast lookup by canonical name
   - `INGREDIENT_NAME_MAP`: Maps variations to canonical names
3. **Prepare AI Context**: Include standardized names in GPT prompt

### Phase 2: Meal Generation Request
```javascript
async function generateMealData(mealName) {
  // 1. Transliterate international characters
  const transliteratedName = transliterate(mealName);
  
  // 2. Build GPT prompt with standardized ingredient guidance
  const prompt = `Generate meal data for: ${transliteratedName}
  
  IMPORTANT: Use these standardized ingredient names when possible:
  ${STANDARD_INGREDIENTS.map(([name]) => name).slice(0, 50).join(', ')}...
  
  [Full prompt with schema requirements]`;
  
  // 3. Call OpenAI API
  const response = await openai.chat.completions.create({...});
```

### Phase 3: Post-Generation Standardization
```javascript
// 4. Parse AI response and apply standardization
const mealData = JSON.parse(aiResponse);

// 5. Standardize each ingredient
if (mealData.ingredients_json?.ingredients) {
  mealData.ingredients_json.ingredients = mealData.ingredients_json.ingredients.map(ingredient => {
    const standardized = standardizeIngredient(ingredient.name);
    
    return {
      ...ingredient,
      name: standardized.name,
      unit: standardized.unit,
      category: standardized.category,
      // Preserve AI-generated fields
      quantity: ingredient.quantity,
      health_filters: ingredient.health_filters,
      brand_filters: ingredient.brand_filters
    };
  });
}
```

### Phase 4: Database Storage
```javascript
// 6. Insert standardized data into Supabase
const { data, error } = await supabase
  .from('meals')
  .insert([mealData]);
```

## Standardization Function Logic

```javascript
function standardizeIngredient(rawName) {
  if (!rawName) return null;
  
  // 1. Normalize input
  const normalized = rawName.toLowerCase().trim();
  
  // 2. Check direct mapping
  if (INGREDIENT_NAME_MAP[normalized]) {
    const canonicalName = INGREDIENT_NAME_MAP[normalized];
    return INGREDIENT_STANDARDS[canonicalName];
  }
  
  // 3. Fallback for unknown ingredients
  return {
    name: toTitleCase(rawName),
    unit: 'each',           // Default unit
    category: 'Gourmet'     // Default category
  };
}
```

## Data Structures Populated

### Input Data Structure (from AI)
```json
{
  "name": "onion",
  "quantity": 1,
  "unit": "medium",
  "category": "vegetables",
  "health_filters": ["ORGANIC"],
  "brand_filters": []
}
```

### Output Data Structure (after standardization)
```json
{
  "name": "Yellow Onion",
  "quantity": 1,
  "unit": "each",
  "category": "Produce",
  "health_filters": ["ORGANIC"],
  "brand_filters": []
}
```

### Complete Meal Data Structure
```json
{
  "meal_name": "Classic Caesar Salad",
  "ingredients_json": {
    "ingredients": [/* standardized ingredients array */],
    "servings": 4
  },
  "prep_time": 15,
  "cook_time": 0,
  "cuisines": ["American"],
  "diets_supported": ["vegetarian"],
  "allergens_present": ["eggs", "dairy"],
  "cooking_difficulty": "easy"
}
```

## Performance Metrics

### Current Standardization Coverage
- **Total Ingredients**: 200+ in standardization library
- **Coverage Rate**: 58% of generated ingredients use standardized names
- **Source Data**: Based on analysis of 750+ ingredients from 532 meals
- **Top Categories**: Produce (35%), Spices/Seasonings (25%), Dairy/Eggs (15%)

### Instacart API Compatibility
- **Required Fields**: ✅ name, quantity, unit, health_filters, brand_filters
- **Category Mapping**: ✅ 16 consolidated categories
- **Health Filters**: ✅ ORGANIC, GLUTEN_FREE, VEGAN, KOSHER, etc.
- **Brand Filters**: ✅ Array format for product matching

## Key Benefits

1. **Consistency**: Eliminates ingredient name variations across meals
2. **Scalability**: Handles 200+ most common ingredients automatically
3. **API Compatibility**: Ensures all output works with Instacart IDP
4. **Fallback Handling**: Unknown ingredients get sensible defaults
5. **Performance**: In-memory lookup maps for fast standardization
6. **Maintainability**: Single source of truth for ingredient standards

## Integration Pattern

The system follows the same pattern as `COOKING_EQUIPMENT`:
- **Constants Defined**: At top of script
- **Lookup Maps Built**: On initialization  
- **Applied Post-Generation**: After AI response parsing
- **No External Dependencies**: Self-contained in main script

## Areas for Potential Improvement

1. **Coverage Expansion**: Could extend beyond top 200 ingredients
2. **Fuzzy Matching**: Handle typos and closer variations
3. **Regional Preferences**: Support different regional ingredient names
4. **Dynamic Learning**: Update standards based on new ingredient patterns
5. **Unit Conversion**: Handle quantity scaling between different units
6. **Seasonal Variations**: Account for seasonal ingredient availability

---

**Testing**: Use `test-integrated-standardization.js` to validate the system performance and coverage metrics.