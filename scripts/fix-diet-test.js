#!/usr/bin/env node

/**
 * Diet & Cuisine Mapping Fix Script
 * Uses GPT-4o-mini to analyze and correct diet/cuisine classifications
 * for all meals in the database based on ingredients and meal composition.
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

// Valid diet and cuisine options (from the original script)
const VALID_DIETS = [
  'keto', 'low-carb', 'mediterranean', 'paleo', 'pescatarian', 'plant-forward', 
  'vegan', 'vegetarian', 'whole30', 'kosher'
];

const VALID_CUISINES = [
  'american', 'caribbean', 'chinese', 'french', 'indian', 'italian', 
  'japanese', 'korean', 'mediterranean', 'mexican', 'southern', 'thai', 'vietnamese'
];

// Diet definitions for AI reasoning
const DIET_DEFINITIONS = {
  'vegan': 'No animal products whatsoever (no meat, poultry, fish, dairy, eggs, honey)',
  'vegetarian': 'No meat, poultry, or fish, but allows dairy and eggs',
  'pescatarian': 'No meat or poultry, but allows fish, seafood, dairy, and eggs',
  'plant-forward': 'Emphasizes plants but may include small amounts of animal products as flavor enhancers',
  'keto': 'Very low carb (typically <20g net carbs), high fat, moderate protein',
  'low-carb': 'Reduced carbohydrates (typically <100g carbs per day)',
  'paleo': 'No grains, legumes, dairy, refined sugar, or processed foods - only whole foods',
  'whole30': 'No grains, legumes, dairy, sugar, alcohol, or additives for 30 days',
  'mediterranean': 'Emphasizes olive oil, fish, vegetables, whole grains, legumes - traditional Mediterranean diet',
  'kosher': 'Follows Jewish dietary laws (no pork, no shellfish, no mixing meat and dairy)'
};

const CUISINE_INDICATORS = {
  'american': ['burger', 'bbq', 'mac and cheese', 'fried chicken', 'meatloaf', 'apple pie'],
  'caribbean': ['jerk', 'plantain', 'rum', 'scotch bonnet', 'allspice', 'caribbean'],
  'chinese': ['soy sauce', 'ginger', 'garlic', 'wok', 'dim sum', 'szechuan', 'cantonese'],
  'french': ['coq au vin', 'bouillabaisse', 'crème', 'baguette', 'wine', 'bourguignon'],
  'indian': ['curry', 'biryani', 'tandoor', 'turmeric', 'cumin', 'coriander', 'naan'],
  'italian': ['pasta', 'risotto', 'parmesan', 'basil', 'tomato', 'pizza', 'prosciutto'],
  'japanese': ['sushi', 'miso', 'teriyaki', 'tempura', 'sashimi', 'ramen', 'sake'],
  'korean': ['kimchi', 'bibimbap', 'gochujang', 'bulgogi', 'korean chili', 'sesame'],
  'mediterranean': ['olive oil', 'feta', 'olives', 'hummus', 'pita', 'greek', 'mediterranean'],
  'mexican': ['salsa', 'tortilla', 'cumin', 'chili pepper', 'lime', 'avocado', 'cilantro'],
  'southern': ['cornbread', 'grits', 'collard greens', 'fried', 'southern', 'biscuit'],
  'thai': ['pad thai', 'curry', 'coconut milk', 'lemongrass', 'thai basil', 'fish sauce'],
  'vietnamese': ['pho', 'banh mi', 'vietnamese', 'fish sauce', 'mint', 'cilantro', 'rice paper']
};

async function analyzeMealDietsCuisines(meal) {
  const systemPrompt = `You are a culinary expert analyzing meals to correctly classify diets and cuisines.

DIET DEFINITIONS (ONLY include diets the meal STRICTLY follows):
${Object.entries(DIET_DEFINITIONS).map(([diet, def]) => `- ${diet}: ${def}`).join('\n')}

CUISINE OPTIONS: ${VALID_CUISINES.join(', ')}

CRITICAL DIET RULES:
- VEGAN: Absolutely no animal products (no meat, poultry, fish, dairy, eggs, honey)
- VEGETARIAN: No meat, poultry, or fish (dairy and eggs OK)
- PESCATARIAN: No meat or poultry (fish, seafood, dairy, eggs OK)
- PLANT-FORWARD: Primarily plants but may have small amounts of animal products as flavor enhancers
- If meal contains chicken, beef, pork, lamb, etc. → NOT vegan, vegetarian, or pescatarian
- If meal contains fish/seafood → NOT vegan or vegetarian (could be pescatarian)
- Only include a diet if the meal STRICTLY adheres to ALL requirements

CUISINE RULES:
- Analyze cooking methods, spice profiles, ingredient combinations, and cultural context
- A meal can have multiple cuisines if it's a fusion dish
- Consider traditional preparation methods and authentic ingredients

Analyze this meal and return ONLY valid diets and cuisines based on strict definitions.`;

  const userPrompt = `Analyze this meal for diet and cuisine classification:

MEAL: "${meal.title}"
PRIMARY INGREDIENT: ${meal.primary_ingredient}
CURRENT DIETS: ${meal.diets_supported || 'none'}
CURRENT CUISINES: ${meal.cuisines || 'none'}
INGREDIENTS: ${meal.ingredients_json ? meal.ingredients_json.map(ing => ing.name).join(', ') : 'not available'}

Based on the meal title, primary ingredient, and ingredients list, determine:
1. Which diets this meal STRICTLY follows (be very conservative)
2. Which cuisine(s) this meal represents

Return a JSON object with your analysis and reasoning.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'diet_cuisine_analysis',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              reasoning: {
                type: 'object',
                properties: {
                  diet_analysis: { type: 'string', description: 'Detailed analysis of which diets this meal follows and why' },
                  cuisine_analysis: { type: 'string', description: 'Analysis of cuisine classification based on ingredients and cooking style' }
                },
                required: ['diet_analysis', 'cuisine_analysis']
              },
              corrected_diets: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: VALID_DIETS
                },
                description: 'Only diets this meal STRICTLY follows'
              },
              corrected_cuisines: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: VALID_CUISINES
                },
                description: 'Cuisine classifications for this meal'
              }
            },
            required: ['reasoning', 'corrected_diets', 'corrected_cuisines']
          },
          strict: true
        }
      },
      temperature: 0.1 // Low temperature for consistent analysis
    });

    const analysis = JSON.parse(completion.choices[0].message.content);
    return analysis;

  } catch (error) {
    console.error(`❌ Error analyzing meal "${meal.title}":`, error.message);
    return null;
  }
}

async function getAllMeals() {
  console.log('📊 Fetching all meals from database...');
  
  const { data, error } = await supabase
    .from('meals')
    .select('id, title, primary_ingredient, diets_supported, cuisines, ingredients_json')
    .order('id');
    
  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }
  
  console.log(`✅ Loaded ${data.length} meals for analysis`);
  return data;
}

async function updateMealClassification(mealId, correctedDiets, correctedCuisines, reasoning) {
  try {
    const { error } = await supabase
      .from('meals')
      .update({
        diets_supported: correctedDiets,
        cuisines: correctedCuisines
      })
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

function hasChanges(original, corrected) {
  const originalDiets = (original.diets_supported || []).sort();
  const originalCuisines = (original.cuisines || []).sort();
  const correctedDiets = corrected.corrected_diets.sort();
  const correctedCuisines = corrected.corrected_cuisines.sort();
  
  const dietsChanged = JSON.stringify(originalDiets) !== JSON.stringify(correctedDiets);
  const cuisinesChanged = JSON.stringify(originalCuisines) !== JSON.stringify(correctedCuisines);
  
  return dietsChanged || cuisinesChanged;
}

async function processMeals(testMode = false) {
  const meals = await getAllMeals();
  let processedCount = 0;
  let changedCount = 0;
  let errorCount = 0;

  console.log(`\n🤖 Starting ${testMode ? 'TEST MODE' : 'FULL'} diet & cuisine analysis...\n`);

  for (const meal of meals.slice(0, 1)) {
    console.log(`\n📝 Analyzing meal ${meal.id}: "${meal.title}"`);
    
    const analysis = await analyzeMealDietsCuisines(meal);
    
    if (!analysis) {
      errorCount++;
      continue;
    }

    // Display analysis
    console.log(`\n🧠 AI REASONING:`);
    console.log(`├─ DIET: ${analysis.reasoning.diet_analysis}`);
    console.log(`└─ CUISINE: ${analysis.reasoning.cuisine_analysis}`);

    // Check if changes are needed
    if (hasChanges(meal, analysis)) {
      changedCount++;
      
      console.log(`\n🔄 CHANGES DETECTED:`);
      console.log(`├─ OLD DIETS: [${(meal.diets_supported || []).join(', ')}]`);
      console.log(`├─ NEW DIETS: [${analysis.corrected_diets.join(', ')}]`);
      console.log(`├─ OLD CUISINES: [${(meal.cuisines || []).join(', ')}]`);
      console.log(`└─ NEW CUISINES: [${analysis.corrected_cuisines.join(', ')}]`);

      if (!testMode) {
        const updated = await updateMealClassification(
          meal.id, 
          analysis.corrected_diets, 
          analysis.corrected_cuisines,
          analysis.reasoning
        );
        
        if (updated) {
          console.log(`✅ Updated meal ${meal.id} in database`);
        } else {
          errorCount++;
        }
      } else {
        console.log(`🧪 TEST MODE: Changes would be applied in full run`);
      }
    } else {
      console.log(`✅ No changes needed - current classification is correct`);
    }

    processedCount++;
    
    // Brief pause to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 DIET & CUISINE CORRECTION SUMMARY');
  console.log('='.repeat(60));
  console.log(`📝 Total meals processed: ${processedCount}`);
  console.log(`🔄 Meals requiring changes: ${changedCount}`);
  console.log(`❌ Errors encountered: ${errorCount}`);
  console.log(`✅ Success rate: ${((processedCount - errorCount) / processedCount * 100).toFixed(1)}%`);

  return {
    processed: processedCount,
    changed: changedCount,
    errors: errorCount
  };
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const testMode = args.includes('--test') || args.includes('-t');
  const limit = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];

  console.log('🍳 ChefsCart Diet & Cuisine Classification Fix');
  console.log('   Using GPT-4o-mini for mid-level reasoning analysis');
  console.log('');

  if (testMode) {
    console.log('🧪 TEST MODE: Will analyze meals but not update database');
    console.log('');
  }

  try {
    await processMeals(testMode);
    console.log('\n🎉 Analysis completed successfully!');
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}