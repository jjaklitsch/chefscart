#!/usr/bin/env node

/**
 * ChefsCart Complete Meal Generator - With Automatic Image Generation
 * 
 * This script generates meals with comprehensive data validation AND automatically
 * creates high-quality images using the configurable image generation module.
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { generateAndSaveMealImage, IMAGE_MODELS } from './image-generation-module.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

// Initialize clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Parse command line arguments for model selection
const args = process.argv.slice(2);
const modelArg = args.find(arg => arg.startsWith('--image-model='));
const imageModel = modelArg ? modelArg.split('=')[1] : 'nanoBanana'; // Default to Nano Banana
const mealNames = args.filter(arg => !arg.startsWith('--'));

if (!IMAGE_MODELS[imageModel]) {
  console.error(`❌ Invalid image model: ${imageModel}. Available models: ${Object.keys(IMAGE_MODELS).join(', ')}`);
  process.exit(1);
}

// COMPREHENSIVE PREDEFINED LISTS (unchanged from original)
const VALID_CUISINES = [
  'american', 'caribbean', 'chinese', 'french', 'indian', 'italian', 
  'japanese', 'korean', 'mediterranean', 'mexican', 'southern', 'thai', 'vietnamese'
];

const VALID_DIETS = [
  'keto', 'low-carb', 'mediterranean', 'paleo', 'pescatarian', 'plant-forward', 
  'vegan', 'vegetarian', 'whole30', 'kosher'
];

const VALID_ALLERGENS = [
  'dairy', 'egg', 'gluten', 'grain', 'peanut', 'seafood', 'sesame', 
  'shellfish', 'soy', 'sulfite', 'tree_nut', 'wheat'
];

const INGREDIENT_CATEGORIES = [
  'Meat & Poultry', 'Seafood', 'Dairy & Eggs', 'Fresh Herbs', 'Produce',
  'Rice & Grains', 'Pasta', 'Nuts & Seeds', 'Spices, Seasonings, & Oils', 
  'Condiments & Sauces', 'Canned Goods', 'Frozen', 'Baking & Pantry Staples', 
  'Bakery & Bread', 'Gourmet'
];

const INSTACART_UNITS = [
  'cups', 'fl oz', 'gallons', 'ml', 'liters', 'pints', 'quarts', 'tablespoons', 'teaspoons',
  'grams', 'kilograms', 'pounds', 'ounces', 'whole', 'count', 'package', 'container', 
  'can', 'bottle', 'jar', 'box', 'bag', 'bunch', 'head', 'clove', 'slice', 'piece', 'loaf'
];

// Global variables for ingredient standards
let standardizedIngredients = [];

// Generate URL-friendly slug from meal title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim() // Remove leading/trailing spaces
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Load ingredient standardization data
async function loadIngredientStandards() {
  try {
    const csvPath = path.join(__dirname, 'ingredient-standardization-map.js');
    if (fs.existsSync(csvPath)) {
      const { default: ingredientMap } = await import(`./ingredient-standardization-map.js`);
      standardizedIngredients = Object.entries(ingredientMap).map(([key, value]) => ({
        searchTerm: key.toLowerCase(),
        standardizedName: value.name,
        category: value.category,
        instacartUnits: value.units || ['whole', 'count']
      }));
      console.log(`📊 Loaded ${standardizedIngredients.length} standardized ingredients`);
    } else {
      console.warn('⚠️ Ingredient standardization file not found, using basic validation');
    }
  } catch (error) {
    console.error('❌ Error loading ingredient standards:', error.message);
  }
}

// Generate meal data with AI reasoning (unchanged from original)
async function generateMealWithReasoning(mealName) {
  const systemPrompt = `You are ChefsCart's AI meal designer. Create comprehensive meal data that will be used for meal planning and grocery shopping through Instacart.

CRITICAL REQUIREMENTS:
1. ALL ingredients must use Instacart-compatible units: ${INSTACART_UNITS.join(', ')}
2. Ingredients should be commonly available at major grocery stores
3. Instructions should be clear and actionable
4. Timing must be realistic and practical

Valid cuisines: ${VALID_CUISINES.join(', ')}
Valid diets: ${VALID_DIETS.join(', ')}
Valid allergens: ${VALID_ALLERGENS.join(', ')}
Valid ingredient categories: ${INGREDIENT_CATEGORIES.join(', ')}

Output ONLY valid JSON matching this exact schema:
{
  "mealData": {
    "title": "exact meal name as provided",
    "description": "compelling 1-2 sentence description", 
    "instructions_json": {
      "steps": [
        {
          "step_no": 1,
          "text": "step 1 description",
          "time_min": 5
        }
      ],
      "time_total_min": number
    },
    "prep_time": number_in_minutes,
    "cook_time": number_in_minutes,
    "servings_default": number_of_servings,
    "cooking_difficulty": "easy|medium|challenging",
    "cuisines": ["cuisine1", "cuisine2"],
    "courses": ["breakfast|lunch|dinner"],
    "diets_supported": ["diet1", "diet2"],
    "allergens_present": ["allergen1", "allergen2"],
    "primary_ingredient": "main protein or vegetable",
    "search_keywords": ["keyword1", "keyword2", "keyword3"],
    "ingredient_tags": ["ingredient1", "ingredient2", "ingredient3"],
    "spice_level": 1_to_5_integer,
    "cost_per_serving": "$|$$|$$$",
    "ingredients_json": {
      "servings": number_of_servings,
      "ingredients": [
        {
          "display_name": "standardized ingredient name",
          "quantity": number,
          "unit": "instacart_compatible_unit"
        }
      ]
    }
  },
  "reasoning": {
    "difficulty_assessment": "why this difficulty level",
    "cuisine_selection": "why these cuisines", 
    "diet_analysis": "which diets this supports and why",
    "allergen_analysis": "allergens present and why",
    "ingredient_choices": "why these specific ingredients"
  }
}`;

  const userPrompt = `Generate comprehensive meal data for: "${mealName}"

Requirements:
- Use realistic portions and cooking times
- Include proper preparation steps
- Ensure all ingredients use Instacart-compatible units
- Make it practical for home cooking
- Include relevant dietary and allergen information`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const response = completion.choices[0].message.content;
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!parsed.mealData || !parsed.reasoning) {
      throw new Error('Invalid response structure');
    }

    return parsed;
    
  } catch (error) {
    console.error(`❌ AI generation failed for "${mealName}":`, error.message);
    return null;
  }
}

// Validate meal data 
async function validateMealData(mealData, reasoning) {
  console.log('🔍 Validating meal data...');
  
  // Validate required fields
  const requiredFields = ['title', 'description', 'instructions_json', 'prep_time', 'cook_time', 'servings_default'];
  for (const field of requiredFields) {
    if (!mealData[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Validate ingredients structure
  if (!mealData.ingredients_json || !mealData.ingredients_json.ingredients || !Array.isArray(mealData.ingredients_json.ingredients) || mealData.ingredients_json.ingredients.length === 0) {
    throw new Error('Ingredients list is empty or invalid');
  }
  
  // Validate ingredient units
  for (const ingredient of mealData.ingredients_json.ingredients) {
    if (!INSTACART_UNITS.includes(ingredient.unit)) {
      console.warn(`⚠️ Non-standard unit "${ingredient.unit}" for ${ingredient.display_name}`);
    }
  }
  
  // Validate enums
  if (mealData.cuisines) {
    mealData.cuisines = mealData.cuisines.filter(c => VALID_CUISINES.includes(c));
  }
  
  if (mealData.diets_supported) {
    mealData.diets_supported = mealData.diets_supported.filter(d => VALID_DIETS.includes(d));
  }
  
  if (mealData.allergens_present) {
    mealData.allergens_present = mealData.allergens_present.filter(a => VALID_ALLERGENS.includes(a));
  }
  
  // Generate total time
  mealData.time_total_min = (mealData.prep_time || 0) + (mealData.cook_time || 0);
  
  // Generate slug for the meal
  mealData.slug = generateSlug(mealData.title);
  
  console.log('✅ Meal data validation completed');
  return mealData;
}

// Save meal to database 
async function saveMealToDatabase(mealData, reasoning) {
  console.log(`💾 Saving meal to database: ${mealData.title}`);
  
  try {
    const { data, error } = await supabase
      .from('meals')
      .insert([{
        ...mealData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('*');
    
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error('No data returned after insert');
    }
    
    console.log(`✅ Meal saved successfully with ID: ${data[0].id}`);
    
    return { success: true, id: data[0].id, data: data[0] };
    
  } catch (error) {
    console.error('❌ Error saving to database:', error.message);
    return { success: false, error: error.message };
  }
}

// Enhanced meal generation with automatic image generation
async function generateMealWithImage(mealName) {
  console.log(`\n🎯 Generating complete meal: "${mealName}"`);
  console.log(`🤖 Image model: ${IMAGE_MODELS[imageModel].displayName}`);
  
  // Step 1: Generate meal data
  console.log('\n📝 Step 1: Generating meal data...');
  const result = await generateMealWithReasoning(mealName);
  
  if (!result) {
    return {
      name: mealName,
      success: false,
      error: 'Meal data generation failed'
    };
  }
  
  // Step 2: Validate meal data
  console.log('\n🔍 Step 2: Validating meal data...');
  let validatedMealData;
  try {
    validatedMealData = await validateMealData(result.mealData, result.reasoning);
  } catch (error) {
    return {
      name: mealName,
      success: false,
      error: `Validation failed: ${error.message}`
    };
  }
  
  // Step 3: Save meal to database
  console.log('\n💾 Step 3: Saving to database...');
  const saveResult = await saveMealToDatabase(validatedMealData, result.reasoning);
  
  if (!saveResult.success) {
    return {
      name: mealName,
      success: false,
      error: `Database save failed: ${saveResult.error}`
    };
  }
  
  const mealId = saveResult.id;
  const mealRecord = saveResult.data;
  
  // Step 4: Generate image
  console.log('\n🎨 Step 4: Generating meal image...');
  const imageResult = await generateAndSaveMealImage(
    mealRecord, 
    imageModel, 
    path.join(__dirname, 'meal-images')
  );
  
  if (!imageResult.success) {
    console.warn(`⚠️ Image generation failed: ${imageResult.error}`);
  }
  
  return {
    name: mealName,
    success: true,
    id: mealId,
    data: mealRecord,
    imageGenerated: imageResult.success,
    imageUrl: imageResult.url,
    imageError: imageResult.error,
    totalCost: imageResult.success ? imageResult.cost : 0
  };
}

// Main generation function
async function generateMealsWithImages(mealNames) {
  await loadIngredientStandards();
  
  console.log(`🚀 Starting complete meal generation (data + images) for ${mealNames.length} meals...`);
  console.log(`🤖 Image model: ${IMAGE_MODELS[imageModel].displayName} ($${IMAGE_MODELS[imageModel].cost} per image)`);
  console.log(`💰 Estimated image cost: $${(mealNames.length * IMAGE_MODELS[imageModel].cost).toFixed(2)}\n`);
  
  const results = [];
  let totalImageCost = 0;
  
  for (let i = 0; i < mealNames.length; i++) {
    const mealName = mealNames[i];
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${i + 1}/${mealNames.length}] Processing: "${mealName}"`);
    console.log('='.repeat(60));
    
    const result = await generateMealWithImage(mealName);
    results.push(result);
    
    if (result.success && result.imageGenerated) {
      totalImageCost += result.totalCost;
    }
    
    // Brief pause between generations
    if (i < mealNames.length - 1) {
      console.log('\n⏸️ Pausing 3 seconds before next meal...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('🎉 COMPLETE MEAL GENERATION SUMMARY (DATA + IMAGES)');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const successfulImages = results.filter(r => r.success && r.imageGenerated);
  const failedImages = results.filter(r => r.success && !r.imageGenerated);
  
  console.log(`✅ Meal data successful: ${successful.length}/${mealNames.length}`);
  console.log(`❌ Meal data failed: ${failed.length}/${mealNames.length}`);
  console.log(`🎨 Images generated: ${successfulImages.length}/${successful.length}`);
  console.log(`⚠️ Images failed: ${failedImages.length}/${successful.length}`);
  console.log(`💰 Total image cost: $${totalImageCost.toFixed(2)}`);
  
  if (successful.length > 0) {
    console.log('\n🎉 Successfully created meals:');
    successful.forEach(result => {
      const imageStatus = result.imageGenerated ? '🖼️ ' : '⚠️ ';
      console.log(`   ${imageStatus}${result.name} (ID: ${result.id})`);
      if (result.imageUrl) {
        console.log(`      Image: ${result.imageUrl}`);
      }
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed meals:');
    failed.forEach(result => {
      console.log(`   • ${result.name}: ${result.error}`);
    });
  }
  
  if (failedImages.length > 0) {
    console.log('\n⚠️ Meals with image generation failures:');
    failedImages.forEach(result => {
      console.log(`   • ${result.name}: ${result.imageError}`);
    });
  }
  
  return results;
}

// Main execution
async function main() {
  if (mealNames.length === 0) {
    console.log('🍳 ChefsCart Complete Meal Generator (Data + Images)');
    console.log('Usage: node generate-meal-with-image.js [--image-model=nanoBanana|imagen4] "Meal Name 1" "Meal Name 2"...');
    console.log('');
    console.log('Examples:');
    console.log('  node generate-meal-with-image.js "Thai Green Curry"');
    console.log('  node generate-meal-with-image.js --image-model=imagen4 "Caesar Salad" "Beef Tacos"');
    console.log('');
    console.log('Available image models:');
    Object.entries(IMAGE_MODELS).forEach(([key, model]) => {
      console.log(`  ${key}: ${model.displayName} ($${model.cost} per image)`);
    });
    process.exit(1);
  }
  
  try {
    console.log('🍳 ChefsCart Complete Meal Generator');
    console.log('   Features: AI reasoning, ingredient standardization, automatic image generation');
    console.log(`   Image model: ${IMAGE_MODELS[imageModel].displayName}`);
    console.log('');
    
    const results = await generateMealsWithImages(mealNames);
    const successful = results.filter(r => r.success).length;
    const withImages = results.filter(r => r.success && r.imageGenerated).length;
    
    console.log(`\n🎉 Generation completed! ${successful}/${mealNames.length} meals created, ${withImages}/${successful} with images.`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}