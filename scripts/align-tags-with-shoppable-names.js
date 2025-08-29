#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function alignTagsWithShoppableNames() {
  console.log('🔧 Aligning ingredient_tags and primary_ingredient with shoppable_names...\n');
  
  // Get all meals with normalized ingredients
  const { data: meals, error } = await supabase
    .from('meals')
    .select('id, title, ingredients_json, ingredient_tags, primary_ingredient')
    .not('ingredients_json', 'is', null);
    
  if (error) {
    throw new Error(`Failed to fetch meals: ${error.message}`);
  }
  
  const updates = [];
  let aligned = 0;
  let needsUpdate = 0;
  
  for (const meal of meals) {
    const ingredients = meal.ingredients_json?.ingredients || [];
    
    // Skip if not normalized yet
    if (!ingredients[0] || !('shoppable_name' in ingredients[0])) {
      continue;
    }
    
    const shoppableNames = ingredients.map(ing => ing.shoppable_name);
    const currentTags = meal.ingredient_tags || [];
    const currentPrimary = meal.primary_ingredient;
    
    // Create new tags from shoppable names
    const newTags = [...new Set(shoppableNames)]; // Remove duplicates
    
    // Try to find best primary ingredient match
    let newPrimary = currentPrimary;
    if (currentPrimary && !shoppableNames.includes(currentPrimary)) {
      // Look for close matches
      const closeMatch = shoppableNames.find(name => 
        name.toLowerCase().includes(currentPrimary.toLowerCase()) ||
        currentPrimary.toLowerCase().includes(name.toLowerCase())
      );
      
      if (closeMatch) {
        newPrimary = closeMatch;
      } else {
        // Default to first ingredient if no good match
        newPrimary = shoppableNames[0];
      }
    }
    
    // Check if update is needed
    const tagsMatch = JSON.stringify(currentTags.sort()) === JSON.stringify(newTags.sort());
    const primaryMatches = currentPrimary === newPrimary;
    
    if (!tagsMatch || !primaryMatches) {
      updates.push({
        id: meal.id,
        title: meal.title,
        ingredient_tags: newTags,
        primary_ingredient: newPrimary
      });
      needsUpdate++;
    } else {
      aligned++;
    }
  }
  
  console.log(`📊 Analysis Results:`);
  console.log(`   ✅ Already aligned: ${aligned} meals`);
  console.log(`   🔄 Need updates: ${needsUpdate} meals`);
  
  if (updates.length === 0) {
    console.log('🎉 All meals already aligned!');
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
            ingredient_tags: update.ingredient_tags,
            primary_ingredient: update.primary_ingredient
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
    console.log('🎉 Tag alignment completed successfully!');
  }
}

async function main() {
  try {
    await alignTagsWithShoppableNames();
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}