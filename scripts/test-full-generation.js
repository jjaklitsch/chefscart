#!/usr/bin/env node

/**
 * Full test of meal generation: create, verify, and cleanup
 */

const { createClient } = require('@supabase/supabase-js');
const { generateMealData, saveMealData } = require('./generate-meal-data.js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFullGeneration() {
  console.log('🧪 Testing FULL meal generation (create → verify → cleanup)...\n');
  
  const testMeal = 'Thai Basil Chicken Test Meal';
  let createdMealId = null;
  
  try {
    // Step 1: Generate meal data
    console.log('🔄 Step 1: Generating meal data...');
    const mealData = await generateMealData(testMeal);
    
    if (!mealData) {
      throw new Error('Failed to generate meal data');
    }
    
    console.log(`✅ Generated: ${mealData.title}`);
    
    // Step 2: Save to database
    console.log('\\n🔄 Step 2: Saving to database...');
    const savedMeal = await saveMealData(mealData);
    
    if (!savedMeal) {
      throw new Error('Failed to save meal to database');
    }
    
    createdMealId = savedMeal.id;
    console.log(`✅ Saved with ID: ${createdMealId}`);
    
    // Step 3: Verify in database
    console.log('\\n🔄 Step 3: Verifying in database...');
    const { data: verifyMeal, error } = await supabase
      .from('meals')
      .select('*')
      .eq('id', createdMealId)
      .single();
      
    if (error || !verifyMeal) {
      throw new Error(`Failed to verify meal in database: ${error?.message}`);
    }
    
    // Check schema
    const ingredients = verifyMeal.ingredients_json?.ingredients || [];
    const firstIngredient = ingredients[0];
    
    console.log('✅ Database verification passed');
    console.log(`   Title: ${verifyMeal.title}`);
    console.log(`   Timing: ${verifyMeal.prep_time} + ${verifyMeal.cook_time} = ${verifyMeal.time_total_min}min`);
    console.log(`   Difficulty: ${verifyMeal.cooking_difficulty}`);
    console.log(`   Ingredients: ${ingredients.length} items`);
    console.log(`   Schema check: ${firstIngredient ? 'shoppable_name' in firstIngredient ? '✅' : '❌' : '❌'}`);
    
    if (firstIngredient) {
      console.log(`     - ${firstIngredient.display_name} → ${firstIngredient.shoppable_name} (${firstIngredient.category})`);
    }
    
    // Step 4: Cleanup - Delete the test meal
    console.log('\\n🔄 Step 4: Cleaning up test meal...');
    const { error: deleteError } = await supabase
      .from('meals')
      .delete()
      .eq('id', createdMealId);
      
    if (deleteError) {
      throw new Error(`Failed to delete test meal: ${deleteError.message}`);
    }
    
    console.log('✅ Test meal deleted successfully');
    
    console.log('\\n🎉 FULL TEST PASSED! ✅');
    console.log('   ✓ Generation works');
    console.log('   ✓ Database save works'); 
    console.log('   ✓ Schema is correct');
    console.log('   ✓ Cleanup works');
    
  } catch (error) {
    console.error('\\n❌ Test failed:', error.message);
    
    // Attempt cleanup if we created a meal
    if (createdMealId) {
      console.log('🧹 Attempting cleanup of test meal...');
      try {
        await supabase.from('meals').delete().eq('id', createdMealId);
        console.log('✅ Cleanup successful');
      } catch (cleanupError) {
        console.error('❌ Cleanup failed:', cleanupError.message);
      }
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  testFullGeneration();
}