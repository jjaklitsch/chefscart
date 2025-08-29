/**
 * Apply Ingredient Standardization Script
 * 
 * Uses the output from ai-ingredient-standardization.js to update the meals database
 * with standardized ingredient names.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Load the latest ingredient mapping file
 */
async function loadLatestMapping() {
  const files = await fs.readdir(__dirname);
  const mappingFiles = files
    .filter(f => f.startsWith('ingredient-mapping-') && f.endsWith('.json'))
    .sort()
    .reverse(); // Get latest first
  
  if (mappingFiles.length === 0) {
    throw new Error('No ingredient mapping files found. Run ai-ingredient-standardization.js first.');
  }
  
  const latestFile = mappingFiles[0];
  console.log(`📂 Loading mapping from: ${latestFile}`);
  
  const content = await fs.readFile(path.join(__dirname, latestFile), 'utf8');
  return JSON.parse(content);
}

/**
 * Update a single meal's ingredients
 */
function updateMealIngredients(ingredients, mapping) {
  let updated = false;
  
  const updatedIngredients = ingredients.map(ingredient => {
    const originalName = ingredient.shoppable_name;
    const mappingEntry = mapping.find(m => m.original_name === originalName);
    
    if (mappingEntry && mappingEntry.changed) {
      console.log(`    ✏️ ${originalName} → ${mappingEntry.standardized_name}`);
      updated = true;
      return {
        ...ingredient,
        shoppable_name: mappingEntry.standardized_name
      };
    }
    
    return ingredient;
  });
  
  return { updatedIngredients, updated };
}

/**
 * Apply standardization to all meals
 */
async function applyStandardization(mapping, dryRun = true) {
  console.log(`🔄 ${dryRun ? 'DRY RUN - ' : ''}Applying ingredient standardization...`);
  
  // Get all meals
  const { data: meals, error } = await supabase
    .from('meals')
    .select('id, title, ingredients_json');
    
  if (error) {
    throw new Error(`Failed to fetch meals: ${error.message}`);
  }
  
  console.log(`📊 Processing ${meals.length} meals...`);
  
  let mealsUpdated = 0;
  let totalIngredientChanges = 0;
  const updates = [];
  
  for (const meal of meals) {
    const ingredients = meal.ingredients_json?.ingredients || [];
    if (ingredients.length === 0) continue;
    
    const { updatedIngredients, updated } = updateMealIngredients(ingredients, mapping);
    
    if (updated) {
      mealsUpdated++;
      const changedCount = ingredients.length;
      totalIngredientChanges += changedCount;
      
      console.log(`  📝 ${meal.title}: ${changedCount} ingredients updated`);
      
      updates.push({
        id: meal.id,
        title: meal.title,
        ingredients_json: {
          ...meal.ingredients_json,
          ingredients: updatedIngredients
        }
      });
      
      if (!dryRun) {
        // Update the meal in database
        const { error: updateError } = await supabase
          .from('meals')
          .update({
            ingredients_json: {
              ...meal.ingredients_json,
              ingredients: updatedIngredients
            }
          })
          .eq('id', meal.id);
          
        if (updateError) {
          console.error(`❌ Failed to update meal ${meal.title}:`, updateError.message);
        }
      }
    }
  }
  
  console.log(`\n📈 Summary:`);
  console.log(`   🍽️ Meals updated: ${mealsUpdated}/${meals.length}`);
  console.log(`   🥄 Total ingredient changes: ${totalIngredientChanges}`);
  
  if (dryRun) {
    console.log(`\n⚠️ DRY RUN MODE - No changes were saved to database`);
    console.log(`   Run with --apply flag to actually update the database`);
    
    // Save dry run results for review
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await fs.writeFile(
      path.join(__dirname, `standardization-dry-run-${timestamp}.json`),
      JSON.stringify(updates, null, 2)
    );
    console.log(`   💾 Dry run results saved for review`);
  }
  
  return {
    mealsUpdated,
    totalIngredientChanges,
    updates
  };
}

/**
 * Main execution function
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--apply');
    
    console.log('🚀 Starting ingredient standardization application...\n');
    
    // Load mapping
    const mapping = await loadLatestMapping();
    const changedMappings = mapping.filter(m => m.changed);
    
    console.log(`📋 Ingredient mapping loaded:`);
    console.log(`   📊 Total ingredients: ${mapping.length}`);
    console.log(`   🔄 Changes to apply: ${changedMappings.length}`);
    console.log(`   📌 Unchanged: ${mapping.length - changedMappings.length}`);
    
    if (changedMappings.length === 0) {
      console.log('✅ No changes to apply!');
      return;
    }
    
    console.log(`\n🔧 Top 10 most frequently changed ingredients:`);
    changedMappings
      .sort((a, b) => b.used_in_meals - a.used_in_meals)
      .slice(0, 10)
      .forEach(mapping => {
        console.log(`   • ${mapping.original_name} → ${mapping.standardized_name} (${mapping.used_in_meals} meals)`);
      });
    
    console.log('');
    
    // Apply changes
    await applyStandardization(mapping, dryRun);
    
    if (dryRun) {
      console.log('\n🎯 Next steps:');
      console.log('   1. Review the dry run results');
      console.log('   2. Run with --apply flag to update database:');
      console.log('      node apply-ingredient-standardization.js --apply');
    } else {
      console.log('\n🎉 Ingredient standardization applied successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error applying standardization:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = {
  loadLatestMapping,
  updateMealIngredients,
  applyStandardization
};