#!/usr/bin/env node

/**
 * Allergen Mapping Fix Script (Parallel Processing Version)
 * Uses GPT-4o-mini with parallel processing to analyze and correct 
 * allergen classifications much faster.
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

// Valid allergen options
const VALID_ALLERGENS = [
  'dairy', 'egg', 'gluten', 'grain', 'peanut', 'seafood', 'sesame', 
  'shellfish', 'soy', 'sulfite', 'tree_nut', 'wheat'
];

// Detailed allergen definitions with common sources
const ALLERGEN_DEFINITIONS = {
  'dairy': 'Milk and milk-derived products: cheese, butter, cream, yogurt, milk, whey, casein, lactose',
  'egg': 'Eggs and egg-derived products: whole eggs, egg whites, egg yolks, mayonnaise (contains eggs)',
  'gluten': 'Protein found in wheat, barley, rye, and contaminated oats: bread, pasta, flour, beer, soy sauce',
  'grain': 'All cereal grains: wheat, rice, oats, barley, quinoa, bulgur, farro, corn',
  'peanut': 'Peanuts and peanut-derived products: peanut butter, peanut oil, peanut flour',
  'seafood': 'All fish: salmon, tuna, cod, mackerel, sardines, etc. (NOT shellfish - separate category)',
  'sesame': 'Sesame seeds and sesame-derived products: tahini, sesame oil, sesame seeds',
  'shellfish': 'Crustaceans and mollusks: shrimp, crab, lobster, clams, mussels, oysters, scallops',
  'soy': 'Soybeans and soy-derived products: tofu, soy sauce, tempeh, edamame, soy milk',
  'sulfite': 'Sulfur compounds used as preservatives: wine, dried fruits, processed foods',
  'tree_nut': 'Tree nuts: almonds, walnuts, cashews, pistachios, pecans, hazelnuts (NOT peanuts)',
  'wheat': 'Wheat and wheat-derived products: flour, bread, pasta, couscous, bulgur'
};

async function analyzeMealAllergens(meal) {
  const systemPrompt = `You are a food safety expert analyzing meals to correctly identify allergens.

ALLERGEN DEFINITIONS:
${Object.entries(ALLERGEN_DEFINITIONS).map(([allergen, def]) => `- ${allergen}: ${def}`).join('\n')}

CRITICAL ALLERGEN RULES:
- Check ALL ingredients carefully for allergen sources
- Gluten = wheat + barley + rye contaminated oats
- Seafood includes ALL fish (salmon, tuna, cod, etc.) but NOT shellfish
- Shellfish = crustaceans/mollusks (shrimp, crab, clams, etc.) - separate from seafood
- Dairy = ALL milk products (cheese, butter, cream, yogurt, etc.)
- Soy sauce typically contains both SOY and GLUTEN
- Bread/pasta/noodles typically contain GLUTEN and WHEAT
- Tree nuts do NOT include peanuts (peanuts are legumes)
- Always include GRAIN if meal contains rice, quinoa, oats, wheat, barley, etc.

Only identify allergens that are ACTUALLY present in the ingredients.

Return a JSON object with 'allergens' array containing only allergens present in this meal.`;

  const userPrompt = `Analyze this meal for allergen identification:

MEAL: "${meal.title}"
PRIMARY INGREDIENT: ${meal.primary_ingredient}
INGREDIENTS: ${meal.ingredients_json ? meal.ingredients_json.map(ing => ing.name).join(', ') : 'not available'}

Identify ALL allergens present:

{
  "allergens": ["array of allergens actually present in this meal"],
  "reasoning": "Brief explanation of key allergen sources"
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
    
    // Validate allergens
    const validAllergens = (analysis.allergens || []).filter(allergen => VALID_ALLERGENS.includes(allergen));
    
    return {
      mealId: meal.id,
      corrected_allergens: validAllergens.sort(), // Sort for consistent comparison
      reasoning: analysis.reasoning || 'No reasoning provided',
      original_allergens: meal.allergens_present || []
    };

  } catch (error) {
    console.error(`❌ Error analyzing meal ${meal.id} "${meal.title}":`, error.message);
    return {
      mealId: meal.id,
      error: error.message,
      original_allergens: meal.allergens_present || []
    };
  }
}

async function getAllMeals() {
  console.log('📊 Fetching all meals from database...');
  
  const { data, error } = await supabase
    .from('meals')
    .select('id, title, primary_ingredient, allergens_present, ingredients_json')
    .order('id');
    
  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }
  
  console.log(`✅ Loaded ${data.length} meals for allergen analysis`);
  return data;
}

async function updateMealAllergens(mealId, correctedAllergens) {
  try {
    const { error } = await supabase
      .from('meals')
      .update({
        allergens_present: correctedAllergens
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

function hasAllergenChanges(original, corrected) {
  const originalAllergens = (original || []).sort();
  const correctedAllergens = corrected.sort();
  
  return JSON.stringify(originalAllergens) !== JSON.stringify(correctedAllergens);
}

// Process meals in batches with parallel processing
async function processMealsBatch(meals, batchNumber, testMode = false) {
  console.log(`\n🔄 Processing batch ${batchNumber} (${meals.length} meals)...`);
  
  // Process all meals in this batch in parallel
  const analyses = await Promise.all(
    meals.map(meal => analyzeMealAllergens(meal))
  );
  
  let changedCount = 0;
  let errorCount = 0;
  
  for (const analysis of analyses) {
    if (analysis.error) {
      errorCount++;
      continue;
    }
    
    // Check if changes are needed
    if (hasAllergenChanges(analysis.original_allergens, analysis.corrected_allergens)) {
      changedCount++;
      
      console.log(`\n📝 Meal ${analysis.mealId}: Changes detected`);
      console.log(`├─ OLD: [${analysis.original_allergens.join(', ')}]`);
      console.log(`├─ NEW: [${analysis.corrected_allergens.join(', ')}]`);
      console.log(`└─ REASON: ${analysis.reasoning}`);

      if (!testMode) {
        const updated = await updateMealAllergens(analysis.mealId, analysis.corrected_allergens);
        if (updated) {
          console.log(`✅ Updated meal ${analysis.mealId}`);
        } else {
          errorCount++;
        }
      } else {
        console.log(`🧪 TEST MODE: Would update meal ${analysis.mealId}`);
      }
    }
  }
  
  console.log(`✅ Batch ${batchNumber} complete: ${changedCount} changes, ${errorCount} errors`);
  
  return { changed: changedCount, errors: errorCount };
}

async function processMealsParallel(testMode = false, limit = null, batchSize = 10) {
  const allMeals = await getAllMeals();
  const meals = limit ? allMeals.slice(0, limit) : allMeals;
  
  let totalProcessed = 0;
  let totalChanged = 0;
  let totalErrors = 0;

  console.log(`\n🚀 Starting ${testMode ? 'TEST MODE' : 'FULL'} parallel allergen analysis...`);
  console.log(`📝 Processing ${meals.length} meals in batches of ${batchSize}\n`);

  // Process meals in batches
  const batches = [];
  for (let i = 0; i < meals.length; i += batchSize) {
    batches.push(meals.slice(i, i + batchSize));
  }

  console.log(`📦 Created ${batches.length} batches for parallel processing`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchResults = await processMealsBatch(batch, i + 1, testMode);
    
    totalProcessed += batch.length;
    totalChanged += batchResults.changed;
    totalErrors += batchResults.errors;
    
    // Brief pause between batches to avoid overwhelming the API
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 PARALLEL ALLERGEN CORRECTION SUMMARY');
  console.log('='.repeat(60));
  console.log(`📝 Total meals processed: ${totalProcessed}`);
  console.log(`🔄 Meals requiring changes: ${totalChanged}`);
  console.log(`❌ Errors encountered: ${totalErrors}`);
  console.log(`✅ Success rate: ${((totalProcessed - totalErrors) / totalProcessed * 100).toFixed(1)}%`);
  console.log(`⚡ Processing speed: ~${batchSize} meals per batch, ${batches.length} batches`);

  return {
    processed: totalProcessed,
    changed: totalChanged,
    errors: totalErrors
  };
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const testMode = args.includes('--test') || args.includes('-t');
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
  const batchSizeArg = args.find(arg => arg.startsWith('--batch='));
  const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 10;

  console.log('🍳 ChefsCart Allergen Classification Fix (Parallel Processing)');
  console.log('   Using GPT-4o-mini with parallel batch processing for speed');
  console.log('');

  if (testMode) {
    console.log('🧪 TEST MODE: Will analyze meals but not update database');
    console.log('');
  }

  if (limit) {
    console.log(`📊 LIMIT: Processing only ${limit} meals`);
    console.log('');
  }

  console.log(`⚡ BATCH SIZE: ${batchSize} meals per batch (parallel processing)`);
  console.log('');

  try {
    const startTime = Date.now();
    await processMealsParallel(testMode, limit, batchSize);
    const endTime = Date.now();
    const durationMinutes = ((endTime - startTime) / 1000 / 60).toFixed(2);
    
    console.log(`\n🎉 Parallel allergen analysis completed in ${durationMinutes} minutes!`);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}