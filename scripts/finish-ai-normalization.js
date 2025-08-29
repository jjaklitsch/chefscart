#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
require('dotenv').config({ path: '../.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const INGREDIENT_CATEGORIES = [
  'Oils & Vinegars', 'Sauces', 'Spices & Seasonings', 'Rice & Grains', 'Pasta', 
  'Meat & Poultry', 'Seafood', 'Produce', 'Fresh Herbs', 'Dairy & Eggs', 
  'Canned Goods', 'Frozen', 'Pantry Staples', 'Condiments', 'Nuts & Seeds'
];

async function findMealsNeedingNormalization() {
  console.log('🔍 Finding meals that still need normalization...');
  
  const { data: meals, error } = await supabase
    .from('meals')
    .select('id, title, ingredients_json')
    .not('ingredients_json', 'is', null);
    
  if (error) {
    throw new Error(`Failed to fetch meals: ${error.message}`);
  }
  
  const mealsToNormalize = meals.filter(meal => {
    const ingredients = meal.ingredients_json?.ingredients || [];
    const firstIngredient = ingredients[0];
    return firstIngredient && ('ml' in firstIngredient || 'grams' in firstIngredient);
  });
  
  console.log(`📊 Found ${mealsToNormalize.length} meals needing normalization`);
  return mealsToNormalize;
}

function createNormalizationPrompt(meal, ingredientsJson) {
  return `You are an expert chef and ingredient specialist. Transform these meal ingredients from the old schema to the new normalized schema.

MEAL: "${meal.title}"

CURRENT INGREDIENTS (old schema):
${JSON.stringify(ingredientsJson.ingredients, null, 2)}

TRANSFORM TO NEW SCHEMA:
- Keep: display_name (original recipe name), quantity, unit, optional, notes (if meaningful)
- Add: shoppable_name (normalized name for shopping), category, scale_type
- Remove: ml, grams (redundant conversion fields)

RULES:
1. shoppable_name: Simplified name for shopping in Title Case (e.g., "raw large shrimp (peeled, deveined)" → "Large Shrimp")
2. category: Choose from [${INGREDIENT_CATEGORIES.join(', ')}]
3. scale_type: 
   - "linear" for most ingredients (scales with servings)
   - "fixed" for spices/seasonings (don't scale much)
   - "sqrt" for some liquids/oils (diminishing returns)
4. Keep notes only if they provide cooking guidance
5. Use the primary unit (quantity/unit), ignore ml/grams duplicates
6. Preserve optional flag accurately

OUTPUT FORMAT (JSON only):
{
  "servings": ${ingredientsJson.servings},
  "ingredients": [
    {
      "display_name": "original recipe name",
      "shoppable_name": "Simplified Shopping Name (Title Case)", 
      "quantity": number,
      "unit": "string",
      "category": "category_from_list",
      "scale_type": "linear|fixed|sqrt",
      "optional": boolean,
      "notes": "cooking guidance (optional field)"
    }
  ]
}`;
}

async function normalizeMealIngredients(meal) {
  try {
    const prompt = createNormalizationPrompt(meal, meal.ingredients_json);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'developer', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 3000
    });
    
    const content = response.choices[0].message.content.trim();
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }
    
    const normalizedData = JSON.parse(jsonMatch[0]);
    
    // Validate the structure
    if (!normalizedData.ingredients || !Array.isArray(normalizedData.ingredients)) {
      throw new Error('Invalid ingredients structure');
    }
    
    // Validate each ingredient has required fields
    for (const ingredient of normalizedData.ingredients) {
      const required = ['display_name', 'shoppable_name', 'quantity', 'unit', 'category', 'scale_type', 'optional'];
      for (const field of required) {
        if (!(field in ingredient)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      if (!INGREDIENT_CATEGORIES.includes(ingredient.category)) {
        throw new Error(`Invalid category: ${ingredient.category}`);
      }
    }
    
    return normalizedData;
    
  } catch (error) {
    console.error(`❌ Failed to normalize ${meal.title}:`, error.message);
    return null;
  }
}

async function updateMealInDatabase(mealId, normalizedIngredients) {
  const { error } = await supabase
    .from('meals')
    .update({ 
      ingredients_json: normalizedIngredients,
      updated_at: new Date().toISOString()
    })
    .eq('id', mealId);
    
  if (error) {
    throw new Error(`Database update failed: ${error.message}`);
  }
}

async function processInBatches(meals, batchSize = 10) {
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };
  
  for (let i = 0; i < meals.length; i += batchSize) {
    const batch = meals.slice(i, i + batchSize);
    console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(meals.length/batchSize)}`);
    
    const batchPromises = batch.map(async (meal) => {
      try {
        console.log(`  🔄 Normalizing: ${meal.title}`);
        
        const normalizedIngredients = await normalizeMealIngredients(meal);
        if (!normalizedIngredients) {
          results.failed++;
          return;
        }
        
        await updateMealInDatabase(meal.id, normalizedIngredients);
        console.log(`  ✅ Updated: ${meal.title}`);
        results.success++;
        
      } catch (error) {
        console.error(`  ❌ Error processing ${meal.title}:`, error.message);
        results.failed++;
        results.errors.push(`${meal.title}: ${error.message}`);
      }
    });
    
    await Promise.all(batchPromises);
    
    // Small delay between batches to avoid rate limits
    if (i + batchSize < meals.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

async function main() {
  try {
    console.log('🚀 Starting AI normalization of remaining meals...\n');
    
    const mealsToNormalize = await findMealsNeedingNormalization();
    
    if (mealsToNormalize.length === 0) {
      console.log('✨ All meals already normalized!');
      return;
    }
    
    console.log(`📋 Processing ${mealsToNormalize.length} meals...\n`);
    
    const results = await processInBatches(mealsToNormalize, 10);
    
    console.log('\n🎯 FINAL RESULTS:');
    console.log(`✅ Successfully normalized: ${results.success} meals`);
    console.log(`❌ Failed: ${results.failed} meals`);
    
    if (results.errors.length > 0) {
      console.log('\n🚨 Errors:');
      results.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (results.success > 0) {
      console.log('\n🎉 Normalization completed! All meals now use the clean schema.');
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}