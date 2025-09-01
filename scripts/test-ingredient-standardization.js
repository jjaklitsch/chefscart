#!/usr/bin/env node

/**
 * Test ingredient standardization system
 * Validates the standardization mapping against real meal generation
 */

import { generateMealData } from './generate-meal-data.js';
import { getStandardizedIngredient, validateIngredientStandardization, CANONICAL_INGREDIENTS } from './ingredient-standardization-map.js';

async function testIngredientStandardization() {
  console.log('🧪 Testing Ingredient Standardization System\n');
  
  // Test 1: Individual standardization mapping
  console.log('1️⃣  INDIVIDUAL STANDARDIZATION TESTS:');
  const testCases = [
    // Common variations that should be standardized
    { input: "tomato", expected: "Tomatoes" },
    { input: "bell pepper", expected: "Red Bell Pepper" },
    { input: "olive oil", expected: "Extra-Virgin Olive Oil" },
    { input: "salt", expected: "Kosher Salt" },
    { input: "chicken breast", expected: "Chicken Breasts" },
    { input: "fresh parsley", expected: "Parsley" },
    { input: "ground black pepper", expected: "Black Pepper" },
    { input: "eggs", expected: "Large Eggs" },
    { input: "onion", expected: "Yellow Onion" },
    { input: "rice", expected: "White Rice" }
  ];
  
  let standardizationPassed = 0;
  testCases.forEach(({ input, expected }) => {
    const result = getStandardizedIngredient(input);
    const passed = result.name === expected;
    
    console.log(`  ${passed ? '✅' : '❌'} "${input}" → "${result.name}" ${passed ? '' : `(expected: "${expected}")`}`);
    if (passed) standardizationPassed++;
    
    if (passed) {
      console.log(`     Unit: ${result.unit}, Category: ${result.category}`);
    }
  });
  
  console.log(`\n📊 Standardization Tests: ${standardizationPassed}/${testCases.length} passed\n`);
  
  // Test 2: Full meal generation with standardization
  console.log('2️⃣  FULL MEAL GENERATION TEST:');
  try {
    const mealData = await generateMealData('Classic Italian Margherita Pizza');
    
    if (!mealData || !mealData.ingredients_json?.ingredients) {
      console.log('❌ Meal generation failed');
      return;
    }
    
    const ingredients = mealData.ingredients_json.ingredients;
    console.log(`✅ Generated meal with ${ingredients.length} ingredients\n`);
    
    // Test 3: Validation of generated ingredients
    console.log('3️⃣  INGREDIENT VALIDATION:');
    
    let validCount = 0;
    let knownCanonical = 0;
    const unknownIngredients = [];
    
    ingredients.forEach((ingredient, index) => {
      const isCanonical = CANONICAL_INGREDIENTS.hasOwnProperty(ingredient.name);
      
      if (isCanonical) {
        knownCanonical++;
        const canonical = CANONICAL_INGREDIENTS[ingredient.name];
        const unitMatch = ingredient.unit === canonical.unit;
        const categoryMatch = ingredient.category === canonical.category;
        
        if (unitMatch && categoryMatch) {
          validCount++;
          console.log(`  ✅ ${ingredient.name} (${ingredient.unit}, ${ingredient.category})`);
        } else {
          console.log(`  ⚠️  ${ingredient.name}: Unit=${unitMatch ? '✅' : '❌'} Category=${categoryMatch ? '✅' : '❌'}`);
          console.log(`       Expected: ${canonical.unit}, ${canonical.category}`);
          console.log(`       Got:      ${ingredient.unit}, ${ingredient.category}`);
        }
      } else {
        unknownIngredients.push(ingredient.name);
        console.log(`  ❓ ${ingredient.name} (not in canonical list)`);
      }
    });
    
    console.log(`\n📊 Ingredient Validation:`);
    console.log(`  Known canonical ingredients: ${knownCanonical}/${ingredients.length}`);
    console.log(`  Correctly mapped: ${validCount}/${knownCanonical}`);
    console.log(`  Unknown ingredients: ${unknownIngredients.length}`);
    
    if (unknownIngredients.length > 0) {
      console.log(`  Unknown: ${unknownIngredients.join(', ')}`);
    }
    
    // Test 4: Instacart compatibility
    console.log('\n4️⃣  INSTACART API COMPATIBILITY:');
    const instacartCompatible = ingredients.every(ing => {
      return ing.name && ing.quantity && ing.unit && ing.health_filters && ing.brand_filters;
    });
    
    console.log(`  ✅ All required fields present: ${instacartCompatible ? 'YES' : 'NO'}`);
    
    // Show sample for Instacart API
    if (ingredients.length > 0) {
      const sample = ingredients[0];
      console.log('\n📦 Sample Instacart API Payload:');
      console.log(JSON.stringify({
        name: sample.name,
        quantity: sample.quantity,
        unit: sample.unit,
        health_filters: sample.health_filters,
        brand_filters: sample.brand_filters
      }, null, 2));
    }
    
    // Test 5: Coverage analysis
    console.log('\n5️⃣  COVERAGE ANALYSIS:');
    console.log(`  Total canonical ingredients defined: ${Object.keys(CANONICAL_INGREDIENTS).length}`);
    console.log(`  Most common categories covered:`);
    
    const categoryCount = {};
    Object.values(CANONICAL_INGREDIENTS).forEach(ing => {
      categoryCount[ing.category] = (categoryCount[ing.category] || 0) + 1;
    });
    
    Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([category, count]) => {
        console.log(`    ${category}: ${count} ingredients`);
      });
    
    // Final summary
    console.log('\n🎯 STANDARDIZATION SYSTEM SUMMARY:');
    const tests = [
      { name: 'Individual Mapping', pass: standardizationPassed === testCases.length },
      { name: 'Meal Generation', pass: ingredients.length > 0 },
      { name: 'Canonical Recognition', pass: knownCanonical > ingredients.length * 0.7 }, // 70%+ recognition
      { name: 'Validation Accuracy', pass: knownCanonical === 0 ? true : validCount === knownCanonical },
      { name: 'Instacart Compatibility', pass: instacartCompatible }
    ];
    
    const passedTests = tests.filter(t => t.pass).length;
    
    tests.forEach(test => {
      console.log(`  ${test.pass ? '✅' : '❌'} ${test.name}`);
    });
    
    console.log(`\n📈 Overall Score: ${passedTests}/${tests.length} tests passed`);
    
    if (passedTests === tests.length) {
      console.log('\n🎉 STANDARDIZATION SYSTEM SUCCESS!');
      console.log('🚀 Ready for production use');
      console.log('✨ Ingredients will be consistently named and categorized');
      console.log('📦 Full Instacart API compatibility maintained');
    } else {
      console.log('\n⚠️  Some tests failed - review implementation');
    }
    
  } catch (error) {
    console.error('❌ Standardization test failed:', error.message);
  }
}

testIngredientStandardization();