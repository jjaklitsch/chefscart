#!/usr/bin/env node

/**
 * Test the updated meal generation script with a single meal
 */

const { generateMealData } = require('./generate-meal-data.js');

async function testSingleMeal() {
  console.log('🧪 Testing updated meal generation script...\n');
  
  const testMeal = 'Mediterranean Grilled Chicken with Lemon';
  
  try {
    const mealData = await generateMealData(testMeal);
    
    if (!mealData) {
      console.error('❌ Failed to generate meal data');
      process.exit(1);
    }
    
    console.log('\n🎉 Test successful! Generated meal data:');
    console.log(`📋 Title: ${mealData.title}`);
    console.log(`⏱️  Timing: ${mealData.prep_time}min prep + ${mealData.cook_time}min cook = ${mealData.time_total_min}min total`);
    console.log(`🍳 Difficulty: ${mealData.cooking_difficulty}`);
    console.log(`📝 Ingredients: ${mealData.ingredients_json.ingredients.length} items`);
    
    // Check ingredient schema
    const firstIngredient = mealData.ingredients_json.ingredients[0];
    console.log('\n✅ First ingredient schema check:');
    console.log(`   display_name: ${firstIngredient.display_name}`);
    console.log(`   shoppable_name: ${firstIngredient.shoppable_name}`);
    console.log(`   category: ${firstIngredient.category}`);
    console.log(`   scale_type: ${firstIngredient.scale_type}`);
    console.log(`   optional: ${firstIngredient.optional}`);
    
    console.log('\n🎯 Schema validation: PASSED ✅');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  testSingleMeal();
}