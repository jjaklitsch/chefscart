#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Convert text to proper title case
function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

async function fixShoppableNamesToTitleCase() {
  console.log('🔧 Converting shoppable_name fields to title case...\n');
  
  // Get all meals with ingredients_json
  const { data: meals, error } = await supabase
    .from('meals')
    .select('id, title, ingredients_json')
    .not('ingredients_json', 'is', null);
    
  if (error) {
    throw new Error(`Failed to fetch meals: ${error.message}`);
  }
  
  const updates = [];
  let changed = 0;
  let unchanged = 0;
  
  for (const meal of meals) {
    const ingredients = meal.ingredients_json?.ingredients || [];
    
    // Skip if not normalized yet (no shoppable_name field)
    if (!ingredients[0] || !('shoppable_name' in ingredients[0])) {
      continue;
    }
    
    let hasChanges = false;
    const updatedIngredients = ingredients.map(ingredient => {
      const currentShoppableName = ingredient.shoppable_name;
      const titleCaseShoppableName = toTitleCase(currentShoppableName);
      
      if (currentShoppableName !== titleCaseShoppableName) {
        hasChanges = true;
        return {
          ...ingredient,
          shoppable_name: titleCaseShoppableName
        };
      }
      
      return ingredient;
    });
    
    if (hasChanges) {
      updates.push({
        id: meal.id,
        title: meal.title,
        ingredients_json: {
          ...meal.ingredients_json,
          ingredients: updatedIngredients
        }
      });
      changed++;
    } else {
      unchanged++;
    }
  }
  
  console.log(`📊 Analysis Results:`);
  console.log(`   ✅ Already title case: ${unchanged} meals`);
  console.log(`   🔄 Need updates: ${changed} meals`);
  
  if (updates.length === 0) {
    console.log('🎉 All shoppable names already in title case!');
    return;
  }
  
  console.log(`\n📝 Updating ${updates.length} meals...`);
  
  // Update in batches
  const batchSize = 20;
  let updated = 0;
  let failed = 0;
  
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    
    for (const update of batch) {
      try {
        const { error: updateError } = await supabase
          .from('meals')
          .update({
            ingredients_json: update.ingredients_json,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);
          
        if (updateError) {
          console.error(`❌ Failed to update ${update.title}:`, updateError.message);
          failed++;
        } else {
          console.log(`✅ Updated: ${update.title}`);
          updated++;
        }
      } catch (error) {
        console.error(`❌ Error updating ${update.title}:`, error.message);
        failed++;
      }
    }
    
    // Small delay between batches
    if (i + batchSize < updates.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`\n🎯 Final Results:`);
  console.log(`   ✅ Successfully updated: ${updated} meals`);
  console.log(`   ❌ Failed: ${failed} meals`);
  
  if (updated > 0) {
    console.log('🎉 Shoppable name title case conversion completed successfully!');
  }
}

async function main() {
  try {
    await fixShoppableNamesToTitleCase();
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}