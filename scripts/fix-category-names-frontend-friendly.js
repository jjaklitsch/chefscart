#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Mapping of old category names to new frontend-friendly names
const CATEGORY_MAPPINGS = {
  'herb_bunch': 'Fresh Herbs',
  'nuts_seeds': 'Nuts & Seeds', 
  'grain_dry': 'Rice & Grains',
  'pasta_dry': 'Pasta',
  'produce_count': 'Produce',
  'produce_weight': 'Produce',
  'pantry_dry': 'Pantry Staples',
  'oil': 'Oils & Vinegars',
  'sauce': 'Sauces',
  'spice': 'Spices & Seasonings',
  'meat': 'Meat & Poultry',
  'fish': 'Seafood',
  'dairy': 'Dairy & Eggs',
  'canned': 'Canned Goods',
  'frozen': 'Frozen',
  'condiment': 'Condiments'
};

async function fixCategoryNamesToFrontendFriendly() {
  console.log('🔧 Converting category names to frontend-friendly versions...\n');
  
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
    
    // Skip if not normalized yet (no category field)
    if (!ingredients[0] || !('category' in ingredients[0])) {
      continue;
    }
    
    let hasChanges = false;
    const updatedIngredients = ingredients.map(ingredient => {
      const currentCategory = ingredient.category;
      const newCategory = CATEGORY_MAPPINGS[currentCategory] || currentCategory;
      
      if (currentCategory !== newCategory) {
        hasChanges = true;
        return {
          ...ingredient,
          category: newCategory
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
  console.log(`   ✅ Already frontend-friendly: ${unchanged} meals`);
  console.log(`   🔄 Need updates: ${changed} meals`);
  
  if (updates.length === 0) {
    console.log('🎉 All category names already frontend-friendly!');
    return;
  }
  
  console.log(`\n📝 Updating ${updates.length} meals...`);
  
  // Show what mappings will be applied
  console.log('\n🔄 Category mappings being applied:');
  Object.entries(CATEGORY_MAPPINGS).forEach(([old, newName]) => {
    console.log(`   ${old} → ${newName}`);
  });
  console.log('');
  
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
    console.log('🎉 Category name frontend-friendly conversion completed successfully!');
  }
}

async function main() {
  try {
    await fixCategoryNamesToFrontendFriendly();
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}