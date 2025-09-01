#!/usr/bin/env node

/**
 * Generate improved meal data for the first 10 meals and save to meal2 table
 */

import { generateMealData, saveMealData } from './generate-meal-data.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generateFirst10Meals() {
  console.log('🚀 Generating improved meal data for first 10 meals');
  console.log('==================================================\n');

  // Read the saved meal data
  const mealDataPath = path.join(__dirname, 'first-10-meals.json');
  
  if (!fs.existsSync(mealDataPath)) {
    console.error('❌ first-10-meals.json not found. Run setup-meal2-table.js first.');
    return;
  }

  const { meals } = JSON.parse(fs.readFileSync(mealDataPath, 'utf8'));
  
  console.log(`📋 Meals to regenerate:`);
  meals.forEach((meal, index) => {
    console.log(`${index + 1}. "${meal.title}"`);
  });
  console.log('');

  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };

  for (const [index, meal] of meals.entries()) {
    console.log(`\n📋 Processing meal ${index + 1}/10: ${meal.title}`);
    
    try {
      // Generate meal data with improved system
      const mealData = await generateMealData(meal.title);
      
      if (!mealData) {
        results.failed++;
        results.errors.push(`Failed to generate: ${meal.title}`);
        console.error(`❌ Generation failed for: ${meal.title}`);
        continue;
      }

      // Save to meal2 table
      const savedData = await saveMealData(mealData);
      
      if (savedData) {
        results.successful++;
        console.log(`✅ Successfully saved: ${meal.title}`);
        
        // Log key improvements
        const ingredientCount = mealData.ingredients_json?.ingredients?.length || 0;
        console.log(`   📊 Ingredients: ${ingredientCount}`);
        console.log(`   ⏱️  Total time: ${mealData.time_total_min} min (${mealData.prep_time} prep + ${mealData.cook_time} cook)`);
        console.log(`   🍽️  Equipment: ${mealData.cooking_equipment?.length || 0} items`);
        console.log(`   🎯 Difficulty: ${mealData.cooking_difficulty}`);
      } else {
        results.failed++;
        results.errors.push(`Failed to save: ${meal.title}`);
        console.error(`❌ Save failed for: ${meal.title}`);
      }

      // Small delay to be respectful to API
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      results.failed++;
      results.errors.push(`Error with ${meal.title}: ${error.message}`);
      console.error(`❌ Error processing ${meal.title}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 GENERATION COMPLETE!');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${results.successful}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
  }
  
  console.log(`\n📁 Generated meals saved to meal2 table`);
  console.log('🌐 Ready to test on frontend!');
  
  if (results.successful > 0) {
    console.log('\n🚀 Next step: Check your frontend at http://localhost:3001');
    console.log('The app now uses the meal2 table with improved meal data!');
  }
}

// Run the generation
generateFirst10Meals().catch(console.error);