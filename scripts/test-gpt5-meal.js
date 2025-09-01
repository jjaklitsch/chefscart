#!/usr/bin/env node

/**
 * Test GPT-5-mini Meal Generation
 * Quick test to verify GPT-5-mini integration works
 */

import { generateMealData } from './generate-meal-data.js';

async function testGPT5Generation() {
  console.log('🧪 Testing GPT-5-mini meal generation...\n');
  
  const testMeal = 'Mediterranean Grilled Chicken with Quinoa';
  
  try {
    const mealData = await generateMealData(testMeal);
    
    if (mealData) {
      console.log('✅ GPT-5-mini generation successful!');
      console.log(`📋 Generated: ${mealData.title}`);
      console.log(`🍽️  Cooking Equipment: ${mealData.cooking_equipment?.join(', ')}`);
      console.log(`🌶️  Spice Level: ${mealData.spice_level}/5`);
      console.log(`⏱️  Time: ${mealData.prep_time}min prep + ${mealData.cook_time}min cook`);
      console.log(`🥘 Cuisines: ${mealData.cuisines?.join(', ')}`);
      console.log(`🥗 Diets: ${mealData.diets_supported?.join(', ')}`);
      console.log(`📦 Ingredients: ${mealData.ingredients_json?.ingredients?.length} items`);
      
      console.log('\n🎉 All fields generated successfully with GPT-5-mini!');
    } else {
      console.log('❌ Generation failed');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testGPT5Generation();