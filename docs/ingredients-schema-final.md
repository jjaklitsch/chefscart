# Final Ingredients Schema for ChefsCart

## Overview
A schema that preserves original recipe ingredient details while enabling shopping list aggregation and intelligent quantity scaling.

## Core Schema: `ingredients_json`

```json
{
  "servings": 4,
  "ingredients": [
    {
      "display_name": "large prawns (raw, peeled, deveined, tails on)",
      "shoppable_name": "large prawns",
      "quantity": 1,
      "unit": "lb",
      "category": "fish",
      "scale_type": "linear",
      "optional": false
    },
    {
      "display_name": "granulated sugar or brown sugar", 
      "shoppable_name": "granulated sugar",
      "quantity": 1,
      "unit": "tbsp",
      "category": "pantry_dry",
      "scale_type": "linear",
      "optional": false
    },
    {
      "display_name": "brown sugar (for marinade)",
      "shoppable_name": "brown sugar", 
      "quantity": 1,
      "unit": "tsp",
      "category": "pantry_dry",
      "scale_type": "linear",
      "optional": false
    },
    {
      "display_name": "kosher salt",
      "shoppable_name": "kosher salt",
      "quantity": 1,
      "unit": "tsp", 
      "category": "spice",
      "scale_type": "fixed",
      "optional": false
    }
  ]
}
```

## Field Definitions

### Essential Fields
- **`display_name`**: Original recipe text exactly as written (preserves all details)
- **`shoppable_name`**: Normalized name for aggregation and shopping ("large prawns", "olive oil")
- **`quantity`**: Numeric amount in the recipe
- **`unit`**: Measurement unit ("lb", "cup", "tbsp", "clove", etc.)
- **`category`**: Shopping category (drives purchasing logic)
- **`optional`**: Can be omitted from recipe

### Scaling Field
- **`scale_type`**: How ingredient scales with servings
  - `"linear"`: Scales proportionally (most ingredients)
  - `"fixed"`: Doesn't scale (salt, spices often stay same)
  - `"sqrt"`: Scales by square root (some seasonings)

## Scaling & Aggregation Logic

### Step 1: Scale Within a Meal
```javascript
function scaleIngredient(ingredient, originalServings, targetServings) {
  const multiplier = targetServings / originalServings;
  
  switch(ingredient.scale_type) {
    case 'linear':
      return ingredient.quantity * multiplier;
    case 'fixed':
      return ingredient.quantity;
    case 'sqrt':
      return ingredient.quantity * Math.sqrt(multiplier);
  }
}
```

### Step 2: Aggregate Across Meals
```javascript
// Group by shoppable_name across all selected meals
const aggregated = meals.reduce((acc, meal) => {
  meal.ingredients.forEach(ing => {
    const key = `${ing.shoppable_name}_${ing.unit}`;
    if (!acc[key]) {
      acc[key] = {
        shoppable_name: ing.shoppable_name,
        total_quantity: 0,
        unit: ing.unit,
        category: ing.category,
        from_meals: []
      };
    }
    acc[key].total_quantity += scaleIngredient(ing, meal.servings, targetServings);
    acc[key].from_meals.push(meal.title);
  });
  return acc;
}, {});
```

### Step 3: Convert to Shopping Quantities
```javascript
// Shopping conversion rules by category
const SHOPPING_RULES = {
  fish: {
    units: { lb: 1 },
    minimum: 0.5,
    round_to: 0.25,
    package_unit: 'lb'
  },
  oil: {
    units: { 
      tbsp: 1/32,  // 32 tbsp per bottle (16 oz)
      cup: 2,       // 2 cups per bottle
    },
    minimum: 1,
    round_to: 1,
    package_unit: 'bottle'
  },
  produce_count: {
    units: { each: 1, clove: 1/10 }, // ~10 cloves per garlic head
    minimum: 1,
    round_to: 1,
    package_unit: 'count'
  },
  spice: {
    units: { any: 1 }, // Always buy 1 jar
    minimum: 1,
    round_to: 1,
    package_unit: 'jar'
  }
};

function convertToShoppingQuantity(aggregatedIngredient) {
  const rules = SHOPPING_RULES[aggregatedIngredient.category];
  
  // Convert recipe units to shopping units
  let shoppingQuantity = aggregatedIngredient.total_quantity;
  
  if (rules.units[aggregatedIngredient.unit]) {
    shoppingQuantity *= rules.units[aggregatedIngredient.unit];
  }
  
  // Apply minimum and rounding
  shoppingQuantity = Math.max(rules.minimum, shoppingQuantity);
  shoppingQuantity = Math.ceil(shoppingQuantity / rules.round_to) * rules.round_to;
  
  return {
    quantity: shoppingQuantity,
    unit: rules.package_unit
  };
}
```

## Example: Multi-Meal Aggregation

### Input: 3 Meals Selected
**Meal 1: Coconut Rice (4 servings → scale to 6)**
- large prawns: 1 lb → 1.5 lb
- vegetable oil: 2 tbsp → 3 tbsp

**Meal 2: Stir Fry (2 servings → scale to 6)**  
- large prawns: 0.5 lb → 1.5 lb
- vegetable oil: 3 tbsp → 9 tbsp

**Meal 3: Salad (4 servings → scale to 4)**
- vegetable oil: 4 tbsp → 4 tbsp

### Aggregation Result
- **large prawns**: 1.5 + 1.5 = 3 lb total
- **vegetable oil**: 3 + 9 + 4 = 16 tbsp total

### Shopping List Output
- **large prawns**: 3 lb (buy 3 lb)
- **vegetable oil**: 1 bottle (16 tbsp = 0.5 bottle → buy 1 bottle)

## Benefits of This Schema

✅ **Preserves Recipe Integrity**: Display names stay exactly as written  
✅ **Enables Smart Aggregation**: Shoppable names allow grouping  
✅ **Flexible Scaling**: Different scale types for different ingredients  
✅ **Shopping-Ready**: Category-based rules convert to purchasable quantities  
✅ **No Information Loss**: Keep granulated sugar and brown sugar separate  

## Database Implications

### No Need for Separate Tables
- Everything lives in `meals.ingredients_json`
- Shoppable names are consistent across meals
- Categories drive shopping conversion rules

### Search & Filter Capabilities
```sql
-- Find all meals with prawns
SELECT * FROM meals 
WHERE ingredients_json::text ILIKE '%"shoppable_name":"large prawns"%'

-- Get all seafood ingredients
SELECT * FROM meals
WHERE ingredients_json::text ILIKE '%"category":"fish"%'
```

### Future Enhancements
Could add optional fields later:
- `brand_preference`: Preferred brand for shopping
- `freshness_priority`: How fresh item needs to be (1-5)
- `substitutes`: Array of acceptable substitutions
- `storage_days`: How long item keeps

This schema provides the perfect balance of preserving recipe authenticity while enabling sophisticated shopping list generation!