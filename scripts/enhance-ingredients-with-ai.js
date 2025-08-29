import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.local' });

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Our category options for AI
const CATEGORY_OPTIONS = [
  'Fresh Produce', 'Fresh Herbs', 'Meat & Poultry', 'Seafood', 'Dairy & Eggs',
  'Grains & Rice', 'Pasta & Noodles', 'Canned Goods', 'Condiments & Sauces',
  'Oils & Vinegars', 'Spices & Seasonings', 'Baking & Pantry Staples',
  'Nuts & Seeds', 'Frozen Foods', 'Bread & Bakery', 'International'
];

// Health filter options based on research
const HEALTH_FILTER_OPTIONS = [
  'Organic', 'Gluten Free', 'Dairy Free', 'Vegan', 'Vegetarian', 'Keto',
  'Low Sodium', 'Sugar Free', 'High Protein', 'Heart Healthy', 'Grass Fed',
  'Wild Caught', 'Pasture Raised', 'Non-GMO'
];

async function fetchIngredientsData() {
  console.log('📊 Fetching ingredients data from Supabase...');
  
  const { data: meals, error } = await supabase
    .from('meals')
    .select('id, title, ingredients_json')
    .not('ingredients_json', 'is', null)
    .limit(50); // Start with first 50 meals for testing

  if (error) {
    console.error('Error fetching meals:', error);
    return [];
  }

  // Extract all unique ingredients
  const ingredientsMap = new Map();
  
  meals.forEach(meal => {
    const ingredients = meal.ingredients_json?.ingredients || [];
    ingredients.forEach((ingredient, index) => {
      const key = ingredient.shoppable_name || ingredient.display_name;
      
      if (!ingredientsMap.has(key)) {
        ingredientsMap.set(key, {
          meal_id: meal.id,
          meal_title: meal.title,
          ingredient_index: index,
          display_name: ingredient.display_name,
          shoppable_name: ingredient.shoppable_name || ingredient.display_name,
          current_quantity: ingredient.quantity,
          current_unit: ingredient.unit,
          current_category: ingredient.category || 'unknown',
          current_scale_type: ingredient.scale_type || 'linear'
        });
      }
    });
  });

  console.log(`📋 Found ${ingredientsMap.size} unique ingredients across ${meals.length} meals`);
  return Array.from(ingredientsMap.values());
}

async function analyzeIngredientWithAI(ingredient) {
  const prompt = `You are an expert in grocery shopping and food ingredients. For this ingredient, provide a JSON response with EXACTLY this structure:

INGREDIENT: ${ingredient.shoppable_name}
CURRENT CATEGORY: ${ingredient.current_category}
USED IN: ${ingredient.meal_title}

Return valid JSON only:
{
  "optimized_shoppable_name": "Simple name for Instacart search (e.g., 'Ground Beef' not 'grass-fed ground beef')",
  "category": "Pick ONE from: ${CATEGORY_OPTIONS.join(', ')}",
  "scale_type": "Pick ONE: linear, fixed, sqrt (linear=scales with servings, fixed=doesn't scale like salt, sqrt=scales slower)",
  "organic_available": true or false,
  "instacart_measurements": [
    {"quantity": ${ingredient.current_quantity}, "unit": "${ingredient.current_unit}"}
  ],
  "common_brands": [],
  "health_tags": []
}

Rules:
- Keep optimized_shoppable_name simple and searchable
- organic_available=true for produce/meat/dairy, false for processed items
- Only add common_brands if you know specific major brands
- Only add health_tags that specifically apply from: ${HEALTH_FILTER_OPTIONS.join(', ')}
- For instacart_measurements, add 1-2 alternative units if practical (lb↔oz, cups↔fl oz)`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 500
    });

    let content = response.choices[0].message.content;
    
    // Remove markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const aiResponse = JSON.parse(content);
    
    // Validate the response has required fields
    const required = ['optimized_shoppable_name', 'category', 'scale_type', 'organic_available'];
    const missing = required.filter(field => !(field in aiResponse));
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    return {
      ...ingredient,
      ...aiResponse,
      ai_processed: true,
      processed_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Error analyzing ${ingredient.shoppable_name}:`, error.message);
    
    // Return original data with minimal enhancements as fallback
    return {
      ...ingredient,
      optimized_shoppable_name: ingredient.shoppable_name,
      category: ingredient.current_category,
      scale_type: ingredient.current_scale_type,
      organic_available: false,
      instacart_measurements: [{
        quantity: ingredient.current_quantity,
        unit: ingredient.current_unit
      }],
      common_brands: [],
      health_tags: [],
      ai_processed: false,
      error: error.message
    };
  }
}

async function processAllIngredients() {
  const ingredients = await fetchIngredientsData();
  
  if (ingredients.length === 0) {
    console.log('❌ No ingredients found to process');
    return;
  }

  console.log(`🤖 Starting AI analysis of ${ingredients.length} ingredients...`);
  console.log('This may take a few minutes...\n');

  const enhancedIngredients = [];
  const batchSize = 3; // Small batches to avoid rate limits
  
  for (let i = 0; i < ingredients.length; i += batchSize) {
    const batch = ingredients.slice(i, i + batchSize);
    const batchPromises = batch.map(ingredient => analyzeIngredientWithAI(ingredient));
    
    try {
      const batchResults = await Promise.all(batchPromises);
      enhancedIngredients.push(...batchResults);
      
      const processed = i + batchResults.length;
      console.log(`✅ Processed ${processed}/${ingredients.length} ingredients`);
      
      // Log a sample result
      if (batchResults[0]?.ai_processed) {
        console.log(`   Sample: "${batchResults[0].shoppable_name}" → "${batchResults[0].optimized_shoppable_name}" (${batchResults[0].category})`);
      }
      
    } catch (error) {
      console.error(`❌ Batch error:`, error);
    }
    
    // Rate limiting pause between batches
    if (i + batchSize < ingredients.length) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second pause
    }
  }

  // Save results
  const outputFile = 'enhanced_ingredients.json';
  fs.writeFileSync(outputFile, JSON.stringify(enhancedIngredients, null, 2));
  
  // Generate summary
  const successCount = enhancedIngredients.filter(ing => ing.ai_processed).length;
  const failCount = enhancedIngredients.length - successCount;
  
  console.log('\n📊 Processing Complete!');
  console.log(`✅ Successfully processed: ${successCount} ingredients`);
  console.log(`❌ Failed/fallback: ${failCount} ingredients`);
  console.log(`💾 Results saved to: ${outputFile}`);
  
  // Show category distribution
  const categories = {};
  enhancedIngredients.forEach(ing => {
    categories[ing.category] = (categories[ing.category] || 0) + 1;
  });
  
  console.log('\n📋 Category Distribution:');
  Object.entries(categories)
    .sort(([,a], [,b]) => b - a)
    .forEach(([category, count]) => {
      console.log(`   ${category}: ${count}`);
    });

  return enhancedIngredients;
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  processAllIngredients().catch(console.error);
}

export { processAllIngredients };