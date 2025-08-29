import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateMealsWithEnhancedIngredients() {
  // Load enhanced ingredients
  if (!fs.existsSync('enhanced_ingredients.json')) {
    console.error('❌ enhanced_ingredients.json not found. Run enhance-ingredients-with-ai.js first.');
    return;
  }

  const enhancedIngredients = JSON.parse(fs.readFileSync('enhanced_ingredients.json', 'utf8'));
  console.log(`📊 Loaded ${enhancedIngredients.length} enhanced ingredients`);

  // Create lookup map by shoppable_name
  const enhancedMap = new Map();
  enhancedIngredients.forEach(ingredient => {
    const key = ingredient.shoppable_name;
    enhancedMap.set(key, ingredient);
  });

  console.log(`🗺️  Created lookup map with ${enhancedMap.size} unique ingredients`);

  // Get all meals
  const { data: meals, error } = await supabase
    .from('meals')
    .select('id, title, ingredients_json')
    .not('ingredients_json', 'is', null);

  if (error) {
    console.error('Error fetching meals:', error);
    return;
  }

  console.log(`🔄 Processing ${meals.length} meals...`);

  let updatedCount = 0;
  let errorCount = 0;
  let totalIngredientsProcessed = 0;
  let ingredientsEnhanced = 0;

  for (const meal of meals) {
    try {
      const ingredients = meal.ingredients_json?.ingredients || [];
      totalIngredientsProcessed += ingredients.length;
      
      // Enhance each ingredient
      const enhancedMealIngredients = ingredients.map(ingredient => {
        const key = ingredient.shoppable_name || ingredient.display_name;
        const enhanced = enhancedMap.get(key);
        
        if (enhanced && enhanced.ai_processed) {
          ingredientsEnhanced++;
          
          // Build alternative measurements
          let instacartMeasurements = enhanced.instacart_measurements || [{
            quantity: ingredient.quantity,
            unit: ingredient.unit
          }];

          // Add common unit alternatives based on category
          const additionalMeasurements = getAdditionalMeasurements(
            ingredient.quantity,
            ingredient.unit,
            enhanced.category
          );
          
          if (additionalMeasurements.length > 0) {
            instacartMeasurements = [...instacartMeasurements, ...additionalMeasurements];
          }

          return {
            ...ingredient,
            instacart_name: enhanced.optimized_shoppable_name,
            category: enhanced.category,
            scale_type: enhanced.scale_type,
            organic_available: enhanced.organic_available,
            instacart_measurements: instacartMeasurements,
            common_brands: enhanced.common_brands || [],
            health_tags: enhanced.health_tags || []
          };
        } else {
          // Keep original if no enhancement found, but add required fields
          return {
            ...ingredient,
            instacart_name: ingredient.shoppable_name || ingredient.display_name,
            organic_available: false,
            instacart_measurements: [{
              quantity: ingredient.quantity,
              unit: ingredient.unit
            }],
            common_brands: [],
            health_tags: []
          };
        }
      });

      // Update the meal
      const updatedIngredientsJson = {
        ...meal.ingredients_json,
        ingredients: enhancedMealIngredients
      };

      const { error: updateError } = await supabase
        .from('meals')
        .update({
          ingredients_json: updatedIngredientsJson,
          instacart_optimized: true,
          last_instacart_update: new Date().toISOString()
        })
        .eq('id', meal.id);

      if (updateError) {
        console.error(`❌ Error updating meal ${meal.title}:`, updateError);
        errorCount++;
      } else {
        updatedCount++;
        if (updatedCount % 10 === 0) {
          console.log(`✅ Updated ${updatedCount}/${meals.length} meals (${ingredientsEnhanced}/${totalIngredientsProcessed} ingredients enhanced)`);
        }
      }

    } catch (error) {
      console.error(`❌ Error processing meal ${meal.title}:`, error);
      errorCount++;
    }
  }

  console.log('\n📊 Update Complete!');
  console.log(`✅ Successfully updated: ${updatedCount} meals`);
  console.log(`❌ Errors: ${errorCount} meals`);
  console.log(`🎯 Enhanced ingredients: ${ingredientsEnhanced}/${totalIngredientsProcessed} (${Math.round(ingredientsEnhanced/totalIngredientsProcessed*100)}%)`);
  
  // Verify the update
  const { data: verifyData } = await supabase
    .from('meals')
    .select('id, instacart_optimized')
    .eq('instacart_optimized', true);

  console.log(`🔍 Verification: ${verifyData?.length || 0} meals marked as instacart_optimized`);

  // Sample an enhanced ingredient
  if (verifyData && verifyData.length > 0) {
    const { data: sampleMeal } = await supabase
      .from('meals')
      .select('title, ingredients_json')
      .eq('instacart_optimized', true)
      .limit(1)
      .single();

    if (sampleMeal) {
      console.log('\n🔍 Sample Enhanced Ingredient:');
      const sampleIngredient = sampleMeal.ingredients_json?.ingredients?.[0];
      if (sampleIngredient) {
        console.log(`Meal: ${sampleMeal.title}`);
        console.log(`Original name: ${sampleIngredient.display_name}`);
        console.log(`Instacart name: ${sampleIngredient.instacart_name}`);
        console.log(`Category: ${sampleIngredient.category}`);
        console.log(`Organic available: ${sampleIngredient.organic_available}`);
        console.log(`Measurements:`, JSON.stringify(sampleIngredient.instacart_measurements, null, 2));
        if (sampleIngredient.health_tags?.length > 0) {
          console.log(`Health tags: ${sampleIngredient.health_tags.join(', ')}`);
        }
      }
    }
  }
}

function getAdditionalMeasurements(quantity, unit, category) {
  const additionalMeasurements = [];
  const lowerUnit = unit?.toLowerCase() || '';
  
  // Add weight alternatives
  if (lowerUnit.includes('lb') || lowerUnit.includes('pound')) {
    additionalMeasurements.push({
      quantity: Math.round(quantity * 16 * 100) / 100,
      unit: 'oz'
    });
  } else if (lowerUnit.includes('oz') && !lowerUnit.includes('fl')) {
    additionalMeasurements.push({
      quantity: Math.round(quantity / 16 * 100) / 100,
      unit: 'lb'
    });
  }
  
  // Add volume alternatives
  if (lowerUnit.includes('cup') && quantity >= 1) {
    additionalMeasurements.push({
      quantity: Math.round(quantity * 8 * 100) / 100,
      unit: 'fl oz'
    });
  } else if (lowerUnit.includes('fl oz') && quantity >= 8) {
    additionalMeasurements.push({
      quantity: Math.round(quantity / 8 * 100) / 100,
      unit: 'cups'
    });
  }
  
  // Add tablespoon/teaspoon alternatives
  if (lowerUnit.includes('tbsp') && quantity >= 3) {
    additionalMeasurements.push({
      quantity: Math.round(quantity * 3 * 100) / 100,
      unit: 'tsp'
    });
  } else if (lowerUnit.includes('tsp') && quantity >= 1) {
    additionalMeasurements.push({
      quantity: Math.round(quantity / 3 * 100) / 100,
      unit: 'tbsp'
    });
  }
  
  return additionalMeasurements;
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  updateMealsWithEnhancedIngredients().catch(console.error);
}

export { updateMealsWithEnhancedIngredients };