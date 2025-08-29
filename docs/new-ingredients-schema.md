# New Normalized ingredients_json Schema

## Overview
Replace the existing messy `ingredients_json` with clean, searchable, shoppable ingredient data generated directly by AI from meal context.

## New ingredients_json Structure

```json
{
  "servings": 4,
  "ingredients": [
    {
      "shoppable_name": "jasmine rice",
      "display_name": "jasmine rice", 
      "quantity": 2,
      "unit": "cup",
      "category": "grain_dry",
      "aliases": ["jasmine rice", "thai jasmine rice"],
      "optional": false,
      "preparation": "rinsed",
      "notes": "or substitute with basmati rice",
      "pantry_item": false,
      "search_keywords": ["rice", "jasmine", "grain", "carb"]
    },
    {
      "shoppable_name": "large shrimp",
      "display_name": "large shrimp (peeled, deveined)", 
      "quantity": 1.5,
      "unit": "lb",
      "category": "fish",
      "aliases": ["shrimp", "prawns", "large shrimp", "jumbo shrimp"],
      "optional": false,
      "preparation": "peeled and deveined",
      "notes": "21-25 count per pound",
      "pantry_item": false,
      "search_keywords": ["shrimp", "seafood", "protein", "prawns"]
    },
    {
      "shoppable_name": "garlic",
      "display_name": "garlic", 
      "quantity": 4,
      "unit": "clove",
      "category": "produce_count",
      "aliases": ["garlic", "fresh garlic", "garlic cloves"],
      "optional": false,
      "preparation": "minced",
      "notes": null,
      "pantry_item": false,
      "search_keywords": ["garlic", "aromatics", "produce"]
    },
    {
      "shoppable_name": "kosher salt",
      "display_name": "kosher salt", 
      "quantity": 1,
      "unit": "tsp",
      "category": "spice",
      "aliases": ["kosher salt", "salt", "table salt"],
      "optional": false,
      "preparation": null,
      "notes": "to taste",
      "pantry_item": true,
      "search_keywords": ["salt", "seasoning", "kosher"]
    }
  ]
}
```

## Field Definitions

### Core Shopping Fields
- **`shoppable_name`**: Normalized name for shopping ("jasmine rice", "large shrimp")
- **`display_name`**: Human-readable name with context ("jasmine rice", "large shrimp (peeled, deveined)")
- **`category`**: Shopping category that drives purchasing logic
- **`aliases`**: Alternative names for flexible searching

### Recipe Fields  
- **`quantity`**: Amount needed for recipe
- **`unit`**: Measurement unit
- **`optional`**: Can be omitted from recipe
- **`preparation`**: How to prep ingredient ("minced", "diced", "peeled")
- **`notes`**: Additional context ("to taste", "or substitute with...")

### Shopping & Search Fields
- **`pantry_item`**: Assume customer has this stocked
- **`search_keywords`**: Terms for ingredient search and matching

## Benefits of This Approach

### ✅ Clean from Day One
- No messy legacy data to clean up
- Consistent naming across all meals
- Searchable and aggregatable immediately

### ✅ Shopping-Ready
- `shoppable_name` goes directly to shopping lists
- `category` drives purchasing logic
- `aliases` enable flexible ingredient matching

### ✅ Rich Context
- AI understands full meal context when generating ingredients
- Quantities are appropriate for the specific recipe
- Preparation methods are captured cleanly

### ✅ Search-Optimized
- `search_keywords` enable powerful ingredient search
- `aliases` catch alternative names
- `category` enables filtering by ingredient type

## Migration Strategy

1. **Update meal generation script** to use new schema
2. **Regenerate existing meals** with clean ingredient data
3. **Update CartBuilder** to use new fields
4. **Remove old canonical_ingredients table** (no longer needed)

## Example Queries Enabled

```javascript
// Find all meals with chicken
meals.filter(meal => 
  meal.ingredients_json.ingredients.some(ing => 
    ing.search_keywords.includes('chicken') || 
    ing.aliases.some(alias => alias.includes('chicken'))
  )
)

// Group ingredients by category for shopping
const ingredientsByCategory = meals
  .flatMap(meal => meal.ingredients_json.ingredients)
  .reduce((acc, ing) => {
    acc[ing.category] = acc[ing.category] || []
    acc[ing.category].push(ing)
    return acc
  }, {})

// Find pantry vs shopping items
const shoppingItems = ingredients.filter(ing => !ing.pantry_item)
const pantryItems = ingredients.filter(ing => ing.pantry_item)
```

This schema gives us clean, searchable, shoppable ingredient data from the start!