#!/usr/bin/env node

/**
 * Parallel Comprehensive Meal Data Migration with GPT-5-mini
 * Processes multiple meals concurrently to dramatically reduce total time
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

// Initialize clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// PRESET VALIDATION LISTS (from original generation script)
const VALID_CUISINES = [
  'american', 'caribbean', 'chinese', 'french', 'indian', 'italian', 
  'japanese', 'korean', 'mediterranean', 'mexican', 'southern', 'thai', 'vietnamese'
];

const VALID_DIETS = [
  'keto', 'low-carb', 'mediterranean', 'paleo', 'pescatarian', 'plant-forward', 
  'vegan', 'vegetarian', 'whole30', 'kosher'
];

const VALID_ALLERGENS = [
  'dairy', 'egg', 'gluten', 'grain', 'peanut', 'seafood', 'sesame', 
  'shellfish', 'soy', 'sulfite', 'tree_nut', 'wheat'
];

const COOKING_EQUIPMENT = [
  'skillet', 'pot', 'baking sheet', 'oven', 'stove', 'mixing bowl', 'whisk', 
  'spatula', 'knife', 'cutting board', 'measuring cups', 'measuring spoons',
  'dutch oven', 'sauce pan', 'frying pan', 'grill', 'blender', 'food processor',
  'rice cooker', 'slow cooker', 'pressure cooker', 'stand mixer', 'hand mixer',
  'colander', 'strainer', 'tongs', 'ladle', 'wooden spoon', 'sheet pan',
  'casserole dish', 'roasting pan', 'stockpot', 'wok', 'griddle', 'steamer'
];

const INSTACART_UNITS = [
  // Volume
  'cups', 'fl oz', 'gallons', 'ml', 'liters', 'pints', 'quarts', 'tablespoons', 'teaspoons',
  // Weight  
  'grams', 'kilograms', 'pounds', 'ounces',
  // Count
  'bunch', 'can', 'each', 'ears', 'head', 'large', 'medium', 'package', 'packet', 'small'
];

async function comprehensiveMealAnalysis(meal) {
  const systemPrompt = `You are an expert culinary analyst performing comprehensive meal data validation and enhancement using advanced reasoning.

ANALYSIS SCOPE - Fix ALL components systematically:

1. CUISINES: Verify against valid list: ${VALID_CUISINES.join(', ')}
2. DIETS: Strict adherence validation: ${VALID_DIETS.join(', ')}
3. ALLERGENS: Complete identification: ${VALID_ALLERGENS.join(', ')}
4. COOKING EQUIPMENT: Select from: ${COOKING_EQUIPMENT.join(', ')}
5. ORGANIC AVAILABILITY: Realistic per-ingredient assessment
6. INGREDIENTS: Dual quantity system (shopping vs cooking)
7. COOKING INSTRUCTIONS: Dynamic placeholders with precise amounts

CRITICAL REQUIREMENTS:
- All quantities calculated for the DEFAULT serving size (${meal.servings_default} servings)
- MAINTAIN INSTACART API COMPATIBILITY:
  * Keep 'quantity' and 'unit' fields for Instacart API calls
  * Use only Instacart-compatible units: ${INSTACART_UNITS.join(', ')}
  * Preserve category for aisle/department navigation
  * Maintain brand_filters for product selection
- ADD COOKING QUANTITIES:
  * cooking_quantity: What recipe actually uses (may be less than purchased)
  * cooking_unit: Kitchen measurements (teaspoons, tablespoons, cloves, etc.)
- Shopping quantities: What to buy (packages, bottles, pounds) 
- Instructions must use {ingredient_name} placeholders for dynamic scaling
- Identify missing ingredients (salt, oil, water, etc.)
- Precise cooking measurements in standard kitchen units

DUAL QUANTITY LOGIC:
- Shopping: "1 package butter" (what you buy from store)
- Cooking: "2 tablespoons butter" (what recipe uses)
- Some ingredients use all purchased (1.5 lb fish = use all 1.5 lb)
- Others use partial (buy 1 lb flour, use 1 cup)

Return comprehensive analysis with detailed reasoning for every decision in JSON format.`;

  const userPrompt = `Perform comprehensive analysis and correction for this meal:

MEAL: "${meal.title}"
DEFAULT SERVINGS: ${meal.servings_default} (range: ${meal.servings_min}-${meal.servings_max})

CURRENT DATA:
Cuisines: [${(meal.cuisines || []).join(', ')}]
Diets: [${(meal.diets_supported || []).join(', ')}]  
Allergens: [${(meal.allergens_present || []).join(', ')}]
Equipment: [${(meal.cooking_equipment || []).join(', ')}]

INGREDIENTS:
${meal.ingredients_json?.map(ing => `- ${ing.name}: ${ing.quantity} ${ing.unit} (${ing.category}) [organic: ${ing.organic_supported}]`).join('\n') || 'No ingredients listed'}

INSTRUCTIONS:
${meal.instructions_json?.steps?.map(step => `${step.step}. ${step.instruction} (${step.time_minutes}min)`).join('\n') || 'No instructions listed'}

ANALYZE AND RETURN JSON:
{
  "reasoning": {
    "cuisine_analysis": "Detailed reasoning for cuisine classifications",
    "diet_analysis": "Reasoning for diet adherence validation", 
    "allergen_analysis": "Complete allergen identification reasoning",
    "equipment_analysis": "Cooking equipment selection reasoning",
    "ingredient_analysis": "Shopping vs cooking quantity analysis for each ingredient",
    "instruction_analysis": "Dynamic placeholder and precision improvements needed"
  },
  "corrected_cuisines": ["array of valid cuisines"],
  "corrected_diets": ["array of strictly valid diets"],
  "corrected_allergens": ["array of all present allergens"],
  "corrected_equipment": ["array of required cooking equipment"],
  "enhanced_ingredients": [
    {
      "name": "ingredient name",
      "quantity": number,              // INSTACART API: shopping quantity
      "unit": "instacart unit",        // INSTACART API: compatible unit
      "shopping_quantity": number,      // Same as quantity (for clarity)
      "shopping_unit": "instacart unit", // Same as unit (for clarity)
      "cooking_quantity": number,       // Recipe display: what to use
      "cooking_unit": "kitchen unit",   // Recipe display: cooking measurement
      "category": "category",           // INSTACART API: aisle/category
      "organic_supported": boolean,     // INSTACART API: organic filter
      "scales_with_servings": boolean,  // Frontend: scaling logic
      "brand_filters": ["brand1", "brand2"], // INSTACART API: brand preferences
      "instacart_product_id": null,     // Future: direct product mapping
      "instacart_search_term": "search override" // Optional: custom search term
    }
  ],
  "missing_ingredients": ["ingredients referenced but not listed"],
  "enhanced_instructions": [
    {
      "step": number,
      "instruction": "instruction with {ingredient_name} placeholders",
      "time_minutes": number,
      "dynamic_ingredients": ["list of ingredients referenced in this step"]
    }
  ],
  "overall_assessment": "Summary of all corrections made"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    });

    const analysis = JSON.parse(completion.choices[0].message.content);
    
    return {
      mealId: meal.id,
      title: meal.title,
      servings: meal.servings_default,
      analysis
    };

  } catch (error) {
    console.error(`❌ Error analyzing meal ${meal.id}:`, error.message);
    return {
      mealId: meal.id,
      title: meal.title,
      error: error.message
    };
  }
}

async function updateMealWithEnhancements(mealId, analysis) {
  try {
    const updates = {
      cuisines: analysis.corrected_cuisines,
      diets_supported: analysis.corrected_diets,
      allergens_present: analysis.corrected_allergens,
      cooking_equipment: analysis.corrected_equipment,
      ingredients_json: analysis.enhanced_ingredients,
      instructions_json: {
        prep_time: analysis.enhanced_instructions.filter(s => s.step <= 3).reduce((sum, s) => sum + s.time_minutes, 0),
        cook_time: analysis.enhanced_instructions.filter(s => s.step > 3).reduce((sum, s) => sum + s.time_minutes, 0),
        total_time: analysis.enhanced_instructions.reduce((sum, s) => sum + s.time_minutes, 0),
        steps: analysis.enhanced_instructions
      }
    };

    const { error } = await supabase
      .from('meals')
      .update(updates)
      .eq('id', mealId);
      
    if (error) {
      console.error(`❌ Error updating meal ${mealId}:`, error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error updating meal ${mealId}:`, error.message);
    return false;
  }
}

async function processMealsBatch(meals, batchNumber, testMode = false) {
  const results = await Promise.all(
    meals.map(async (meal, index) => {
      try {
        console.log(`🔍 [Batch ${batchNumber}] Analyzing meal ${meal.id}: "${meal.title}"`);
        
        const result = await comprehensiveMealAnalysis(meal);
        
        if (result.error) {
          console.log(`❌ [Batch ${batchNumber}] Analysis failed for meal ${meal.id}: ${result.error}`);
          return { success: false, mealId: meal.id, error: result.error };
        }

        const { analysis } = result;
        
        // Display brief summary
        console.log(`✨ [Batch ${batchNumber}] Enhanced ingredients (${analysis.enhanced_ingredients?.length || 0}), missing: ${analysis.missing_ingredients?.length || 0}`);

        if (!testMode) {
          const updated = await updateMealWithEnhancements(meal.id, analysis);
          if (updated) {
            console.log(`✅ [Batch ${batchNumber}] Enhanced meal ${meal.id} in database`);
            return { success: true, mealId: meal.id };
          } else {
            return { success: false, mealId: meal.id, error: 'Database update failed' };
          }
        } else {
          console.log(`🧪 [Batch ${batchNumber}] TEST MODE: Would enhance meal ${meal.id}`);
          return { success: true, mealId: meal.id };
        }
      } catch (error) {
        console.error(`❌ [Batch ${batchNumber}] Error processing meal ${meal.id}:`, error.message);
        return { success: false, mealId: meal.id, error: error.message };
      }
    })
  );

  return results;
}

async function getAllMealsForMigration(limit = null) {
  console.log('📊 Fetching meals for parallel migration...');
  
  let query = supabase
    .from('meals')
    .select('id, title, servings_default, servings_min, servings_max, cuisines, diets_supported, allergens_present, cooking_equipment, ingredients_json, instructions_json')
    .order('id');
    
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }
  
  console.log(`✅ Loaded ${data.length} meals for parallel migration`);
  return data;
}

async function processMealsParallel(testMode = false, limit = null, concurrency = 8) {
  const allMeals = await getAllMealsForMigration(limit);
  
  let processedCount = 0;
  let enhancedCount = 0;
  let errorCount = 0;

  console.log(`\n🚀 Starting PARALLEL meal migration with GPT-5-mini...`);
  console.log(`📝 Processing ${allMeals.length} meals with ${concurrency} concurrent workers in ${testMode ? 'TEST' : 'PRODUCTION'} mode\n`);

  // Split meals into batches for parallel processing
  const batches = [];
  for (let i = 0; i < allMeals.length; i += concurrency) {
    batches.push(allMeals.slice(i, i + concurrency));
  }

  const startTime = Date.now();

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    console.log(`\n📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} meals)`);
    
    const batchResults = await processMealsBatch(batch, batchIndex + 1, testMode);
    
    // Update counters
    for (const result of batchResults) {
      processedCount++;
      if (result.success) {
        enhancedCount++;
      } else {
        errorCount++;
      }
    }
    
    // Progress indicator
    const elapsed = Date.now() - startTime;
    const avgTimePerMeal = elapsed / processedCount;
    const remainingMeals = allMeals.length - processedCount;
    const estimatedRemainingTime = (remainingMeals * avgTimePerMeal) / (concurrency * 1000 / 60); // minutes
    
    console.log(`📊 Batch ${batchIndex + 1} complete: ${processedCount}/${allMeals.length} meals (${((processedCount/allMeals.length)*100).toFixed(1)}%)`);
    console.log(`⏱️  Average: ${(avgTimePerMeal/1000).toFixed(1)}s/meal, Estimated remaining: ${estimatedRemainingTime.toFixed(1)} minutes`);
    
    // Brief pause between batches to manage rate limits
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 PARALLEL MEAL MIGRATION SUMMARY (GPT-5-MINI)');
  console.log('='.repeat(70));
  console.log(`📝 Total meals processed: ${processedCount}`);
  console.log(`✨ Meals enhanced: ${enhancedCount}`);
  console.log(`❌ Errors encountered: ${errorCount}`);
  console.log(`✅ Success rate: ${((processedCount - errorCount) / processedCount * 100).toFixed(1)}%`);
  console.log(`⏱️  Total time: ${((Date.now() - startTime) / 1000 / 60).toFixed(1)} minutes`);
  console.log(`🚀 Speed improvement: ${concurrency}x parallel processing`);

  return {
    processed: processedCount,
    enhanced: enhancedCount,
    errors: errorCount,
    totalTimeMinutes: (Date.now() - startTime) / 1000 / 60
  };
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const testMode = args.includes('--test') || args.includes('-t');
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
  const concurrencyArg = args.find(arg => arg.startsWith('--concurrency='));
  const concurrency = concurrencyArg ? parseInt(concurrencyArg.split('=')[1]) : 8;

  console.log('🍳 ChefsCart PARALLEL Comprehensive Meal Migration');
  console.log('   Using GPT-5-mini for complete meal data enhancement with parallel processing');
  console.log('');

  if (testMode) {
    console.log('🧪 TEST MODE: Will analyze meals but not update database');
  }

  if (limit) {
    console.log(`📊 LIMIT: Processing only ${limit} meals`);
  }

  console.log(`🔄 CONCURRENCY: ${concurrency} parallel workers`);
  console.log('');

  try {
    await processMealsParallel(testMode, limit, concurrency);
    console.log('\n🎉 Parallel meal migration completed!');
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}