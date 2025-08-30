#!/usr/bin/env node

/**
 * Test script to demonstrate meal quality fixes on sample meals
 * This will show you exactly what changes will be made before running on all meals
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

// Test specific meals with known issues
const TEST_MEAL_NAMES = [
  'Apple Gorgonzola Salad',  // Likely missing lettuce
  'Grilled Salmon',           // Might be just protein
  'Pork Chops',              // Likely just protein
  'Mediterranean Chickpea Stew' // Should be complete
];

async function fetchTestMeals() {
  const { data: meals, error } = await supabase
    .from('meals')
    .select('*')
    .in('title', TEST_MEAL_NAMES)
    .limit(10);

  if (error) {
    // Try partial matches if exact titles don't exist
    const { data: partialMatches } = await supabase
      .from('meals')
      .select('*')
      .or(TEST_MEAL_NAMES.map(name => `title.ilike.%${name}%`).join(','))
      .limit(10);
    
    return partialMatches || [];
  }

  return meals || [];
}

async function demonstrateAuditAndFix() {
  console.log('🧪 MEAL QUALITY TEST - Demonstrating Issues and Fixes');
  console.log('='.repeat(60));
  console.log('This test will show you:');
  console.log('1. Meals that are incomplete (just a protein)');
  console.log('2. Missing ingredients (e.g., lettuce in salads)');
  console.log('3. Incorrect quantities/units (e.g., "1 each" salmon vs "0.5 lb")');
  console.log('='.repeat(60));
  console.log('');

  // Fetch test meals
  console.log('📥 Fetching sample meals from database...\n');
  const meals = await fetchTestMeals();

  if (meals.length === 0) {
    console.log('❌ No test meals found. Fetching random meals instead...\n');
    const { data: randomMeals } = await supabase
      .from('meals')
      .select('*')
      .limit(5);
    meals.push(...(randomMeals || []));
  }

  console.log(`Found ${meals.length} meals to analyze\n`);

  // Analyze each meal
  for (const meal of meals) {
    console.log('\n' + '='.repeat(60));
    console.log(`🍽️  MEAL: ${meal.title}`);
    console.log('='.repeat(60));
    
    console.log('\n📋 CURRENT STATE:');
    console.log(`Description: ${meal.description}`);
    console.log(`Primary Ingredient: ${meal.primary_ingredient}`);
    
    if (meal.ingredients_json?.ingredients) {
      console.log('\nCurrent Ingredients:');
      meal.ingredients_json.ingredients.forEach(ing => {
        console.log(`  - ${ing.quantity} ${ing.unit} ${ing.display_name || ing.shoppable_name}`);
      });
    }

    // Perform simple checks
    console.log('\n🔍 QUICK ANALYSIS:');
    
    // Check 1: Is it a complete meal?
    const ingredientCount = meal.ingredients_json?.ingredients?.length || 0;
    const hasProtein = meal.primary_ingredient && ['chicken', 'beef', 'pork', 'fish', 'tofu', 'seafood', 'lamb'].includes(meal.primary_ingredient);
    const hasStarchOrVeg = meal.ingredients_json?.ingredients?.some(ing => 
      ing.category === 'Produce' || ing.category === 'Rice & Grains' || ing.category === 'Pasta'
    );
    
    if (ingredientCount < 5 && hasProtein && !hasStarchOrVeg) {
      console.log('❌ INCOMPLETE MEAL: Appears to be just a protein without sides');
    }

    // Check 2: Missing obvious ingredients
    const title = meal.title.toLowerCase();
    const ingredients = meal.ingredients_json?.ingredients?.map(i => 
      (i.display_name || i.shoppable_name || '').toLowerCase()
    ) || [];
    
    if (title.includes('salad') && !ingredients.some(i => i.includes('lettuce') || i.includes('greens') || i.includes('spinach') || i.includes('arugula'))) {
      console.log('❌ MISSING INGREDIENT: Salad without lettuce/greens');
    }
    
    if (title.includes('pasta') && !ingredients.some(i => i.includes('pasta') || i.includes('spaghetti') || i.includes('penne') || i.includes('noodle'))) {
      console.log('❌ MISSING INGREDIENT: Pasta dish without pasta');
    }

    // Check 3: Quantity issues
    const proteinIngredients = meal.ingredients_json?.ingredients?.filter(ing => {
      const name = (ing.display_name || ing.shoppable_name || '').toLowerCase();
      return name.includes('chicken') || name.includes('beef') || name.includes('pork') || 
             name.includes('salmon') || name.includes('fish') || name.includes('shrimp');
    }) || [];

    proteinIngredients.forEach(protein => {
      if (protein.unit === 'each' || protein.unit === 'count' || 
          (protein.unit === 'oz' && protein.quantity < 8)) {
        console.log(`❌ QUANTITY ISSUE: ${protein.display_name || protein.shoppable_name} - should be in pounds (0.5 lb per person)`);
      }
    });

    // Propose fixes
    console.log('\n💡 PROPOSED FIXES:');
    
    if (ingredientCount < 5 && hasProtein && !hasStarchOrVeg) {
      console.log('✅ Add complementary sides:');
      console.log('   - Roasted vegetables (1 lb mixed vegetables)');
      console.log('   - Starch/grain (1 cup rice or 8 oz pasta)');
      console.log('   - Update title to reflect complete meal');
    }

    if (title.includes('salad') && !ingredients.some(i => i.includes('lettuce') || i.includes('greens'))) {
      console.log('✅ Add missing greens:');
      console.log('   - 4 cups mixed salad greens or 1 head romaine lettuce');
    }

    proteinIngredients.forEach(protein => {
      if (protein.unit !== 'lb' && protein.unit !== 'pound') {
        const servings = meal.servings_default || 2;
        console.log(`✅ Fix protein quantity:`)
        console.log(`   - Change ${protein.quantity} ${protein.unit} → ${servings * 0.5} lb`);
      }
    });
  }

  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('\nTo run the full audit and fix on all meals:');
  console.log('1. Dry run first: node scripts/audit-and-fix-meal-quality.js --dry-run');
  console.log('2. Apply fixes: node scripts/audit-and-fix-meal-quality.js');
  console.log('\nYou can also limit the number of meals:');
  console.log('   node scripts/audit-and-fix-meal-quality.js --limit=10');
}

// Run the test
if (require.main === module) {
  demonstrateAuditAndFix().catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
  });
}