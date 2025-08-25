#!/usr/bin/env node

/**
 * ChefsCart Meal Data Generator
 * 
 * This script uses GPT-5-mini to generate comprehensive meal data
 * including ingredients, instructions, nutritional info, and metadata
 * for storage in the Supabase meals database.
 * 
 * Usage: node generate-meal-data.js [--dry-run] [--meals=file.txt]
 */

const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs/promises');
const path = require('path');
const { extractJSON, normalize, validateRequired, allowed } = require('./validators');
const { withBackoff } = require('./retry');

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Script options
const DRY_RUN = process.argv.includes('--dry-run');
const MEAL_FILE = process.argv.find(arg => arg.startsWith('--meals='))?.split('=')[1];

// Validate required environment variables
if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in environment variables');
  process.exit(1);
}

if (!DRY_RUN && !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required for database storage');
  console.log('   Add this to your .env.local file:');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.log('   Note: Service role key bypasses RLS and allows direct database writes.');
  console.log('   Or use --dry-run flag to skip database storage.');
  process.exit(1);
}

if (!DRY_RUN && !SUPABASE_URL) {
  console.error('❌ SUPABASE_URL not found. Please set SUPABASE_URL');
  console.log('   Add this to your .env.local file:');
  console.log('   SUPABASE_URL=https://your-project.supabase.co');
  process.exit(1);
}

// Initialize clients
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = DRY_RUN ? null : createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Default test meal names
const DEFAULT_MEALS = [
  'Low-Carb Baked Cod with Ratatouille',
  'Niçoise Salad Bowl',
  'Grilled Chicken Caesar Salad'
];

/**
 * Load meal names from file or use defaults
 */
async function loadMealNames() {
  if (MEAL_FILE) {
    try {
      const content = await fs.readFile(MEAL_FILE, 'utf-8');
      return content.split('\n').map(line => line.trim()).filter(Boolean);
    } catch (error) {
      console.error(`❌ Failed to load meal file ${MEAL_FILE}:`, error.message);
      process.exit(1);
    }
  }
  return DEFAULT_MEALS;
}

/**
 * Generate slug from meal title
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate comprehensive meal data using ChatGPT-5
 */
async function generateMealData(mealName) {
  console.log(`🤖 Generating data for: ${mealName}`);
  
  // Build dynamic constraint lists from validators
  const cuisineOptions = allowed.cuisines.join('|');
  const dietOptions = allowed.diets.join('|');
  const ingredientOptions = allowed.ingredients.join('|');
  const allergenOptions = allowed.allergens.join('|');
  const costOptions = allowed.cost.join(' | ');
  const unitOptions = allowed.units.join('|');

  const prompt = `You are an expert chef and recipe developer. Generate comprehensive meal data for "${mealName}" in the exact JSON format specified below. Be precise with measurements, cooking times, and categorization.

REQUIREMENTS:
1. Use ChatGPT-5 level detail and accuracy
2. Include realistic ingredient quantities for default serving size
3. Provide step-by-step instructions with individual timing
4. Classify cuisines, diets, allergens accurately against ChefsCart options
5. Set appropriate spice level (1-5 scale)
6. Include comprehensive search keywords for user preference matching

CRITICAL: Respond with VALID JSON ONLY. No extra text, no explanations, no markdown. Check JSON syntax carefully.

RESPONSE FORMAT (JSON only, no extra text):
{
  "slug": "${generateSlug(mealName)}",
  "title": "${mealName}",
  "description": "[2-3 sentence appetizing description highlighting key flavors and cooking method]",
  "courses": ["[lunch|dinner|breakfast|snack - lowercase, array of applicable meals]"],
  "cuisines": ["[MUST be from: ${cuisineOptions} - all lowercase, use closest cultural match]"],
  "diets_supported": ["[MUST be from: ${dietOptions} - all lowercase, ONLY if meal STRICTLY supports without modification]"],
  "primary_ingredient": "[identify the main ingredient/protein - e.g. 'tuna', 'chicken', 'cod', 'pasta', 'beans' - all lowercase]",
  "ingredient_tags": ["[comprehensive list of ALL major ingredients/proteins/foods in meal - lowercase - for matching favorite foods like chicken, pasta, tomatoes, rice, beans]"],
  "spice_level": [1-5 integer where 1=mild, 3=medium, 5=very spicy],
  "time_total_min": [realistic total time in minutes including prep and cook],
  "servings_default": [realistic default serving size for this meal type - consider portion norms],
  "servings_min": [minimum practical servings - consider if scalable to 1 person],
  "servings_max": [maximum practical servings - consider vessel size, complexity, ingredient scaling limits],
  "cost_per_serving": "[${costOptions} - based on ingredient costs]",
  "allergens_present": ["[MUST be from: ${allergenOptions} - all lowercase, common allergens present]"],
  "search_keywords": ["[15-20 searchable terms: ingredients, cooking methods, diet hints, meal types, flavors - all lowercase]"],
  "ingredients_json": {
    "servings": [same as servings_default],
    "ingredients": [
      {
        "display_name": "[ingredient name with preparation notes]",
        "quantity": [number - precise for default servings],
        "unit": "[${unitOptions} - use appropriate unit]",
        "grams": [convert to grams if solid, null if not applicable],
        "ml": [convert to ml if liquid, null if not applicable],
        "optional": [true|false],
        "notes": "[preparation instructions or null]"
      }
    ]
  },
  "instructions_json": {
    "time_total_min": [same as above],
    "steps": [
      {
        "step_no": 1,
        "text": "[detailed cooking step with technique]",
        "time_min": [realistic time for this step]
      }
    ]
  },
  "image_url": null
}

CRITICAL VALIDATION RULES:
- Cuisines: ${allowed.cuisines.join(', ')} - Use closest cultural match
- Diets: ${allowed.diets.join(', ')} - Only if STRICTLY supported without modification  
- Primary ingredient: Identify the main ingredient naturally (e.g. tuna, chicken, cod, pasta, beans)
- Allergens: ${allowed.allergens.join(', ')} - Common allergens present
- Cost: ${allowed.cost.join(', ')} - Realistic ingredient cost estimate
- Units: ${allowed.units.join(', ')} - Standard cooking units
- Lowercase fields: cuisines, diets_supported, primary_ingredient, ingredient_tags, allergens_present, search_keywords
- Normal case: title, description, instructions can use normal capitalization
- Standard conversions: 1 cup=240ml, 1 tbsp=15ml, 1 tsp=5ml, 1 lb=454g, 1 oz=28g
- Total time MUST equal sum of step times
- Instructions should be generic (no specific quantities) for frontend scaling
- ALWAYS include ingredient_tags and search_keywords - don't leave empty

Generate data for: ${mealName}`;

  const generateWithRetry = () => withBackoff(async () => {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 4000,
      reasoning_effort: "minimal",
      response_format: { type: "json_object" }
    });

    return completion.choices[0].message.content.trim();
  }, {
    tries: 3,
    base: 1000,
    shouldRetry: (error) => {
      if (error.status >= 500) return true;
      if (error.status === 429) return true;
      if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') return true;
      return false;
    }
  });

  try {
    const response = await generateWithRetry();
    
    // Extract and parse JSON with robust handling
    let rawData;
    try {
      rawData = extractJSON(response);
    } catch (parseError) {
      console.error(`❌ Failed to extract JSON from response for ${mealName}:`, parseError);
      console.error('Raw response (first 500 chars):', response.substring(0, 500));
      throw new Error(`JSON extraction failed: ${parseError.message}`);
    }

    // Normalize and validate data
    let mealData;
    try {
      mealData = normalize(rawData);
      validateRequired(mealData);
    } catch (validationError) {
      console.error(`❌ Data validation failed for ${mealName}:`, validationError);
      console.error('Parsed data:', JSON.stringify(rawData, null, 2));
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    console.log(`✅ Generated and validated data for: ${mealName}`);
    return mealData;

  } catch (error) {
    console.error(`❌ Failed to generate data for ${mealName}:`, error.message);
    throw error;
  }
}

/**
 * Store meal data in Supabase with idempotent upsert
 */
async function storeMealData(mealData) {
  if (DRY_RUN) {
    console.log(`🔍 DRY RUN - Would store: ${mealData.title}`);
    return { id: 'dry-run-id', slug: mealData.slug, title: mealData.title };
  }

  console.log(`💾 Upserting: ${mealData.title}`);
  
  const upsertWithRetry = () => withBackoff(async () => {
    const { data, error } = await supabase
      .from('meals')
      .upsert([mealData], { 
        onConflict: 'slug',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error(`❌ Supabase upsert error for ${mealData.title}:`, error);
      throw error;
    }

    return data[0];
  }, {
    tries: 3,
    base: 500,
    shouldRetry: (error) => {
      // Retry on database connection errors and server errors
      if (error.code === 'PGRST116') return false; // Schema validation - don't retry
      if (error.message?.includes('violates')) return false; // Constraint violation - don't retry
      return true; // Retry other errors (network, timeout, etc.)
    }
  });

  try {
    const stored = await upsertWithRetry();
    console.log(`✅ Stored: ${mealData.title} (ID: ${stored.id})`);
    return stored;

  } catch (error) {
    console.error(`❌ Failed to store ${mealData.title}:`, error.message);
    throw error;
  }
}

/**
 * Process a single meal
 */
async function processMeal(mealName) {
  try {
    // Generate meal data
    const mealData = await generateMealData(mealName);
    
    // Store in database
    const stored = await storeMealData(mealData);
    
    // Save to local file for backup/review
    const filename = `${mealData.slug}.json`;
    const filepath = path.join(process.cwd(), 'scripts', 'generated-meals', filename);
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(mealData, null, 2));
    
    console.log(`📁 Saved backup: ${filename}`);
    
    return stored;
    
  } catch (error) {
    console.error(`💥 Failed to process ${mealName}:`, error.message);
    return null;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 ChefsCart Meal Data Generator');
  console.log('================================');
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No database writes will be performed');
  }
  
  const meals = await loadMealNames();
  console.log(`📝 Processing ${meals.length} meals${MEAL_FILE ? ` from ${MEAL_FILE}` : ''}...`);
  console.log('');

  const results = {
    successful: [],
    failed: []
  };

  for (const mealName of meals) {
    console.log(`\n🔄 Processing: ${mealName}`);
    console.log('-'.repeat(50));
    
    const result = await processMeal(mealName);
    
    if (result) {
      results.successful.push({ name: mealName, id: result.id });
    } else {
      results.failed.push(mealName);
    }
    
    // Add delay to avoid rate limiting
    if (meals.indexOf(mealName) < meals.length - 1) {
      console.log('⏳ Waiting 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Successful: ${results.successful.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  
  if (results.successful.length > 0) {
    console.log('\n✅ Successfully processed:');
    results.successful.forEach(item => {
      console.log(`   - ${item.name} (${item.id})`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed to process:');
    results.failed.forEach(name => {
      console.log(`   - ${name}`);
    });
  }

  console.log('\n🎉 Generation complete!');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateMealData, processMeal };