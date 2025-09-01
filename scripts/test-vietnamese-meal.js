#!/usr/bin/env node

/**
 * Test actual meal generation with Vietnamese dish name
 * Ensures slug is properly generated for non-English names
 */

import { generateMealData } from './generate-meal-data.js';

async function testVietnameseMeal() {
  console.log('🧪 Testing Meal Generation with Vietnamese Name\n');
  
  const testMeal = 'Bánh Xèo (Sizzling Crepes)';
  
  try {
    console.log(`Testing: ${testMeal}\n`);
    const mealData = await generateMealData(testMeal);
    
    if (mealData) {
      console.log('\n✅ Generation successful!');
      console.log(`📋 Title: ${mealData.title}`);
      console.log(`🔗 Slug: ${mealData.slug}`);
      console.log(`✅ Slug is correct: ${mealData.slug === 'banh-xeo-sizzling-crepes' ? 'YES' : 'NO'}`);
      
      console.log(`\n📝 Details:`);
      console.log(`  Cuisines: ${mealData.cuisines?.join(', ')}`);
      console.log(`  Difficulty: ${mealData.cooking_difficulty}`);
      console.log(`  Time: ${mealData.prep_time}min prep + ${mealData.cook_time}min cook`);
      console.log(`  Equipment: ${mealData.cooking_equipment?.slice(0, 5).join(', ')}...`);
      console.log(`  Ingredients: ${mealData.ingredients_json?.ingredients?.length} items`);
      
      if (mealData.slug === 'banh-xeo-sizzling-crepes') {
        console.log('\n🎉 SUCCESS: Vietnamese meal name properly handled!');
      } else {
        console.log('\n⚠️  WARNING: Slug may not be correctly formatted');
      }
    } else {
      console.log('❌ Generation failed');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testVietnameseMeal();