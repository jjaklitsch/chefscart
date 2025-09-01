#!/usr/bin/env node

/**
 * Test the updated ingredient schema with Instacart API compatibility
 * Verifies new fields: name, health_filters, brand_filters
 * Confirms removal of: display_name, scale_type, optional, servings
 */

import { generateMealData } from './generate-meal-data.js';

async function testNewIngredientSchema() {
  console.log('🧪 Testing New Instacart-Compatible Ingredient Schema\n');
  
  // Test with a dish that should have various ingredient types and health filters
  const testMeal = 'Vegan Gluten-Free Pasta Salad';
  console.log(`Testing: ${testMeal}\n`);
  
  try {
    const mealData = await generateMealData(testMeal);
    
    if (!mealData || !mealData.ingredients_json?.ingredients) {
      console.log('❌ Meal generation failed or no ingredients');
      return;
    }
    
    const ingredients = mealData.ingredients_json.ingredients;
    console.log(`✅ Generated ${ingredients.length} ingredients\n`);
    
    // Test schema compliance
    console.log('📋 SCHEMA COMPLIANCE TEST:');
    const requiredFields = ['name', 'quantity', 'unit', 'category', 'health_filters', 'brand_filters'];
    const removedFields = ['display_name', 'shoppable_name', 'scale_type', 'optional'];
    
    let schemaCompliant = true;
    let hasServingsField = false;
    
    // Check ingredients_json level
    if ('servings' in mealData.ingredients_json) {
      console.log('⚠️  Found deprecated "servings" field in ingredients_json');
      hasServingsField = true;
    }
    
    ingredients.forEach((ingredient, index) => {
      console.log(`\\n  Ingredient ${index + 1}: ${ingredient.name || 'Unknown'}`);
      
      // Check required fields are present
      requiredFields.forEach(field => {
        if (!(field in ingredient)) {
          console.log(`    ❌ Missing required field: ${field}`);
          schemaCompliant = false;
        } else {
          console.log(`    ✅ Has ${field}: ${JSON.stringify(ingredient[field])}`);
        }
      });
      
      // Check removed fields are absent
      removedFields.forEach(field => {
        if (field in ingredient) {
          console.log(`    ⚠️  Found deprecated field: ${field}`);
          schemaCompliant = false;
        }
      });
    });
    
    // Health filters analysis
    console.log('\\n🏥 HEALTH FILTERS ANALYSIS:');
    const allHealthFilters = new Set();
    ingredients.forEach(ing => {
      if (ing.health_filters && Array.isArray(ing.health_filters)) {
        ing.health_filters.forEach(filter => allHealthFilters.add(filter));
      }
    });
    
    console.log(`  Health filters used: ${[...allHealthFilters].join(', ') || 'None'}`);
    
    const validHealthFilters = ['ORGANIC', 'GLUTEN_FREE', 'FAT_FREE', 'VEGAN', 'KOSHER', 'SUGAR_FREE', 'LOW_FAT'];
    const invalidFilters = [...allHealthFilters].filter(f => !validHealthFilters.includes(f));
    
    if (invalidFilters.length === 0) {
      console.log('  ✅ All health filters are valid Instacart values');
    } else {
      console.log(`  ❌ Invalid health filters: ${invalidFilters.join(', ')}`);
    }
    
    // Brand filters analysis
    console.log('\\n🏷️  BRAND FILTERS ANALYSIS:');
    const allBrands = new Set();
    ingredients.forEach(ing => {
      if (ing.brand_filters && Array.isArray(ing.brand_filters)) {
        ing.brand_filters.forEach(brand => allBrands.add(brand));
      }
    });
    
    console.log(`  Total unique brands suggested: ${allBrands.size}`);
    console.log(`  Brands: ${[...allBrands].slice(0, 10).join(', ')}${allBrands.size > 10 ? '...' : ''}`);
    
    // Summary
    console.log('\\n📊 SCHEMA COMPLIANCE SUMMARY:');
    console.log(`  ✅ Required fields present: ${schemaCompliant ? 'YES' : 'NO'}`);
    console.log(`  ✅ Deprecated fields removed: ${!hasServingsField && schemaCompliant ? 'YES' : 'NO'}`);
    console.log(`  ✅ Valid health filters: ${invalidFilters.length === 0 ? 'YES' : 'NO'}`);
    console.log(`  ✅ Brand suggestions provided: ${allBrands.size > 0 ? 'YES' : 'NO'}`);
    
    const overallPass = schemaCompliant && !hasServingsField && invalidFilters.length === 0 && allBrands.size > 0;
    
    if (overallPass) {
      console.log('\\n🎉 NEW SCHEMA TEST PASSED!');
      console.log('🚀 Ready for Instacart API integration');
    } else {
      console.log('\\n⚠️  Schema needs adjustments');
    }
    
    // Show sample ingredient for verification
    if (ingredients.length > 0) {
      console.log('\\n📝 SAMPLE INGREDIENT:');
      console.log(JSON.stringify(ingredients[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNewIngredientSchema();