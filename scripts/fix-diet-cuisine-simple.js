#!/usr/bin/env node

/**
 * Diet & Cuisine Mapping Fix Script (Simplified Version)
 * Uses GPT-4o-mini to analyze and correct diet/cuisine classifications
 * without complex JSON schema requirements.
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

// Valid diet and cuisine options
const VALID_DIETS = [
  'keto', 'low-carb', 'mediterranean', 'paleo', 'pescatarian', 'plant-forward', 
  'vegan', 'vegetarian', 'whole30', 'kosher'
];

const VALID_CUISINES = [
  'american', 'caribbean', 'chinese', 'french', 'indian', 'italian', 
  'japanese', 'korean', 'mediterranean', 'mexican', 'southern', 'thai', 'vietnamese'
];

async function analyzeMealDietsCuisines(meal) {
  const systemPrompt = `You are a culinary expert analyzing meals to correctly classify diets and cuisines.

DIET DEFINITIONS (ONLY include diets the meal STRICTLY follows):
- vegan: No animal products whatsoever (no meat, poultry, fish, dairy, eggs, honey)
- vegetarian: No meat, poultry, or fish, but allows dairy and eggs
- pescatarian: No meat or poultry, but allows fish, seafood, dairy, and eggs
- plant-forward: Emphasizes plants but may include small amounts of animal products as flavor enhancers
- keto: Very low carb (typically <20g net carbs), high fat, moderate protein
- low-carb: Reduced carbohydrates (typically <100g carbs per day)
- paleo: No grains, legumes, dairy, refined sugar, or processed foods - only whole foods
- whole30: No grains, legumes, dairy, sugar, alcohol, or additives for 30 days
- mediterranean: Emphasizes olive oil, fish, vegetables, whole grains, legumes - traditional Mediterranean diet
- kosher: Follows Jewish dietary laws (no pork, no shellfish, no mixing meat and dairy)

CUISINE OPTIONS: ${VALID_CUISINES.join(', ')}

CRITICAL DIET RULES:
- If meal contains chicken, beef, pork, lamb, etc. → NOT vegan, vegetarian, or pescatarian
- If meal contains fish/seafood → NOT vegan or vegetarian (could be pescatarian)
- If meal contains dairy or eggs → NOT vegan (could be vegetarian or pescatarian)
- Only include a diet if the meal STRICTLY adheres to ALL requirements

Return a JSON object with 'diets' array and 'cuisines' array containing only valid classifications.`;

  const userPrompt = `Analyze this meal for diet and cuisine classification:

MEAL: "${meal.title}"
PRIMARY INGREDIENT: ${meal.primary_ingredient}
CURRENT DIETS: [${(meal.diets_supported || []).join(', ')}]
CURRENT CUISINES: [${(meal.cuisines || []).join(', ')}]
INGREDIENTS: ${meal.ingredients_json ? meal.ingredients_json.map(ing => ing.name).join(', ') : 'not available'}

Based on the meal title, primary ingredient, and ingredients list, return:
{
  "diets": ["array of diet classifications this meal STRICTLY follows"],
  "cuisines": ["array of cuisine classifications"],
  "reasoning": {
    "diet_analysis": "Explain why each diet does or doesn't apply",
    "cuisine_analysis": "Explain cuisine classification reasoning"
  }
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    const analysis = JSON.parse(completion.choices[0].message.content);
    
    // Validate arrays
    const validDiets = (analysis.diets || []).filter(diet => VALID_DIETS.includes(diet));
    const validCuisines = (analysis.cuisines || []).filter(cuisine => VALID_CUISINES.includes(cuisine));
    
    return {
      corrected_diets: validDiets,
      corrected_cuisines: validCuisines,
      reasoning: analysis.reasoning || { diet_analysis: 'No reasoning provided', cuisine_analysis: 'No reasoning provided' }
    };

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

async function updateMealClassification(mealId, correctedDiets, correctedCuisines) {
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

async function processMeals(testMode = false, limit = null) {
  const allMeals = await getAllMeals();
  const meals = limit ? allMeals.slice(0, limit) : allMeals;
  
  let processedCount = 0;
  let changedCount = 0;
  let errorCount = 0;

  console.log(`\n🤖 Starting ${testMode ? 'TEST MODE' : 'FULL'} diet & cuisine analysis...`);
  console.log(`📝 Processing ${meals.length} meals\n`);

  for (const meal of meals) {
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
          analysis.corrected_cuisines
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
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

  console.log('🍳 ChefsCart Diet & Cuisine Classification Fix (Simple)');
  console.log('   Using GPT-4o-mini for mid-level reasoning analysis');
  console.log('');

  if (testMode) {
    console.log('🧪 TEST MODE: Will analyze meals but not update database');
    console.log('');
  }

  if (limit) {
    console.log(`📊 LIMIT: Processing only ${limit} meals`);
    console.log('');
  }

  try {
    await processMeals(testMode, limit);
    console.log('\n🎉 Analysis completed successfully!');
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}