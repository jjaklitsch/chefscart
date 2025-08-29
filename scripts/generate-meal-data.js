#!/usr/bin/env node

/**
 * ChefsCart Meal Data Generator
 * 
 * Generates comprehensive meal data using OpenAI GPT-4 and stores it in Supabase.
 * Updated to include new schema fields: prep_time, cook_time, cooking_difficulty
 */

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Validation
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('❌ Missing OpenAI API key in .env.local');
  process.exit(1);
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Test meals for generation
const TEST_MEALS = [
  'Low-Carb Baked Cod with Ratatouille',
  'Niçoise Salad Bowl',
  'Mediterranean Chickpea Stew',
  'Asian-Style Grilled Chicken with Vegetables',
  'Vegetarian Black Bean Tacos'
];

// Ingredient categories for the normalized schema
const INGREDIENT_CATEGORIES = [
  'Oils & Vinegars', 'Sauces', 'Spices & Seasonings', 'Rice & Grains', 'Pasta', 'Meat & Poultry', 'Seafood',
  'Produce', 'Fresh Herbs', 'Dairy & Eggs', 'Canned Goods', 
  'Frozen', 'Pantry Staples', 'Condiments', 'Nuts & Seeds'
];

// OpenAI prompt for meal generation
const GENERATION_PROMPT = `You are a professional recipe developer. Generate a comprehensive meal data object for the given meal name.

IMPORTANT: Include the new timing and difficulty fields:
- prep_time: Preparation time in minutes (integer)
- cook_time: Active cooking time in minutes (integer) 
- cooking_difficulty: One of "easy", "medium", or "challenging"

IMPORTANT: Use the NEW NORMALIZED INGREDIENT SCHEMA with these required fields:
- display_name: Original recipe ingredient name (e.g., "fresh cod fillets")
- shoppable_name: Simplified shopping name in Title Case (e.g., "Cod Fillets")
- quantity: Numeric amount
- unit: Unit of measurement (cup, tsp, lb, count, etc.)
- category: One of [${INGREDIENT_CATEGORIES.join(', ')}]
- scale_type: "linear" (most ingredients), "fixed" (spices), or "sqrt" (some oils/liquids)
- optional: boolean - true if ingredient is optional

The response must be valid JSON matching this exact schema:

{
  "slug": "url-friendly-meal-name",
  "title": "Proper Meal Title",
  "description": "Appetizing 2-3 sentence description that makes you want to cook it",
  "courses": ["lunch", "dinner"],
  "cuisines": ["Mediterranean", "French"],
  "diets_supported": ["mediterranean"],
  "primary_ingredient": "fish",
  "spice_level": 2,
  "prep_time": 15,
  "cook_time": 25,
  "cooking_difficulty": "easy",
  "time_total_min": 40,
  "servings_default": 2,
  "servings_min": 1,
  "servings_max": 4,
  "cost_per_serving": "$",
  "allergens_present": ["Fish"],
  "search_keywords": ["cod", "ratatouille", "low-carb", "mediterranean", "healthy"],
  "ingredients_json": {
    "servings": 2,
    "ingredients": [
      {
        "display_name": "fresh cod fillets (skin removed)",
        "shoppable_name": "Cod Fillets",
        "quantity": 1.5,
        "unit": "lb",
        "category": "Seafood",
        "scale_type": "linear",
        "optional": false
      },
      {
        "display_name": "extra virgin olive oil",
        "shoppable_name": "Olive Oil",
        "quantity": 2,
        "unit": "tbsp",
        "category": "Oils & Vinegars",
        "scale_type": "linear",
        "optional": false
      },
      {
        "display_name": "kosher salt",
        "shoppable_name": "Salt",
        "quantity": 1,
        "unit": "tsp",
        "category": "Spices & Seasonings",
        "scale_type": "fixed",
        "optional": false
      }
    ]
  },
  "instructions_json": {
    "prep_time": 15,
    "cook_time": 25,
    "total_time": 40,
    "steps": [
      {
        "step": 1,
        "instruction": "Preheat oven to 400°F and prepare baking dish",
        "time_minutes": 5
      }
    ]
  }
}

Guidelines:
- prep_time + cook_time should equal time_total_min
- cooking_difficulty: Assess based on TECHNIQUE and SKILL REQUIRED, not just time:
  * EASY: Simple techniques, forgiving recipes (roasted vegetables, basic pasta, grilled chicken)
  * MEDIUM: Some technique required, moderate attention (stir-fry, braised meats, basic sauces)
  * CHALLENGING: Complex techniques, high skill, easy to mess up (risotto, soufflé, perfect steak, emulsification)
- courses: ONLY use "breakfast", "lunch", or "dinner" (lowercase). Use this logic:
  * BREAKFAST: Traditional breakfast foods, anything with "breakfast" in the name, eggs, pancakes, waffles, muffins, granola
  * LUNCH/DINNER: Most main courses, soups, salads, proteins - these are typically interchangeable
  * If meal name contains "breakfast" → ALWAYS classify as ["breakfast"] only
  * Breakfast meals are typically breakfast-only, but lunch/dinner meals often work for both
  * Do NOT use "brunch" or "snack" - these are not valid course options
- diets_supported should only include diets the meal strictly complies with
- spice_level: 1-5 scale (1=mild, 5=very spicy)
- cost_per_serving: "$" (budget), "$$" (moderate), "$$$" (premium)  
- allergens_present: common allergens only (Dairy, Eggs, Fish, Shellfish, Tree Nuts, Peanuts, Wheat, Soy)
- search_keywords: 8-12 relevant searchable terms
- ingredients: Use NORMALIZED SCHEMA with proper shoppable_name, category, and scale_type
  * shoppable_name should be simplified in Title Case ("fresh basil leaves" → "Basil")
  * category must be one of the 16 valid categories
  * scale_type: "linear" for most, "fixed" for spices/seasonings, "sqrt" for some oils
- steps should be clear and include timing where relevant

Generate data for: "{MEAL_NAME}"`;

async function generateMealData(mealName) {
  console.log(`🤖 Generating data for: ${mealName}`);
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'developer',
          content: GENERATION_PROMPT.replace('{MEAL_NAME}', mealName)
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    const content = response.choices[0].message.content;
    
    // Try to parse JSON from the response
    let mealData;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      mealData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error(`❌ Failed to parse JSON for ${mealName}:`, parseError.message);
      console.log('Raw response:', content);
      return null;
    }

    // Validate required fields
    const requiredFields = [
      'slug', 'title', 'description', 'courses', 'cuisines', 
      'prep_time', 'cook_time', 'cooking_difficulty', 'time_total_min',
      'servings_default', 'ingredients_json', 'instructions_json'
    ];

    const missingFields = requiredFields.filter(field => !mealData[field]);
    if (missingFields.length > 0) {
      console.error(`❌ Missing required fields for ${mealName}:`, missingFields);
      return null;
    }

    // Validate time consistency
    if (mealData.prep_time + mealData.cook_time !== mealData.time_total_min) {
      console.warn(`⚠️  Time inconsistency for ${mealName}: prep + cook != total`);
    }

    // Validate cooking difficulty
    const validDifficulties = ['easy', 'medium', 'challenging'];
    if (!validDifficulties.includes(mealData.cooking_difficulty)) {
      console.error(`❌ Invalid cooking_difficulty for ${mealName}: ${mealData.cooking_difficulty}`);
      return null;
    }

    console.log(`✅ Generated data for: ${mealName}`);
    return mealData;

  } catch (error) {
    console.error(`❌ OpenAI error for ${mealName}:`, error.message);
    return null;
  }
}

async function saveMealData(mealData) {
  try {
    const { data, error } = await supabase
      .from('meals')
      .insert([mealData])
      .select()
      .single();

    if (error) throw error;

    console.log(`💾 Saved to database: ${mealData.title}`);
    return data;

  } catch (error) {
    console.error(`❌ Database error for ${mealData.title}:`, error.message);
    return null;
  }
}

async function saveBackupFile(mealData) {
  const backupDir = path.join(__dirname, 'generated-meals');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const filename = `${mealData.slug}.json`;
  const filepath = path.join(backupDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(mealData, null, 2));
  console.log(`💾 Backup saved: ${filename}`);
}

async function main() {
  console.log('🚀 Starting ChefsCart Meal Data Generation');
  console.log(`📊 Processing ${TEST_MEALS.length} meals\n`);

  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };

  for (const mealName of TEST_MEALS) {
    console.log(`\n📋 Processing: ${mealName}`);
    
    // Generate meal data
    const mealData = await generateMealData(mealName);
    if (!mealData) {
      results.failed++;
      results.errors.push(`Failed to generate: ${mealName}`);
      continue;
    }

    // Save backup
    await saveBackupFile(mealData);

    // Save to database
    const savedData = await saveMealData(mealData);
    if (savedData) {
      results.successful++;
    } else {
      results.failed++;
      results.errors.push(`Failed to save: ${mealName}`);
    }

    // Rate limiting - wait between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🎉 Generation Complete!');
  console.log(`✅ Successful: ${results.successful}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(error => console.log(`  - ${error}`));
  }

  console.log(`\n📁 Backup files saved to: scripts/generated-meals/`);
  console.log(`💾 Database records created in Supabase meals table`);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { generateMealData, saveMealData };