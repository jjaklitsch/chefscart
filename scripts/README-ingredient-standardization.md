# AI-Powered Ingredient Standardization

This directory contains tools for intelligently standardizing ingredient names using AI analysis with meal recipe context.

## Problem Solved

The previous ingredient standardization was over-consolidating items, treating different purchasable products as the same item. For example:
- "Chicken, Chicken (Bone-in), Chicken Stock, Ground Chicken" → consolidated to just "chicken"
- But these are completely different store products: cuts vs liquid stock vs ground form

## Solution Approach

The AI-powered standardization script analyzes ingredients within the context of actual meal recipes to make intelligent consolidation decisions:

### ✅ **Smart Consolidations** (same purchasable item):
- `["Fresh Basil", "Basil"]` → `"Fresh Basil"`
- `["Bell Pepper", "Red Bell Pepper", "Green Bell Pepper"]` → `"Bell Pepper"`
- `["Ground Cumin", "Cumin"]` → `"Ground Cumin"`

### ❌ **Smart Separations** (different purchasable items):
- `["Chicken Breast", "Chicken Thighs", "Chicken Stock"]` → Keep separate
- `["Fresh Oregano", "Dried Oregano"]` → Keep separate  
- `["Olive Oil", "Extra Virgin Olive Oil"]` → Keep separate

## Files

### Core Script
- **`ai-ingredient-standardization.js`** - Main analysis script using OpenAI GPT-4o-mini

### Generated Reports
Reports are timestamped with format: `ingredient-*-YYYY-MM-DDTHH-mm-ss-sssZ.*`

- **`ingredient-standardization-summary-*.json`** - Complete analysis results in JSON format
- **`ingredient-mapping-*.json`** - Mapping file for database implementation  
- **`ingredient-standardization-report-*.md`** - Human-readable analysis report

## How It Works

1. **Fetch meal data** from Supabase (532+ curated meals)
2. **Extract ingredients** with meal context (title, cuisine, cooking notes)
3. **Group by similarity** using base word analysis
4. **AI analysis** of each group with meal context using OpenAI
5. **Generate reports** with consolidation decisions and reasoning

### AI Analysis Criteria

The AI considers:
- **Different cuts of meat** (breast vs thigh vs whole) → Keep separate
- **Different forms** (ground vs whole vs liquid) → Keep separate  
- **Different preparations** requiring different products → Keep separate
- **Cooking method requirements** (some recipes need specific cuts) → Keep separate
- **Same base product variants** (brand names, minor naming differences) → Consolidate

## Usage

```bash
# Run full analysis (takes 30-60 minutes due to API rate limiting)
node scripts/ai-ingredient-standardization.js

# Check progress of background process
ps aux | grep ai-ingredient-standardization
```

## Implementation

Use the generated `ingredient-mapping-*.json` file to update your database:

```javascript
// Example usage of mapping file
const mapping = require('./ingredient-mapping-2025-08-27T23-XX-XX-XXXZ.json');

// Find ingredients that need updating
const changedIngredients = mapping.filter(item => item.changed);

// Update database with new standardized names
for (const ingredient of changedIngredients) {
  await updateIngredientName(
    ingredient.original_name, 
    ingredient.standardized_name
  );
}
```

## Key Features

- **Context-aware analysis** - Uses actual meal recipes to inform decisions
- **Rate limiting** - Prevents API overload with 500ms delays between requests
- **Error handling** - Graceful fallback when AI analysis fails
- **Comprehensive reporting** - Multiple output formats for different use cases
- **Usage tracking** - Shows which ingredients are used most frequently

## Example AI Decisions

### ✅ Good Consolidations
```
"Bell Pepper" ← ["Red Bell Pepper", "Bell Pepper", "Green Bell Pepper", "Yellow Bell Pepper"]
Reasoning: All color variations of bell peppers are the same base vegetable product
```

### ❌ Smart Separations  
```
["Olive Oil", "Extra Virgin Olive Oil"] → Keep Separate
Reasoning: Different products with different flavor profiles and culinary uses
```

## Performance

- **Analysis time**: ~30-60 minutes for full dataset (126 ingredient groups)
- **API usage**: ~126 OpenAI requests with rate limiting
- **Memory usage**: Minimal, processes data in batches
- **Success rate**: High accuracy with fallback error handling

## Future Enhancements

- **Batch processing** for larger datasets
- **Human review interface** for AI decisions
- **Integration with database migration tools**
- **Cost optimization** with prompt caching