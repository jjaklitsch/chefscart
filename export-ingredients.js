const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function exportIngredientsToCSV() {
  console.log('📊 Fetching meals data from Supabase...');
  
  // Fetch all meals with ingredients
  const { data: meals, error } = await supabase
    .from('meals')
    .select('id, slug, title, ingredients_json, primary_ingredient, ingredient_tags, ingredients_canonical')
    .order('id');
    
  if (error) {
    console.error('Error fetching meals:', error);
    return;
  }
  
  console.log(`✅ Found ${meals.length} meals`);
  
  // Create CSV header
  let csvContent = 'meal_id,meal_slug,meal_title,servings,ingredient_index,quantity,unit,display_name,shoppable_name,category,optional,scale_type,notes\n';
  
  let totalIngredients = 0;
  
  // Process each meal
  meals.forEach(meal => {
    if (meal.ingredients_json && meal.ingredients_json.ingredients && Array.isArray(meal.ingredients_json.ingredients)) {
      const servings = meal.ingredients_json.servings || 4;
      
      meal.ingredients_json.ingredients.forEach((ingredient, index) => {
        totalIngredients++;
        
        // Escape fields that might contain commas or quotes
        const escapeField = (field) => {
          if (field === null || field === undefined) return '';
          const str = String(field);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
          }
          return str;
        };
        
        const row = [
          meal.id,
          escapeField(meal.slug),
          escapeField(meal.title),
          servings,
          index + 1,
          escapeField(ingredient.quantity || ''),
          escapeField(ingredient.unit || ''),
          escapeField(ingredient.display_name || ingredient.item || ''),
          escapeField(ingredient.shoppable_name || ''),
          escapeField(ingredient.category || ''),
          ingredient.optional === true ? 'true' : 'false',
          escapeField(ingredient.scale_type || 'linear'),
          escapeField(ingredient.notes || '')
        ].join(',');
        
        csvContent += row + '\n';
      });
    }
  });
  
  // Write to file
  const filename = 'meals_ingredients_export.csv';
  fs.writeFileSync(filename, csvContent);
  
  console.log(`\n✅ CSV exported to: ${filename}`);
  
  // Show sample of data
  const lines = csvContent.split('\n');
  console.log('\n📋 Sample of exported data (first 5 ingredients):');
  console.log(lines.slice(0, 6).join('\n'));
  console.log('...');
  
  console.log(`\n📈 Statistics:`);
  console.log(`   • Total meals: ${meals.length}`);
  console.log(`   • Total ingredients: ${totalIngredients}`);
  console.log(`   • Average ingredients per meal: ${Math.round(totalIngredients/meals.length)}`);
  
  // Get unique categories and shoppable names
  const categories = new Set();
  const shoppableNames = new Set();
  
  meals.forEach(meal => {
    if (meal.ingredients_json && meal.ingredients_json.ingredients) {
      meal.ingredients_json.ingredients.forEach(ing => {
        if (ing.category) categories.add(ing.category);
        if (ing.shoppable_name) shoppableNames.add(ing.shoppable_name);
      });
    }
  });
  
  console.log(`   • Unique ingredient categories: ${categories.size}`);
  console.log(`   • Unique shoppable items: ${shoppableNames.size}`);
}

exportIngredientsToCSV();