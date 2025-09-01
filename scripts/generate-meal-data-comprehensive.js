#!/usr/bin/env node

/**
 * ChefsCart Meal Data Generator - Comprehensive AI-Driven Version
 * 
 * This version combines the comprehensive predefined lists from the original script
 * with AI reasoning requirements and proper ingredient standardization.
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

// Initialize clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// COMPREHENSIVE PREDEFINED LISTS (from original script)
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
  // Proteins
  'Meat & Poultry', 'Seafood', 'Dairy & Eggs',
  // Produce & Fresh
  'Fresh Herbs', 'Produce',
  // Grains & Carbs
  'Rice & Grains', 'Pasta', 'Nuts & Seeds',
  // Flavor & Cooking
  'Spices, Seasonings, & Oils', 'Condiments & Sauces',
  // Processed & Prepared
  'Canned Goods', 'Frozen', 'Baking & Pantry Staples', 'Bakery & Bread',
  // Special
  'Gourmet'
];

const COOKING_EQUIPMENT = [
  'skimmer', 'pie form', 'glass baking pan', 'garlic press', 'meat grinder', 'tongs',
  'bread knife', 'tajine pot', 'wire rack', 'mincing knife', 'cherry pitter', 'wooden skewers',
  'kitchen scissors', 'blow torch', 'broiler pan', 'heart shaped silicone form', 'grill',
  'immersion blender', 'baking sheet', 'oven mitt', 'pastry bag', 'palette knife', 'pizza cutter',
  'bottle opener', 'bowl', 'pizza pan', 'candy thermometer', 'rolling pin', 'frying pan',
  'casserole dish', 'plastic wrap', 'salad spinner', 'broiler', 'silicone muffin tray',
  'meat tenderizer', 'edible cake image', 'measuring spoon', 'kitchen thermometer', 'sifter',
  'muffin tray', 'chocolate mold', 'kitchen towels', 'potato ricer', 'silicone kugelhopf pan',
  'offset spatula', 'cheesecloth', 'lemon squeezer', 'cake form', 'mini muffin tray',
  'carving fork', 'egg slicer', 'ice cube tray', 'corkscrew', 'ice cream machine', 'sieve',
  'kugelhopf pan', 'pastry brush', 'popsicle sticks', 'spatula', 'cake server',
  'poultry shears', 'box grater', 'cupcake toppers', 'funnel', 'drinking straws',
  'slotted spoon', 'ceramic pie form', 'pepper grinder', 'mortar and pestle', 'baster',
  'melon baller', 'zester', 'pastry cutter', 'ziploc bags', 'aluminum foil', 'toothpicks',
  'pot', 'baking pan', 'ladle', 'apple cutter', 'fillet knife', 'toaster',
  'heart shaped cake form', 'grill pan', 'wooden spoon', 'paper towels', 'cookie cutter',
  'tart form', 'pizza board', 'glass casserole dish', 'madeleine form', 'metal skewers',
  'microplane', 'stand mixer', 'whisk', 'mixing bowl', 'deep fryer', 'canning jar',
  'cheese knife', 'hand mixer', 'butter curler', 'food processor', 'wax paper',
  'grater', 'gravy boat', 'muffin liners', 'butter knife', 'waffle iron', 'double boiler',
  'can opener', 'mandoline', 'kitchen twine', 'juicer', 'wok', 'measuring cup',
  'ramekin', 'airfryer', 'instant pot', 'spoon', 'dough scraper', 'microwave',
  'roasting pan', 'pressure cooker', 'dehydrator', 'baking paper', 'silicone muffin liners',
  'loaf pan', 'cake topper', 'dutch oven', 'baking spatula', 'popsicle molds',
  'teapot', 'cocktail sticks', 'cleaver', 'rice cooker', 'bread machine', 'fork',
  'ice cream scoop', 'slow cooker', 'knife', 'kitchen scale', 'griddle',
  'frosting cake topper', 'cutting board', 'cake pop mold', 'oven', 'colander',
  'kitchen timer', 'panini press', 'pasta machine', 'popcorn maker', 'lollipop sticks',
  'steamer basket', 'chopsticks', 'chefs knife', 'blender', 'pizza stone', 'skewers',
  'sauce pan', 'peeler', 'stove', 'pot holder', 'springform pan', 'apple corer',
  'potato masher', 'serrated knife'
];

// Instacart-compatible units of measurement (from Instacart API documentation)
// These units work for both cooking instructions AND Instacart API calls
const INSTACART_UNITS = [
  // Volume (Measured Items)
  'cups', 'fl oz', 'gallons', 'ml', 'liters', 'pints', 'quarts', 'tablespoons', 'teaspoons',
  // Weight (Weighed Items) 
  'grams', 'kilograms', 'pounds', 'ounces',
  // Countable Items
  'bunch', 'can', 'each', 'ears', 'head', 'large', 'medium', 'package', 'packet', 'small'
];

// Enhanced JSON Schema with comprehensive AI reasoning
const MEAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    // AI REASONING SECTION - Required for all decisions
    reasoning: {
      type: "object",
      additionalProperties: false,
      properties: {
        cuisine_and_diet_analysis: { 
          type: "string", 
          description: "Explain cuisine classification and which diets this meal supports and why" 
        },
        ingredient_analysis: { 
          type: "string", 
          description: "Explain ingredient choices, categorization decisions, and quantity calculations for servings_default" 
        },
        cooking_analysis: { 
          type: "string", 
          description: "Reasoning for difficulty level, cooking equipment needed, and time estimates" 
        },
        allergen_and_cost_analysis: { 
          type: "string", 
          description: "Identify allergens present and explain cost per serving assessment" 
        },
        final_validation: { 
          type: "string", 
          description: "Overall quality check of all data fields for accuracy and consistency" 
        }
      },
      required: ["cuisine_and_diet_analysis", "ingredient_analysis", "cooking_analysis", "allergen_and_cost_analysis", "final_validation"]
    },
    
    // CORE MEAL DATA
    slug: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    courses: {
      type: "array",
      items: {
        type: "string",
        enum: ["breakfast", "lunch", "dinner"]
      }
    },
    cuisines: {
      type: "array", 
      items: {
        type: "string",
        enum: VALID_CUISINES
      }
    },
    diets_supported: {
      type: "array",
      items: {
        type: "string",
        enum: VALID_DIETS
      }
    },
    primary_ingredient: { type: "string" },
    spice_level: { type: "integer", minimum: 1, maximum: 5 },
    prep_time: { type: "integer" },
    cook_time: { type: "integer" },
    cooking_difficulty: { type: "string", enum: ["easy", "medium", "challenging"] },
    time_total_min: { type: "integer" },
    servings_default: { type: "integer" },
    servings_min: { type: "integer" },
    servings_max: { type: "integer" },
    cost_per_serving: { type: "string", enum: ["$", "$$", "$$$"] },
    allergens_present: {
      type: "array",
      items: {
        type: "string",
        enum: VALID_ALLERGENS
      }
    },
    search_keywords: {
      type: "array",
      items: { type: "string" }
    },
    cooking_equipment: {
      type: "array",
      items: { type: "string" }
    },
    
    // INGREDIENTS WITH PROPER STRUCTURE
    ingredients_json: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", description: "Use standardized ingredient names when possible" },
          quantity: { type: "number", description: "Amount calculated for servings_default number of people" },
          unit: { type: "string", description: "Use Instacart-compatible units: pounds, ounces, each, package, can, etc." },
          category: { type: "string", enum: INGREDIENT_CATEGORIES },
          organic_supported: { type: "boolean", description: "True if ingredient commonly available organic" },
          brand_filters: {
            type: "array",
            items: { type: "string" },
            description: "2-4 common brands that carry this product"
          }
        },
        required: ["name", "quantity", "unit", "category", "organic_supported", "brand_filters"]
      }
    },
    
    // DYNAMIC COOKING INSTRUCTIONS
    instructions_json: {
      type: "object",
      additionalProperties: false,
      properties: {
        prep_time: { type: "integer" },
        cook_time: { type: "integer" },
        total_time: { type: "integer" },
        steps: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              step: { type: "integer" },
              instruction: { 
                type: "string", 
                description: "Use relative terms like 'the diced onion', 'half the oil' instead of specific quantities" 
              },
              time_minutes: { type: "integer" }
            },
            required: ["step", "instruction", "time_minutes"]
          }
        }
      },
      required: ["prep_time", "cook_time", "total_time", "steps"]
    },
    
    ingredient_tags: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: [
    "reasoning", "slug", "title", "description", "courses", "cuisines", 
    "diets_supported", "primary_ingredient", "spice_level", "prep_time", 
    "cook_time", "cooking_difficulty", "time_total_min", "servings_default", 
    "servings_min", "servings_max", "cost_per_serving", "allergens_present", 
    "search_keywords", "cooking_equipment", "ingredients_json", "instructions_json", 
    "ingredient_tags"
  ]
};

// Ingredient standardization from database or CSV fallback
let standardizedIngredients = [];

async function loadIngredientStandards() {
  console.log('📊 Loading ingredient standards...');
  
  try {
    // Try database first
    const { data, error } = await supabase
      .from('common_ingredients')
      .select('name, category, default_unit, organic_supported, aliases, typical_brands');
    
    if (!error && data && data.length > 0) {
      console.log(`✅ Loaded ${data.length} ingredients from database`);
      
      // Format for prompt use
      standardizedIngredients = data.flatMap(ingredient => {
        const examples = [ingredient.name];
        if (ingredient.aliases) {
          examples.push(...ingredient.aliases);
        }
        return examples;
      });
      
      return data;
    }
  } catch (dbError) {
    console.log('⚠️  Database not available, trying CSV fallback...');
  }
  
  // Fallback to CSV
  try {
    const csvPath = '/Users/jonathanjaklitsch/Downloads/deduped_ingredients_v6.csv';
    
    if (fs.existsSync(csvPath)) {
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const rows = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      
      console.log(`✅ Loaded ${rows.length} ingredients from CSV`);
      
      // Extract standardized names
      standardizedIngredients = rows.flatMap(row => {
        const names = [row.standard_name || row.name];
        if (row.variations) {
          names.push(...row.variations.split('|').filter(v => v.trim()));
        }
        return names;
      });
      
      return rows.map(row => ({ 
        name: row.standard_name || row.name, 
        variations: row.variations 
      }));
    }
  } catch (csvError) {
    console.log('⚠️  CSV not available, using basic standards');
  }
  
  // Basic fallback
  standardizedIngredients = [
    'Extra-Virgin Olive Oil', 'Yellow Onion', 'Garlic', 'Kosher Salt', 'Black Pepper',
    'Chicken Thighs', 'Salmon Fillets', 'Ground Beef', 'Jasmine Rice', 'Quinoa',
    'Lemons', 'Cherry Tomatoes', 'Parsley', 'Basil', 'Cumin', 'Paprika'
  ];
  
  return [];
}

function buildComprehensiveSystemPrompt() {
  const ingredientExamples = standardizedIngredients.slice(0, 40).join(', ');
  
  return `You are an expert recipe developer creating comprehensive meal data for ChefsCart. 

CRITICAL: You MUST provide detailed reasoning for all your decisions in the reasoning section.

=== PREDEFINED OPTIONS (USE EXACTLY) ===
- cuisines: ${VALID_CUISINES.join(', ')}
- diets_supported: ${VALID_DIETS.join(', ')} (only include if meal STRICTLY follows diet)
- allergens_present: ${VALID_ALLERGENS.join(', ')}
- cooking_equipment: Select from: ${COOKING_EQUIPMENT.join(', ')}
- ingredient categories: ${INGREDIENT_CATEGORIES.join(', ')}
- units: ${INSTACART_UNITS.join(', ')}

=== INGREDIENT STANDARDIZATION ===
When possible, use these standardized ingredient names:
${ingredientExamples}

=== COOKING DIFFICULTY GUIDELINES ===
- easy: Simple techniques, forgiving recipes (roasted vegetables, basic pasta, grilled proteins)
- medium: Some technique required, moderate attention (stir-fry, braised meats, risotto)
- challenging: Complex techniques, high skill needed (soufflé, perfect steak, complex sauces)

=== QUANTITY CALCULATION & INSTACART COMPATIBILITY ===
Calculate ingredient amounts for EXACTLY the servings_default number of people using Instacart-compatible units:

UNIT SELECTION RULES (per Instacart API):
- Proteins (meat, fish): Use "pounds" (e.g., 1.5 pounds chicken breast for 4 people)
- Countable produce (tomatoes, onions, garlic): Use "each" not weight (1 garlic = 1 head)
- Small fruits/vegetables in containers: Use "pints" (e.g., cherry tomatoes, berries)
- Packaged items (tofu, cheese): Use "package" 
- Bulk grains/flour: Use "pounds"
- Liquids: Use "fl oz" for small amounts, "cups" for larger
- Spices: Use "ounces" for bulk spices
- Fresh herbs: Use "bunch" for fresh herbs
- Canned goods: Use "can"

IMPORTANT: Never use "cloves", "slice", "piece", "pint" (singular) - these are NOT Instacart-compatible.
Use "each" for individual items, "pints" (plural) for containers.

PORTION GUIDELINES:
- Proteins: ~6oz per person (servings × 6oz ÷ 16oz = pounds needed)
- Rice/Grains: ~1 cup serves 2-3 people  
- Vegetables: Realistic amounts for dish and serving size
- Seasonings: Appropriate for total quantity being prepared

These units work for both cooking instructions AND Instacart API calls.

=== COOKING INSTRUCTIONS ===
Write instructions using RELATIVE terms, not specific quantities:
- "Add the diced onion" not "Add 1 diced onion"  
- "Season with half the salt" not "Season with 1 tsp salt"
- "Use remaining olive oil" not "Use 2 tbsp olive oil"
This allows scaling for different serving sizes.

=== ORGANIC ASSESSMENT ===
Set organic_supported = true for:
- Fresh produce, herbs, dairy, eggs, meat, grains, basic oils
Set organic_supported = false for:
- Highly processed foods, canned goods, condiments, artificial ingredients

=== COST ASSESSMENT ===
- "$" = Budget-friendly, common ingredients, simple preparation
- "$$" = Moderate cost, some premium ingredients or techniques
- "$$$" = Premium ingredients, specialty items, complex preparation

=== SPICE LEVEL (1-5) ===
1 = Mild/No heat, 2 = Light warmth, 3 = Moderate spice, 4 = Spicy/Hot, 5 = Very spicy/Fiery

PROVIDE COMPREHENSIVE REASONING for all your decisions. Analyze the meal thoroughly and explain your choices.`;
}

function buildUserPrompt(mealName) {
  return `Generate comprehensive meal data for: "${mealName}"

REASONING REQUIREMENTS:
1. cuisine_and_diet_analysis: Explain which cuisines this represents and what diets it supports
2. ingredient_analysis: Detail your ingredient choices, categories, and quantity calculations  
3. cooking_analysis: Explain difficulty level, equipment needs, and timing decisions
4. allergen_and_cost_analysis: Identify allergens and justify cost assessment
5. final_validation: Review all data for accuracy and consistency

REQUIREMENTS:
- Calculate quantities for the servings_default number of people
- Use standardized ingredient names when available
- Select appropriate equipment from the provided list
- Write scalable cooking instructions without fixed quantities
- Ensure prep_time + cook_time = total_time
- Include 8-12 relevant search keywords
- Generate appropriate ingredient_tags (ingredient names in lowercase, spaces preserved)

Generate only the JSON object with complete reasoning.`;
}

async function generateMealWithReasoning(mealName) {
  console.log(`\\n🤖 Generating meal with AI reasoning: ${mealName}`);
  
  const systemPrompt = buildComprehensiveSystemPrompt();
  const userPrompt = buildUserPrompt(mealName);
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'comprehensive_meal_data',
          schema: MEAL_SCHEMA,
          strict: true
        }
      },
      temperature: 0.4 // Slightly higher for more creative reasoning
    });

    const mealData = JSON.parse(completion.choices[0].message.content);
    
    // Display AI reasoning
    console.log('\\n🧠 AI REASONING:');
    console.log('│');
    console.log('├─ CUISINE & DIET:', mealData.reasoning.cuisine_and_diet_analysis);
    console.log('│');
    console.log('├─ INGREDIENTS:', mealData.reasoning.ingredient_analysis);
    console.log('│');
    console.log('├─ COOKING:', mealData.reasoning.cooking_analysis);  
    console.log('│');
    console.log('├─ ALLERGENS & COST:', mealData.reasoning.allergen_and_cost_analysis);
    console.log('│');
    console.log('└─ VALIDATION:', mealData.reasoning.final_validation);
    console.log('');
    
    // Remove reasoning from database save (keep reasoning separate from data)
    const { reasoning, ...cleanMealData } = mealData;
    
    return { mealData: cleanMealData, reasoning };

  } catch (error) {
    console.error(`❌ Error generating meal "${mealName}":`, error.message);
    if (error.response) {
      console.error('API Error:', error.response.data?.error || error.response.data);
    }
    return null;
  }
}

async function validateMealData(mealData, reasoning) {
  console.log('🔍 Validating generated meal data...');
  
  const issues = [];
  
  // Time consistency
  if (mealData.prep_time + mealData.cook_time !== mealData.time_total_min) {
    issues.push(`Time inconsistency: ${mealData.prep_time} + ${mealData.cook_time} ≠ ${mealData.time_total_min}`);
    mealData.time_total_min = mealData.prep_time + mealData.cook_time;
  }
  
  // Validate enum fields
  const invalidCuisines = mealData.cuisines.filter(c => !VALID_CUISINES.includes(c));
  const invalidDiets = mealData.diets_supported.filter(d => !VALID_DIETS.includes(d));
  const invalidAllergens = mealData.allergens_present.filter(a => !VALID_ALLERGENS.includes(a));
  
  if (invalidCuisines.length) issues.push(`Invalid cuisines: ${invalidCuisines.join(', ')}`);
  if (invalidDiets.length) issues.push(`Invalid diets: ${invalidDiets.join(', ')}`);
  if (invalidAllergens.length) issues.push(`Invalid allergens: ${invalidAllergens.join(', ')}`);
  
  // Check ingredient categories
  mealData.ingredients_json.forEach((ingredient, i) => {
    if (!INGREDIENT_CATEGORIES.includes(ingredient.category)) {
      issues.push(`Invalid category for ingredient ${i + 1}: "${ingredient.category}"`);
    }
  });
  
  if (issues.length > 0) {
    console.log('⚠️  Issues found (auto-corrected where possible):');
    issues.forEach(issue => console.log(`   - ${issue}`));
  } else {
    console.log('✅ All validation checks passed');
  }
  
  return mealData;
}

async function saveMealToDatabase(mealData, reasoning) {
  console.log(`💾 Saving meal: ${mealData.title}`);
  
  try {
    const { data, error } = await supabase
      .from('meal2')
      .insert([mealData])
      .select();
      
    if (error) {
      console.error('❌ Database save error:', error.message);
      return { success: false, error: error.message };
    }
    
    console.log(`✅ Saved meal with ID: ${data[0].id}`);
    
    // Also save reasoning for review (optional separate table/logging)
    console.log('📝 AI reasoning logged for quality review');
    
    return { success: true, id: data[0].id, data: data[0] };
    
  } catch (error) {
    console.error('❌ Error saving to database:', error.message);
    return { success: false, error: error.message };
  }
}

async function generateMeals(mealNames) {
  await loadIngredientStandards();
  
  console.log(`\\n🚀 Starting comprehensive meal generation for ${mealNames.length} meals...`);
  console.log(`📊 Using ${standardizedIngredients.length} standardized ingredient references\\n`);
  
  const results = [];
  
  for (const mealName of mealNames) {
    const result = await generateMealWithReasoning(mealName);
    
    if (result) {
      const validatedMealData = await validateMealData(result.mealData, result.reasoning);
      const saveResult = await saveMealToDatabase(validatedMealData, result.reasoning);
      
      results.push({
        name: mealName,
        success: saveResult.success,
        id: saveResult.id,
        data: saveResult.success ? saveResult.data : null,
        error: saveResult.error
      });
    } else {
      results.push({
        name: mealName,
        success: false,
        error: 'Generation failed'
      });
    }
    
    // Brief pause between generations
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Final summary
  console.log('\\n' + '='.repeat(60));
  console.log('📊 COMPREHENSIVE GENERATION SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\\n🎉 Successfully generated meals:');
    successful.forEach(result => {
      console.log(`   • ${result.name} (ID: ${result.id})`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\\n❌ Failed meals:');
    failed.forEach(result => {
      console.log(`   • ${result.name}: ${result.error}`);
    });
  }
  
  return results;
}

// Main execution
async function main() {
  const mealNames = process.argv.slice(2);
  
  if (mealNames.length === 0) {
    console.log('ChefsCart Comprehensive Meal Data Generator');
    console.log('Usage: node generate-meal-data-comprehensive.js "Meal Name 1" "Meal Name 2"...');
    console.log('');
    console.log('Example:');
    console.log('  node generate-meal-data-comprehensive.js "Thai Green Curry with Chicken" "Classic Caesar Salad"');
    process.exit(1);
  }
  
  try {
    console.log('🍳 ChefsCart Comprehensive Meal Generator');
    console.log('   Features: AI reasoning, ingredient standardization, comprehensive validation');
    console.log('');
    
    await generateMeals(mealNames);
    console.log('\\n🎉 Meal generation completed successfully!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}