#!/usr/bin/env node

/**
 * Allergen Mapping Fix Script
 * Uses GPT-4o-mini to analyze and correct allergen classifications
 * for all meals in the database based on ingredients.
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

// Common ingredient allergen mappings
const COMMON_ALLERGEN_SOURCES = {
  // Dairy sources
  'cheese': ['dairy'], 'butter': ['dairy'], 'milk': ['dairy'], 'cream': ['dairy'], 
  'yogurt': ['dairy'], 'ricotta': ['dairy'], 'mozzarella': ['dairy'], 'parmesan': ['dairy'],
  'burrata': ['dairy'], 'feta': ['dairy'], 'goat cheese': ['dairy'], 'halloumi': ['dairy'],
  
  // Egg sources
  'eggs': ['egg'], 'egg': ['egg'], 'mayonnaise': ['egg'],
  
  // Gluten/Wheat sources
  'bread': ['gluten', 'wheat'], 'pasta': ['gluten', 'wheat'], 'flour': ['gluten', 'wheat'],
  'soy sauce': ['gluten', 'soy'], 'noodles': ['gluten', 'wheat'], 'tortilla': ['gluten', 'wheat'],
  
  // Grain sources
  'rice': ['grain'], 'quinoa': ['grain'], 'oats': ['grain'], 'bulgur': ['grain', 'gluten', 'wheat'],
  'farro': ['grain', 'gluten', 'wheat'], 'barley': ['grain', 'gluten'],
  
  // Seafood sources
  'salmon': ['seafood'], 'tuna': ['seafood'], 'cod': ['seafood'], 'fish': ['seafood'],
  'mackerel': ['seafood'], 'sardines': ['seafood'], 'trout': ['seafood'],
  
  // Shellfish sources
  'shrimp': ['shellfish', 'seafood'], 'crab': ['shellfish', 'seafood'], 'clams': ['shellfish', 'seafood'],
  'mussels': ['shellfish', 'seafood'], 'scallops': ['shellfish', 'seafood'],
  
  // Soy sources
  'tofu': ['soy'], 'tempeh': ['soy'], 'edamame': ['soy'], 'soy milk': ['soy'],
  
  // Tree nut sources
  'almonds': ['tree_nut'], 'walnuts': ['tree_nut'], 'cashews': ['tree_nut'], 
  'pistachios': ['tree_nut'], 'pecans': ['tree_nut'], 'hazelnuts': ['tree_nut'],
  
  // Sesame sources
  'tahini': ['sesame'], 'sesame oil': ['sesame'], 'sesame seeds': ['sesame'],
  
  // Peanut sources
  'peanuts': ['peanut'], 'peanut butter': ['peanut'], 'peanut oil': ['peanut']
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
CURRENT ALLERGENS: [${(meal.allergens_present || []).join(', ')}]
INGREDIENTS: ${meal.ingredients_json ? meal.ingredients_json.map(ing => ing.name).join(', ') : 'not available'}

Based on the meal title, primary ingredient, and full ingredients list, identify ALL allergens present:

{
  "allergens": ["array of allergens actually present in this meal"],
  "reasoning": {
    "allergen_analysis": "Explain which ingredients contain which allergens and why"
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
    
    // Validate allergens
    const validAllergens = (analysis.allergens || []).filter(allergen => VALID_ALLERGENS.includes(allergen));
    
    return {
      corrected_allergens: validAllergens.sort(), // Sort for consistent comparison
      reasoning: analysis.reasoning || { allergen_analysis: 'No reasoning provided' }
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
  const originalAllergens = (original.allergens_present || []).sort();
  const correctedAllergens = corrected.corrected_allergens.sort();
  
  return JSON.stringify(originalAllergens) !== JSON.stringify(correctedAllergens);
}

async function processMeals(testMode = false, limit = null) {
  const allMeals = await getAllMeals();
  const meals = limit ? allMeals.slice(0, limit) : allMeals;
  
  let processedCount = 0;
  let changedCount = 0;
  let errorCount = 0;

  console.log(`\n🤖 Starting ${testMode ? 'TEST MODE' : 'FULL'} allergen analysis...`);
  console.log(`📝 Processing ${meals.length} meals\n`);

  for (const meal of meals) {
    console.log(`\n📝 Analyzing meal ${meal.id}: "${meal.title}"`);
    
    const analysis = await analyzeMealAllergens(meal);
    
    if (!analysis) {
      errorCount++;
      continue;
    }

    // Display analysis
    console.log(`\n🧠 AI REASONING:`);
    console.log(`└─ ALLERGENS: ${analysis.reasoning.allergen_analysis}`);

    // Check if changes are needed
    if (hasAllergenChanges(meal, analysis)) {
      changedCount++;
      
      console.log(`\n🔄 CHANGES DETECTED:`);
      console.log(`├─ OLD ALLERGENS: [${(meal.allergens_present || []).join(', ')}]`);
      console.log(`└─ NEW ALLERGENS: [${analysis.corrected_allergens.join(', ')}]`);

      if (!testMode) {
        const updated = await updateMealAllergens(meal.id, analysis.corrected_allergens);
        
        if (updated) {
          console.log(`✅ Updated meal ${meal.id} in database`);
        } else {
          errorCount++;
        }
      } else {
        console.log(`🧪 TEST MODE: Changes would be applied in full run`);
      }
    } else {
      console.log(`✅ No changes needed - current allergens are correct`);
    }

    processedCount++;
    
    // Brief pause to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 ALLERGEN CORRECTION SUMMARY');
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

  console.log('🍳 ChefsCart Allergen Classification Fix');
  console.log('   Using GPT-4o-mini for detailed allergen analysis');
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
    console.log('\n🎉 Allergen analysis completed successfully!');
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}