#!/usr/bin/env node

/**
 * Comprehensive Meal Data Migration with GPT-5-mini
 * Systematically analyzes and fixes ALL meal components:
 * - Cuisines, diets, allergens (verification)
 * - Cooking equipment, organic availability  
 * - Ingredients (dual shopping/cooking quantities)
 * - Cooking instructions (dynamic amounts)
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

const COOKING_UNITS = [
  // Precise cooking measurements
  'teaspoons', 'tablespoons', 'cups', 'fl oz', 'ml', 'grams', 'ounces', 'pounds',
  'each', 'cloves', 'sprigs', 'leaves', 'slices', 'pieces'
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

async function getAllMealsForMigration(limit = null) {
  console.log('📊 Fetching meals for comprehensive migration...');
  
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
  
  console.log(`✅ Loaded ${data.length} meals for comprehensive migration`);
  return data;
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
        ...analysis.enhanced_instructions,
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

async function processMealsComprehensively(testMode = false, limit = null) {
  const meals = await getAllMealsForMigration(limit);
  
  let processedCount = 0;
  let enhancedCount = 0;
  let errorCount = 0;

  console.log(`\n🚀 Starting comprehensive meal migration with GPT-5-mini...`);
  console.log(`📝 Processing ${meals.length} meals in ${testMode ? 'TEST' : 'PRODUCTION'} mode\n`);

  for (const meal of meals) {
    console.log(`\n🔍 Analyzing meal ${meal.id}: "${meal.title}"`);
    console.log(`   Servings: ${meal.servings_default} (${meal.servings_min}-${meal.servings_max})`);
    
    const result = await comprehensiveMealAnalysis(meal);
    
    if (result.error) {
      errorCount++;
      console.log(`❌ Analysis failed: ${result.error}`);
      continue;
    }

    const { analysis } = result;
    
    // Display comprehensive analysis
    console.log(`\n🧠 GPT-5-MINI REASONING:`);
    console.log(`├─ CUISINES: ${analysis.reasoning?.cuisine_analysis || 'No reasoning provided'}`);
    console.log(`├─ DIETS: ${analysis.reasoning?.diet_analysis || 'No reasoning provided'}`);
    console.log(`├─ ALLERGENS: ${analysis.reasoning?.allergen_analysis || 'No reasoning provided'}`);
    console.log(`├─ EQUIPMENT: ${analysis.reasoning?.equipment_analysis || 'No reasoning provided'}`);
    console.log(`├─ INGREDIENTS: ${analysis.reasoning?.ingredient_analysis || 'No reasoning provided'}`);
    console.log(`└─ INSTRUCTIONS: ${analysis.reasoning?.instruction_analysis || 'No reasoning provided'}`);

    // Show enhancements
    if (analysis.enhanced_ingredients?.length > 0) {
      console.log(`\n✨ ENHANCED INGREDIENTS (${analysis.enhanced_ingredients.length}):`);
      analysis.enhanced_ingredients.slice(0, 3).forEach(ing => {
        console.log(`   • ${ing.name}: Buy ${ing.shopping_quantity} ${ing.shopping_unit} → Use ${ing.cooking_quantity} ${ing.cooking_unit}`);
      });
      if (analysis.enhanced_ingredients.length > 3) {
        console.log(`   ... and ${analysis.enhanced_ingredients.length - 3} more ingredients`);
      }
    }

    if (analysis.missing_ingredients?.length > 0) {
      console.log(`\n🔍 MISSING INGREDIENTS FOUND:`);
      analysis.missing_ingredients.forEach(ing => console.log(`   • ${ing}`));
    }

    if (!testMode) {
      const updated = await updateMealWithEnhancements(meal.id, analysis);
      if (updated) {
        enhancedCount++;
        console.log(`✅ Enhanced meal ${meal.id} in database`);
      } else {
        errorCount++;
      }
    } else {
      enhancedCount++;
      console.log(`🧪 TEST MODE: Would enhance meal ${meal.id}`);
    }

    processedCount++;
    
    // Progress indicator
    console.log(`\n📊 Progress: ${processedCount}/${meals.length} meals (${((processedCount/meals.length)*100).toFixed(1)}%)`);
    
    // Brief pause to manage rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 COMPREHENSIVE MEAL MIGRATION SUMMARY (GPT-5-MINI)');
  console.log('='.repeat(70));
  console.log(`📝 Total meals processed: ${processedCount}`);
  console.log(`✨ Meals enhanced: ${enhancedCount}`);
  console.log(`❌ Errors encountered: ${errorCount}`);
  console.log(`✅ Success rate: ${((processedCount - errorCount) / processedCount * 100).toFixed(1)}%`);

  return {
    processed: processedCount,
    enhanced: enhancedCount,
    errors: errorCount
  };
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const testMode = args.includes('--test') || args.includes('-t');
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

  console.log('🍳 ChefsCart Comprehensive Meal Migration');
  console.log('   Using GPT-5-mini for complete meal data enhancement');
  console.log('');

  if (testMode) {
    console.log('🧪 TEST MODE: Will analyze meals but not update database');
  }

  if (limit) {
    console.log(`📊 LIMIT: Processing only ${limit} meals`);
  }

  console.log('');

  try {
    await processMealsComprehensively(testMode, limit);
    console.log('\n🎉 Comprehensive meal migration completed!');
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}