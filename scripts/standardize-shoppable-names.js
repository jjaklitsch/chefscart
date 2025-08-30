#!/usr/bin/env node

/**
 * Shoppable Name Standardization & Quantity Validation System
 * 
 * Standardizes ingredient naming across all meals and validates quantities/serving sizes
 * Uses GPT-4o-mini with high-level reasoning for consistent, smart decisions
 */

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Configuration
const BATCH_SIZE = 20;
const DRY_RUN = process.argv.includes('--dry-run');

const STANDARDIZATION_PROMPT = `<role>
You are a grocery industry expert and professional chef with deep knowledge of ingredient naming consistency, shopping patterns, and portion standards.
</role>

<task>
Analyze ingredient names across multiple meals to create consistent shoppable names and validate quantities for realistic cooking portions.
</task>

<analysis_framework>
STEP 1: SHOPPABLE NAME STANDARDIZATION
• Review all ingredient variants for consistency
• Apply smart standardization principles:
  - "Fresh Salmon Fillet" vs "Salmon Fillet" vs "Wild Salmon" → standardize to most common/clear
  - "Ahi Tuna Steak" vs "Fresh Tuna Steak" → consider if distinction matters for shopping
  - "Extra Virgin Olive Oil" vs "Olive Oil" → use most common form
  - "Kosher Salt" vs "Salt" → use simpler when appropriate
• Maintain meaningful distinctions:
  - "Ground Beef" vs "Beef Steak" (different cuts)
  - "Fresh Basil" vs "Dried Basil" (different products)
  - "Coconut Milk" vs "Coconut Cream" (different consistency)
• Use Title Case consistently

STEP 2: QUANTITY & PORTION VALIDATION  
• Evaluate realistic cooking quantities for default serving size
• Professional standards:
  - Proteins: 6-8 oz (0.375-0.5 lb) per person
  - Vegetables: 0.5-1 cup per person (or appropriate count)
  - Grains/starches: 0.5-0.75 cup dry per person
  - Seasonings: realistic amounts for dish size
  - Cooking oils: 1-3 tbsp total for dish
• Consider meal context and cooking method
• Ensure quantities make culinary sense
</analysis_framework>

<ingredient_data>
{INGREDIENT_ANALYSIS}
</ingredient_data>

<output_requirements>
Provide standardization recommendations as JSON:

{
  "standardization_analysis": {
    "methodology": "Your systematic approach to standardization decisions",
    "key_principles": ["principle1", "principle2"],
    "challenging_cases": ["case1: reasoning", "case2: reasoning"]
  },
  "shoppable_name_standardizations": [
    {
      "variants_found": ["Ahi Tuna Steak", "Fresh Tuna Steak", "Tuna Fillet"],
      "recommended_standard": "Tuna Steak",
      "reasoning": "Most common form, 'fresh' is implied for fish, 'ahi' too specific for general shopping",
      "meals_affected": 5,
      "preserve_distinctions": false
    }
  ],
  "quantity_validations": [
    {
      "ingredient": "Chicken Breast",
      "current_quantities": ["1 each", "0.75 lb", "8 oz"],
      "recommended_standard": {
        "quantity": 1,
        "unit": "lb",
        "per_servings": 2
      },
      "reasoning": "0.5 lb per person is standard for chicken breast, 'each' is inconsistent sizing",
      "meals_affected": 12
    }
  ],
  "overall_impact": {
    "total_ingredients_reviewed": 50,
    "standardizations_recommended": 15,
    "quantity_fixes_recommended": 8,
    "estimated_improvement": "high/medium/low"
  }
}
</output_requirements>`;

const APPLICATION_PROMPT = `<role>
You are a database specialist applying standardized ingredient naming and quantities to meal data.
</role>

<task>
Apply the approved standardizations to meal ingredient lists, ensuring consistency and proper quantities.
</task>

<standardization_rules>
{STANDARDIZATION_RULES}
</standardization_rules>

<meal_data>
{MEAL_DATA}
</meal_data>

<instructions>
1. Apply all relevant shoppable name standardizations
2. Update quantities based on validation rules
3. Maintain all other ingredient properties unchanged
4. Ensure quantities align with meal's default serving size
5. Keep display_name descriptive, update shoppable_name for shopping
</instructions>

Return ONLY the updated ingredients_json with standardized names and quantities:

{
  "servings": 2,
  "ingredients": [
    {
      "display_name": "boneless skinless chicken breasts",
      "shoppable_name": "Chicken Breast",
      "quantity": 1,
      "unit": "lb", 
      "category": "Meat & Poultry",
      "scale_type": "linear",
      "optional": false
    }
  ]
}`;

async function analyzeIngredientPatterns() {
  console.log('🔍 ANALYZING INGREDIENT PATTERNS');
  console.log('='.repeat(50));

  // Fetch all meals with ingredients
  const { data: meals, error } = await supabase
    .from('meals')
    .select('id, title, servings_default, ingredients_json')
    .not('ingredients_json', 'is', null);

  if (error) {
    console.error('❌ Failed to fetch meals:', error.message);
    return null;
  }

  console.log(`📊 Analyzing ingredients from ${meals.length} meals...\n`);

  // Build ingredient analysis
  const ingredientMap = new Map();
  let totalIngredients = 0;

  meals.forEach(meal => {
    const ingredients = meal.ingredients_json?.ingredients || [];
    totalIngredients += ingredients.length;

    ingredients.forEach(ingredient => {
      const shoppableName = ingredient.shoppable_name;
      const key = shoppableName?.toLowerCase();
      
      if (!key) return;

      if (!ingredientMap.has(key)) {
        ingredientMap.set(key, {
          shoppable_variants: new Set(),
          display_variants: new Set(),
          quantities: new Map(),
          units: new Map(),
          categories: new Set(),
          meal_contexts: [],
          usage_count: 0
        });
      }

      const data = ingredientMap.get(key);
      data.shoppable_variants.add(ingredient.shoppable_name);
      data.display_variants.add(ingredient.display_name || ingredient.shoppable_name);
      
      const qtyKey = `${ingredient.quantity} ${ingredient.unit}`;
      data.quantities.set(qtyKey, (data.quantities.get(qtyKey) || 0) + 1);
      data.units.set(ingredient.unit, (data.units.get(ingredient.unit) || 0) + 1);
      data.categories.add(ingredient.category);
      data.meal_contexts.push({
        meal: meal.title,
        servings: meal.servings_default || 2,
        quantity: ingredient.quantity,
        unit: ingredient.unit
      });
      data.usage_count++;
    });
  });

  // Convert to analysis format
  const ingredientAnalysis = {
    total_meals: meals.length,
    total_ingredients: totalIngredients,
    unique_ingredients: ingredientMap.size,
    patterns: []
  };

  // Find ingredients with multiple variants or quantity issues
  for (const [baseKey, data] of ingredientMap.entries()) {
    if (data.shoppable_variants.size > 1 || data.quantities.size > 2 || data.usage_count >= 3) {
      ingredientAnalysis.patterns.push({
        base_ingredient: baseKey,
        usage_count: data.usage_count,
        shoppable_variants: Array.from(data.shoppable_variants),
        display_variants: Array.from(data.display_variants).slice(0, 5), // Limit for prompt size
        quantity_patterns: Array.from(data.quantities.entries()).slice(0, 5),
        unit_patterns: Array.from(data.units.entries()),
        categories: Array.from(data.categories),
        sample_contexts: data.meal_contexts.slice(0, 3)
      });
    }
  }

  // Sort by usage count for priority
  ingredientAnalysis.patterns.sort((a, b) => b.usage_count - a.usage_count);
  
  // Limit for prompt size
  ingredientAnalysis.patterns = ingredientAnalysis.patterns.slice(0, 50);

  console.log(`📈 Found ${ingredientAnalysis.patterns.length} ingredients with standardization opportunities`);
  console.log(`🎯 Top issues: Multiple naming variants, quantity inconsistencies\n`);

  return ingredientAnalysis;
}

async function generateStandardizationRules(ingredientAnalysis) {
  console.log('🤖 GENERATING STANDARDIZATION RULES\n');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a grocery industry expert creating ingredient standardization rules. Focus on practical shopping consistency while preserving meaningful distinctions. Use systematic reasoning to make smart standardization decisions.'
        },
        {
          role: 'user',
          content: STANDARDIZATION_PROMPT.replace('{INGREDIENT_ANALYSIS}', JSON.stringify(ingredientAnalysis, null, 2))
        }
      ],
      temperature: 0.2,
      max_tokens: 4000
    });

    const content = response.choices[0].message.content;
    
    // Parse JSON from response
    let rules;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      rules = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('❌ Failed to parse standardization rules:', parseError.message);
      console.log('Raw response:', content.substring(0, 500) + '...');
      return null;
    }

    console.log(`✅ Generated ${rules.shoppable_name_standardizations?.length || 0} name standardizations`);
    console.log(`✅ Generated ${rules.quantity_validations?.length || 0} quantity validations\n`);

    return rules;

  } catch (error) {
    console.error('❌ OpenAI error:', error.message);
    return null;
  }
}

async function applyStandardizations(meals, rules) {
  console.log('🔧 APPLYING STANDARDIZATIONS TO MEALS\n');

  const results = {
    processed: 0,
    updated: 0,
    errors: 0,
    changes_made: []
  };

  for (const meal of meals) {
    console.log(`📝 Processing: ${meal.title}`);
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a database specialist applying ingredient standardizations. Be precise and consistent in applying the rules while preserving ingredient authenticity.'
          },
          {
            role: 'user',
            content: APPLICATION_PROMPT
              .replace('{STANDARDIZATION_RULES}', JSON.stringify(rules, null, 2))
              .replace('{MEAL_DATA}', JSON.stringify(meal, null, 2))
          }
        ],
        temperature: 0.1,
        max_tokens: 3000
      });

      const content = response.choices[0].message.content;
      
      // Parse updated ingredients
      let updatedIngredients;
      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : content;
        updatedIngredients = JSON.parse(jsonString);
      } catch (parseError) {
        console.error(`❌ Parse error for ${meal.title}:`, parseError.message);
        results.errors++;
        continue;
      }

      // Check if changes were made
      const originalStr = JSON.stringify(meal.ingredients_json);
      const updatedStr = JSON.stringify(updatedIngredients);
      
      if (originalStr !== updatedStr) {
        // Apply update to database
        if (!DRY_RUN) {
          const { error: updateError } = await supabase
            .from('meals')
            .update({ ingredients_json: updatedIngredients })
            .eq('id', meal.id);

          if (updateError) {
            console.error(`❌ Database error for ${meal.title}:`, updateError.message);
            results.errors++;
            continue;
          }
        }

        results.updated++;
        results.changes_made.push({
          meal: meal.title,
          ingredient_count: updatedIngredients.ingredients?.length || 0
        });
        console.log(`   ✅ ${DRY_RUN ? 'Would update' : 'Updated'} ingredients`);
      } else {
        console.log(`   ✓ No changes needed`);
      }

      results.processed++;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error) {
      console.error(`❌ Error processing ${meal.title}:`, error.message);
      results.errors++;
    }
  }

  return results;
}

async function main() {
  console.log('🏪 SHOPPABLE NAME STANDARDIZATION & QUANTITY VALIDATION');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE UPDATE'}`);
  console.log('='.repeat(60));
  console.log('');

  // Step 1: Analyze ingredient patterns
  const ingredientAnalysis = await analyzeIngredientPatterns();
  if (!ingredientAnalysis) {
    console.error('❌ Failed to analyze ingredients');
    process.exit(1);
  }

  // Step 2: Generate standardization rules
  const standardizationRules = await generateStandardizationRules(ingredientAnalysis);
  if (!standardizationRules) {
    console.error('❌ Failed to generate standardization rules');
    process.exit(1);
  }

  // Save rules for review
  const rulesDir = path.join(__dirname, 'meal-quality-reports');
  if (!fs.existsSync(rulesDir)) {
    fs.mkdirSync(rulesDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rulesFile = path.join(rulesDir, `standardization-rules-${timestamp}.json`);
  fs.writeFileSync(rulesFile, JSON.stringify(standardizationRules, null, 2));
  console.log(`📋 Standardization rules saved: ${path.basename(rulesFile)}\n`);

  // Step 3: Apply standardizations
  const { data: meals, error } = await supabase
    .from('meals')
    .select('id, title, servings_default, ingredients_json')
    .not('ingredients_json', 'is', null);

  if (error) {
    console.error('❌ Failed to fetch meals for updates:', error.message);
    process.exit(1);
  }

  const results = await applyStandardizations(meals, standardizationRules);

  // Generate summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 STANDARDIZATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total meals processed: ${results.processed}`);
  console.log(`Meals updated: ${results.updated}`);
  console.log(`Errors: ${results.errors}`);
  console.log(`Update rate: ${((results.updated/results.processed)*100).toFixed(1)}%`);

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN COMPLETE - No changes were made to the database');
    console.log('To apply standardizations, run without --dry-run flag');
  } else {
    console.log('\n✅ All standardizations have been applied to the database');
  }

  // Save final report
  const finalReport = {
    timestamp: new Date().toISOString(),
    mode: DRY_RUN ? 'dry_run' : 'live',
    ingredient_analysis: ingredientAnalysis,
    standardization_rules: standardizationRules,
    results: results
  };

  const reportFile = path.join(rulesDir, `standardization-report-${timestamp}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(finalReport, null, 2));
  console.log(`\n📄 Complete report saved: ${path.basename(reportFile)}`);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { analyzeIngredientPatterns, generateStandardizationRules, applyStandardizations };