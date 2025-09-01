#!/usr/bin/env node

/**
 * ChefsCart Meal Data Generator - Updated Version
 * 
 * Generates comprehensive meal data using OpenAI GPT-4o and stores it in Supabase.
 * Updated to include new schema fields: prep_time, cook_time, cooking_difficulty, cooking_equipment
 * Aligned with onboarding system options for cuisines, diets, allergens, and categories
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
// Removed external ingredient standardization import - now handled internally

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JSON Schema for structured outputs
const MEAL_SCHEMA = {
  type: "object",
  properties: {
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
        enum: ["american", "caribbean", "chinese", "french", "indian", "italian", "japanese", "korean", "mediterranean", "mexican", "southern", "thai", "vietnamese"]
      }
    },
    diets_supported: {
      type: "array",
      items: {
        type: "string",
        enum: ["keto", "low-carb", "mediterranean", "paleo", "pescatarian", "plant-forward", "vegan", "vegetarian", "whole30", "kosher"]
      }
    },
    primary_ingredient: { type: "string" },
    spice_level: { type: "integer", minimum: 1, maximum: 5 },
    prep_time: { type: "integer" },
    cook_time: { type: "integer" },
    cooking_difficulty: {
      type: "string",
      enum: ["easy", "medium", "challenging"]
    },
    time_total_min: { type: "integer" },
    servings_default: { type: "integer" },
    servings_min: { type: "integer" },
    servings_max: { type: "integer" },
    cost_per_serving: {
      type: "string",
      enum: ["$", "$$", "$$$"]
    },
    allergens_present: {
      type: "array",
      items: {
        type: "string",
        enum: ["dairy", "egg", "gluten", "grain", "peanut", "seafood", "sesame", "shellfish", "soy", "sulfite", "tree_nut", "wheat"]
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
    ingredients_json: {
      type: "object",
      properties: {
        ingredients: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              quantity: { type: "number" },
              unit: { type: "string" },
              category: { type: "string" },
              health_filters: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["ORGANIC", "GLUTEN_FREE", "FAT_FREE", "VEGAN", "KOSHER", "SUGAR_FREE", "LOW_FAT"]
                }
              },
              brand_filters: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["name", "quantity", "unit", "category", "health_filters", "brand_filters"],
            additionalProperties: false
          }
        }
      },
      required: ["ingredients"],
      additionalProperties: false
    },
    instructions_json: {
      type: "object",
      properties: {
        prep_time: { type: "integer" },
        cook_time: { type: "integer" },
        total_time: { type: "integer" },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              step: { type: "integer" },
              instruction: { type: "string" },
              time_minutes: { type: "integer" }
            },
            required: ["step", "instruction", "time_minutes"],
            additionalProperties: false
          }
        }
      },
      required: ["prep_time", "cook_time", "total_time", "steps"],
      additionalProperties: false
    }
  },
  required: ["slug", "title", "description", "courses", "cuisines", "diets_supported", "primary_ingredient", "spice_level", "prep_time", "cook_time", "cooking_difficulty", "time_total_min", "servings_default", "servings_min", "servings_max", "cost_per_serving", "allergens_present", "search_keywords", "cooking_equipment", "ingredients_json", "instructions_json"],
  additionalProperties: false
};

// Transliteration map for converting accented characters to English equivalents
const TRANSLITERATION_MAP = {
  // Vietnamese
  'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
  'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
  'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
  'đ': 'd', 'Đ': 'D',
  'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
  'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
  'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
  'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
  'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
  'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
  'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
  'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
  'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
  // French
  'ç': 'c', 'Ç': 'C',
  'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
  'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
  'à': 'a', 'â': 'a', 'æ': 'ae',
  'À': 'A', 'Â': 'A', 'Æ': 'AE',
  'ô': 'o', 'œ': 'oe',
  'Ô': 'O', 'Œ': 'OE',
  'ù': 'u', 'û': 'u', 'ü': 'u',
  'Ù': 'U', 'Û': 'U', 'Ü': 'U',
  'ÿ': 'y', 'Ÿ': 'Y',
  'î': 'i', 'ï': 'i',
  'Î': 'I', 'Ï': 'I',
  // Spanish
  'ñ': 'n', 'Ñ': 'N',
  // German
  'ä': 'ae', 'ö': 'oe', 'ü': 'ue',
  'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue',
  'ß': 'ss',
  // Italian
  'ì': 'i', 'ò': 'o', 'ù': 'u',
  'Ì': 'I', 'Ò': 'O', 'Ù': 'U',
  // Polish
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 
  'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
  'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
  'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
};

/**
 * Transliterate non-English characters to English equivalents
 * @param {string} text - Text to transliterate
 * @returns {string} - Transliterated text
 */
function transliterate(text) {
  return text.split('').map(char => TRANSLITERATION_MAP[char] || char).join('');
}

/**
 * Generate a URL-friendly slug from a meal name
 * Handles non-English characters properly
 * @param {string} mealName - Original meal name
 * @returns {string} - URL-friendly slug
 */
function generateSlug(mealName) {
  // First transliterate non-English characters
  let slug = transliterate(mealName);
  
  // Convert to lowercase and replace special characters
  slug = slug
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  
  return slug;
}

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Unit canonicalization map - maps synonyms to Instacart canonical tokens
const UNIT_CANONICALIZATION = {
  // Volume synonyms → canonical
  'tsp': 'teaspoon',
  'ts': 'teaspoon',
  'tspn': 'teaspoon',
  'tbsp': 'tablespoon', 
  'tb': 'tablespoon',
  'tbs': 'tablespoon',
  'c': 'cup',
  'oz': 'ounce',
  'fl oz': 'fl oz', // already canonical
  'lb': 'pound',
  'lbs': 'pound',
  'g': 'gram',
  'gs': 'gram',
  'kg': 'kilogram',
  'kgs': 'kilogram',
  'ml': 'milliliter',
  'mls': 'milliliter',
  'l': 'liter',
  'qt': 'quart',
  'qts': 'quart',
  'pt': 'pint',
  'pts': 'pint',
  'gal': 'gallon',
  'gals': 'gallon',
  // Count synonyms → canonical
  'count': 'each',
  'piece': 'each',
  'pieces': 'each'
};

// Instacart canonical units only
const CANONICAL_UNITS = [
  'teaspoon', 'tablespoon', 'cup', 'fl oz', 'pint', 'quart', 'gallon',
  'ounce', 'pound', 'gram', 'kilogram', 'milliliter', 'liter',
  'each', 'bunch', 'head', 'can', 'package', 'clove', 'slice',
  'large', 'medium', 'small', 'per lb'
];

/**
 * Canonicalize unit to Instacart-compatible token
 * @param {string} unit - Input unit
 * @returns {string} - Canonical unit
 */
function canonicalizeUnit(unit) {
  if (!unit) return 'each';
  
  const normalized = unit.toLowerCase().trim();
  
  // Check direct canonicalization
  if (UNIT_CANONICALIZATION[normalized]) {
    return UNIT_CANONICALIZATION[normalized];
  }
  
  // Check if already canonical
  if (CANONICAL_UNITS.includes(normalized)) {
    return normalized;
  }
  
  // Heuristic fallbacks based on ingredient type
  if (normalized.includes('liquid') || normalized.includes('oil') || normalized.includes('sauce')) {
    return 'fl oz';
  }
  
  if (normalized.includes('spice') || normalized.includes('herb') || normalized.includes('powder')) {
    return 'teaspoon';
  }
  
  if (normalized.includes('meat') || normalized.includes('fish') || normalized.includes('protein')) {
    return 'pound';
  }
  
  // Default fallback
  return 'each';
}

/**
 * Load ingredient standards from CSV file
 * @returns {Promise<{standards: Map, nameMap: Map, topForPrompt: string[]}>}
 */
async function loadIngredientStandards() {
  const csvPath = '/Users/jonathanjaklitsch/Downloads/deduped_ingredients_v6.csv';
  
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const rows = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`📊 Loaded ${rows.length} ingredients from CSV`);
    
    // Build standards map and name variation map
    const standards = new Map();
    const nameMap = new Map();
    
    rows.forEach(row => {
      const canonicalName = row.canonical_name;
      const unit = canonicalizeUnit(row.unit);
      const category = row.category || 'Gourmet';
      const count = parseInt(row.count) || 0;
      
      // Store standard definition
      standards.set(canonicalName, { name: canonicalName, unit, category, count });
      
      // Add name variations
      const lowerName = canonicalName.toLowerCase();
      nameMap.set(lowerName, canonicalName);
      
      // Add common variations
      addIngredientVariations(canonicalName, nameMap);
    });
    
    // Get top 150 by usage count for prompt
    const topForPrompt = rows
      .sort((a, b) => parseInt(b.count) - parseInt(a.count))
      .slice(0, 150)
      .map(r => r.canonical_name);
    
    console.log(`✅ Built ingredient maps: ${standards.size} standards, ${nameMap.size} variations`);
    
    return { standards, nameMap, topForPrompt };
    
  } catch (error) {
    console.warn(`⚠️  Failed to load CSV, falling back to basic standards:`, error.message);
    
    // Fallback to basic standards if CSV fails
    const basicStandards = new Map([
      ['Garlic', { name: 'Garlic', unit: 'head', category: 'Produce', count: 468 }],
      ['Lemons', { name: 'Lemons', unit: 'each', category: 'Produce', count: 333 }],
      ['Yellow Onion', { name: 'Yellow Onion', unit: 'each', category: 'Produce', count: 170 }],
      ['Kosher Salt', { name: 'Kosher Salt', unit: 'teaspoon', category: 'Spices, Seasonings, & Oils', count: 333 }],
      ['Black Pepper', { name: 'Black Pepper', unit: 'teaspoon', category: 'Spices, Seasonings, & Oils', count: 449 }],
      ['Extra-Virgin Olive Oil', { name: 'Extra-Virgin Olive Oil', unit: 'tablespoon', category: 'Spices, Seasonings, & Oils', count: 380 }]
    ]);
    
    const basicNameMap = new Map([
      ['garlic', 'Garlic'],
      ['lemon', 'Lemons'], 
      ['lemons', 'Lemons'],
      ['onion', 'Yellow Onion'],
      ['onions', 'Yellow Onion'],
      ['salt', 'Kosher Salt'],
      ['pepper', 'Black Pepper'],
      ['black pepper', 'Black Pepper'],
      ['olive oil', 'Extra-Virgin Olive Oil'],
      ['extra virgin olive oil', 'Extra-Virgin Olive Oil']
    ]);
    
    const basicTopForPrompt = Array.from(basicStandards.keys());
    
    return { standards: basicStandards, nameMap: basicNameMap, topForPrompt: basicTopForPrompt };
  }
}

/**
 * Add common variations for an ingredient name
 * @param {string} canonicalName - Canonical ingredient name
 * @param {Map} nameMap - Map to add variations to
 */
function addIngredientVariations(canonicalName, nameMap) {
  const lower = canonicalName.toLowerCase();
  
  // Common variations
  if (canonicalName === 'Yellow Onion') {
    nameMap.set('onion', canonicalName);
    nameMap.set('onions', canonicalName);
  } else if (canonicalName === 'Kosher Salt') {
    nameMap.set('salt', canonicalName);
  } else if (canonicalName === 'Black Pepper') {
    nameMap.set('pepper', canonicalName);
  } else if (canonicalName === 'Extra-Virgin Olive Oil') {
    nameMap.set('olive oil', canonicalName);
    nameMap.set('extra virgin olive oil', canonicalName);
    nameMap.set('evoo', canonicalName);
  } else if (canonicalName === 'Garlic Cloves') {
    nameMap.set('garlic clove', canonicalName);
    nameMap.set('clove of garlic', canonicalName);
  } else if (canonicalName === 'Lemons') {
    nameMap.set('lemon', canonicalName);
  } else if (canonicalName === 'Limes') {
    nameMap.set('lime', canonicalName);
  }
  
  // Add plural/singular variations
  if (canonicalName.endsWith('s') && canonicalName.length > 3) {
    const singular = canonicalName.slice(0, -1);
    nameMap.set(singular.toLowerCase(), canonicalName);
  } else if (!canonicalName.endsWith('s')) {
    nameMap.set((canonicalName + 's').toLowerCase(), canonicalName);
  }
}

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
  'Kosher Mediterranean Chicken with Lemon Rice',
  'Korean-Style Grilled Salmon with Vegetables',
  'Vegan Thai Curry with Tofu',
  'Low-Carb Italian Zucchini Noodles',
  'Southern BBQ Jackfruit Sandwich'
];

// CUISINE OPTIONS (aligned with onboarding)
const VALID_CUISINES = [
  'american', 'caribbean', 'chinese', 'french', 'indian', 'italian', 
  'japanese', 'korean', 'mediterranean', 'mexican', 'southern', 'thai', 'vietnamese'
];

// DIET OPTIONS (aligned with onboarding, including new Kosher support)
const VALID_DIETS = [
  'keto', 'low-carb', 'mediterranean', 'paleo', 'pescatarian', 'plant-forward', 
  'vegan', 'vegetarian', 'whole30', 'kosher'
];

// ALLERGEN OPTIONS (aligned with onboarding foods-to-avoid)
const VALID_ALLERGENS = [
  'dairy', 'egg', 'gluten', 'grain', 'peanut', 'seafood', 'sesame', 
  'shellfish', 'soy', 'sulfite', 'tree_nut', 'wheat'
];

// COMPREHENSIVE INGREDIENT CATEGORIES (updated and consolidated)
const INGREDIENT_CATEGORIES = [
  // Proteins
  'Meat & Poultry', 'Seafood', 'Dairy & Eggs',
  // Produce & Fresh
  'Fresh Herbs', 'Produce',
  // Grains & Carbs
  'Rice & Grains', 'Pasta', 'Nuts & Seeds',
  // Flavor & Cooking (consolidated)
  'Spices, Seasonings, & Oils', 'Condiments & Sauces',
  // Processed & Prepared
  'Canned Goods', 'Frozen', 'Baking & Pantry Staples', 'Bakery & Bread',
  // Specialty
  'International', 'Gourmet'
];

// INSTACART SUPPORTED UNITS OF MEASUREMENT
const VALID_UNITS = [
  // Volume - Liquid Measurements
  'cup', 'cups', 'c',
  'fl oz', 'fl oz can', 'fl oz container', 'fl oz jar', 'fl oz pouch', 
  'gallon', 'gallons', 'gal', 'gals',
  'milliliter', 'milliliters', 'ml', 'mls',
  'liter', 'liters', 'l',
  'pint', 'pints', 'pt', 'pts', 'pt container',
  'quart', 'quarts', 'qt', 'qts',
  'tablespoon', 'tablespoons', 'tbsp', 'tb', 'tbs',
  'teaspoon', 'teaspoons', 'tsp', 'ts', 'tspn',
  
  // Weight Measurements
  'gram', 'grams', 'g', 'gs',
  'kilogram', 'kilograms', 'kg', 'kgs',
  'lb', 'lb bag', 'lb can', 'lb container', 'per lb',
  'ounce', 'ounces', 'oz', 'oz bag', 'oz can', 'oz container',
  'pound', 'pounds', 'lbs',
  
  // Count/Discrete Items
  'bunch', 'bunches',
  'can', 'cans',
  'each', 'count',
  'ears',
  'head', 'heads',
  'large', 'lrg', 'lge', 'lg',
  'medium', 'med', 'md',
  'package', 'packages', 'pkg',
  'packet',
  'small', 'sm',
  'small ears',
  'small head', 'small heads',
  
  // Additional common units
  'clove', 'cloves',
  'piece', 'pieces',
  'slice', 'slices',
  'pinch', 'dash'
];

// COOKING EQUIPMENT OPTIONS (comprehensive list provided)
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
  'kugelhopf pan', 'pastry brush', 'popsicle sticks', 'spatula', 'cake server', 'poultry shears',
  'box grater', 'cupcake toppers', 'funnel', 'drinking straws', 'slotted spoon', 'ceramic pie form',
  'pepper grinder', 'mortar and pestle', 'baster', 'melon baller', 'zester', 'pastry cutter',
  'ziploc bags', 'aluminum foil', 'toothpicks', 'pot', 'baking pan', 'ladle', 'apple cutter',
  'fillet knife', 'toaster', 'heart shaped cake form', 'grill pan', 'wooden spoon', 'paper towels',
  'cookie cutter', 'tart form', 'pizza board', 'glass casserole dish', 'madeleine form',
  'metal skewers', 'microplane', 'stand mixer', 'whisk', 'mixing bowl', 'deep fryer',
  'canning jar', 'cheese knife', 'hand mixer', 'butter curler', 'food processor', 'wax paper',
  'grater', 'gravy boat', 'muffin liners', 'butter knife', 'waffle iron', 'double boiler',
  'can opener', 'mandoline', 'kitchen twine', 'juicer', 'wok', 'measuring cup', 'ramekin',
  'airfryer', 'instant pot', 'spoon', 'dough scraper', 'microwave', 'roasting pan',
  'pressure cooker', 'dehydrator', 'baking paper', 'silicone muffin liners', 'loaf pan',
  'cake topper', 'dutch oven', 'baking spatula', 'popsicle molds', 'teapot', 'cocktail sticks',
  'cleaver', 'rice cooker', 'bread machine', 'fork', 'ice cream scoop', 'slow cooker',
  'knife', 'kitchen scale', 'griddle', 'frosting cake topper', 'cutting board', 'cake pop mold',
  'oven', 'colander', 'kitchen timer', 'panini press', 'pasta machine', 'popcorn maker',
  'lollipop sticks', 'steamer basket', 'chopsticks', 'chefs knife', 'blender', 'pizza stone',
  'skewers', 'sauce pan', 'peeler', 'stove', 'pot holder', 'springform pan', 'apple corer',
  'potato masher', 'serrated knife'
];

// Global ingredient maps - loaded from CSV at startup
let INGREDIENT_STANDARDS = new Map();
let INGREDIENT_NAME_MAP = new Map();
let TOP_INGREDIENTS_FOR_PROMPT = [];

// Legacy constants for backward compatibility (now replaced by CSV loading)
// TOP 200 STANDARDIZED INGREDIENTS (from CSV analysis of 750+ ingredients across 532 meals)
// Format: [canonical_name, unit, category]
// Units are Instacart-compatible and appropriate for recipe use
// NOTE: This is now loaded from CSV - keeping for fallback only
const LEGACY_STANDARD_INGREDIENTS = [
  // TOP PRODUCE (ranked by usage frequency)
  ['Garlic', 'head', 'Produce'],                    // 468 uses
  ['Lemons', 'each', 'Produce'],                    // 333 uses  
  ['Yellow Onion', 'each', 'Produce'],              // 170 uses
  ['Limes', 'each', 'Produce'],                     // 149 uses
  ['Carrots', 'each', 'Produce'],                   // 95 uses
  ['Red Onion', 'each', 'Produce'],                 // 71 uses
  ['Red Bell Pepper', 'each', 'Produce'],           // 66 uses (fixed category)
  ['Cherry Tomatoes', 'each', 'Produce'],           // 52 uses
  ['Tomatoes', 'each', 'Produce'],                  // 47 uses
  ['Cucumber', 'each', 'Produce'],                  // 44 uses
  ['Avocado', 'each', 'Produce'],                   // 39 uses
  ['Zucchini', 'each', 'Produce'],                  // 36 uses
  ['Spinach', 'package', 'Produce'],                // 34 uses
  ['Baby Spinach', 'package', 'Produce'],           // 22 uses
  ['Jalapeño', 'each', 'Produce'],                  // 20 uses
  ['Sweet Potatoes', 'each', 'Produce'],            // 18 uses
  ['Broccoli Florets', 'package', 'Produce'],       // 17 uses
  ['Bell Pepper', 'each', 'Produce'],               // 16 uses (fixed category)
  ['Potatoes', 'each', 'Produce'],                  // 15 uses
  ['Green Chiles', 'package', 'Produce'],           // 15 uses
  ['Green Cabbage', 'head', 'Produce'],             // 14 uses
  ['Romaine Lettuce', 'head', 'Produce'],           // 13 uses
  ['Red Chili', 'package', 'Produce'],              // 13 uses
  ['Shiitake Mushrooms', 'each', 'Produce'],        // 12 uses
  ['Roma Tomatoes', 'each', 'Produce'],             // 11 uses
  ['Cauliflower', 'package', 'Produce'],            // 11 uses
  ['Thai Bird Chiles', 'package', 'Produce'],       // 11 uses
  ['Mixed Greens', 'package', 'Produce'],           // 10 uses
  ['Green Bell Pepper', 'each', 'Produce'],         // 10 uses (fixed category)
  ['Arugula', 'package', 'Produce'],                // 10 uses
  ['Cremini Mushrooms', 'each', 'Produce'],         // 9 uses
  ['Baby Potatoes', 'each', 'Produce'],             // 9 uses
  ['Napa Cabbage', 'head', 'Produce'],              // 9 uses
  ['Cauliflower Florets', 'package', 'Produce'],    // 9 uses
  ['Celery Stalks', 'package', 'Produce'],          // 9 uses
  ['Orange Juice', 'each', 'Produce'],              // 8 uses (should be fl oz)
  ['Celery', 'package', 'Produce'],                 // 8 uses
  ['Celery Stalk', 'package', 'Produce'],           // 8 uses  
  ['Kale', 'package', 'Produce'],                   // 8 uses
  ['English Cucumber', 'each', 'Produce'],          // 7 uses
  ['Cabbage', 'head', 'Produce'],                   // 7 uses
  ['Corn Kernels', 'package', 'Produce'],           // 7 uses
  ['White Onion', 'each', 'Produce'],               // 7 uses
  ['Yellow Bell Pepper', 'each', 'Produce'],        // 6 uses (fixed category)
  ['Shallot', 'package', 'Produce'],                // 80 uses
  ['Ginger', 'per lb', 'Produce'],                  // 117 uses
  ['Scallions', 'package', 'Produce'],              // 146 uses (fixed category)
  ['Mixed Salad Greens', 'package', 'Produce'],     // 18 uses
  
  // FRESH HERBS (by usage frequency) 
  ['Parsley', 'bunch', 'Fresh Herbs'],              // 171 uses
  ['Cilantro', 'bunch', 'Fresh Herbs'],             // 137 uses
  ['Thyme', 'bunch', 'Fresh Herbs'],                // 69 uses
  ['Oregano', 'bunch', 'Fresh Herbs'],              // 56 uses
  ['Basil', 'bunch', 'Fresh Herbs'],                // 51 uses
  ['Dill', 'bunch', 'Fresh Herbs'],                 // 20 uses
  ['Rosemary', 'bunch', 'Fresh Herbs'],             // 18 uses
  ['Chives', 'bunch', 'Fresh Herbs'],               // 12 uses
  ['Mint Leaves', 'bunch', 'Fresh Herbs'],          // 12 uses
  ['Mint', 'bunch', 'Fresh Herbs'],                 // 11 uses
  ['Thai Basil Leaves', 'bunch', 'Fresh Herbs'],    // 7 uses
  
  // SPICES, SEASONINGS, & OILS (by usage frequency)
  ['Black Pepper', 'each', 'Spices, Seasonings, & Oils'],        // 449 uses
  ['Extra-Virgin Olive Oil', 'fl oz', 'Spices, Seasonings, & Oils'], // 380 uses
  ['Salt', 'ounce', 'Spices, Seasonings, & Oils'],               // 333 uses
  ['Vegetable Oil', 'fl oz', 'Spices, Seasonings, & Oils'],      // 188 uses
  ['Red Pepper Flakes', 'each', 'Spices, Seasonings, & Oils'],   // 158 uses
  ['Kosher Salt', 'ounce', 'Spices, Seasonings, & Oils'],        // 122 uses
  ['Cumin', 'ounce', 'Spices, Seasonings, & Oils'],              // 99 uses
  ['Smoked Paprika', 'ounce', 'Spices, Seasonings, & Oils'],     // 88 uses
  ['Sea Salt', 'ounce', 'Spices, Seasonings, & Oils'],           // 67 uses
  ['Sesame Oil', 'fl oz', 'Spices, Seasonings, & Oils'],         // 53 uses
  ['Turmeric', 'ounce', 'Spices, Seasonings, & Oils'],           // 40 uses
  ['Coriander', 'ounce', 'Spices, Seasonings, & Oils'],          // 30 uses
  ['Toasted Sesame Oil', 'fl oz', 'Spices, Seasonings, & Oils'], // 29 uses
  ['Garam Masala', 'ounce', 'Spices, Seasonings, & Oils'],       // 20 uses
  ['Paprika', 'ounce', 'Spices, Seasonings, & Oils'],            // 15 uses
  ['Cayenne Pepper', 'each', 'Spices, Seasonings, & Oils'],      // 14 uses
  ['White Pepper', 'each', 'Spices, Seasonings, & Oils'],        // 13 uses
  ['Sweet Paprika', 'ounce', 'Spices, Seasonings, & Oils'],      // 11 uses
  ['Cumin Seeds', 'ounce', 'Spices, Seasonings, & Oils'],        // 11 uses
  ['Allspice', 'ounce', 'Spices, Seasonings, & Oils'],           // 10 uses
  ['Scotch Bonnet Pepper', 'each', 'Spices, Seasonings, & Oils'], // 10 uses
  ['Sumac', 'ounce', 'Spices, Seasonings, & Oils'],              // 9 uses
  ['Avocado Oil', 'fl oz', 'Spices, Seasonings, & Oils'],        // 8 uses
  ['Gochugaru', 'ounce', 'Spices, Seasonings, & Oils'],          // 8 uses
  ['Chili Oil', 'fl oz', 'Spices, Seasonings, & Oils'],          // 8 uses
  ['Whole Cloves', 'ounce', 'Spices, Seasonings, & Oils'],       // 7 uses
  ['Saffron Threads', 'ounce', 'Spices, Seasonings, & Oils'],    // 6 uses
  
  // DAIRY & EGGS (by usage frequency)
  ['Large Eggs', 'large', 'Dairy & Eggs'],          // 145 uses
  ['Butter', 'ounce', 'Dairy & Eggs'],              // 136 uses  
  ['Parmesan Cheese', 'ounce', 'Dairy & Eggs'],     // 57 uses
  ['Feta Cheese', 'ounce', 'Dairy & Eggs'],         // 37 uses
  ['Whole Milk', 'gallon', 'Dairy & Eggs'],         // 31 uses
  ['Heavy Cream', 'pint', 'Dairy & Eggs'],          // 21 uses
  ['Greek Yogurt', 'ounce', 'Dairy & Eggs'],        // 16 uses
  ['Yogurt', 'ounce', 'Dairy & Eggs'],              // 15 uses
  ['Ghee', 'ounce', 'Dairy & Eggs'],                // 11 uses
  ['Buttermilk', 'gallon', 'Dairy & Eggs'],         // 11 uses
  ['Sharp Cheddar Cheese', 'ounce', 'Dairy & Eggs'], // 9 uses
  ['Ricotta Cheese', 'ounce', 'Dairy & Eggs'],      // 9 uses
  ['Sour Cream', 'pint', 'Dairy & Eggs'],           // 7 uses
  ['Mozzarella Cheese', 'ounce', 'Dairy & Eggs'],   // 7 uses
  ['Mozzarella', 'ounce', 'Dairy & Eggs'],          // 7 uses
  ['Halloumi Cheese', 'ounce', 'Dairy & Eggs'],     // 6 uses
  
  // MEAT & POULTRY (by usage frequency)
  ['Chicken Broth', 'pound', 'Meat & Poultry'],     // 60 uses (should be Canned Goods)
  ['Chicken Thighs', 'pound', 'Meat & Poultry'],    // 46 uses
  ['Chicken Breasts', 'pound', 'Meat & Poultry'],   // 31 uses
  ['Beef', 'pound', 'Meat & Poultry'],              // 21 uses
  ['Pork', 'pound', 'Meat & Poultry'],              // 16 uses
  ['Pork Shoulder', 'pound', 'Meat & Poultry'],     // 13 uses
  ['Bacon', 'pound', 'Meat & Poultry'],             // 10 uses
  ['Turkey', 'pound', 'Meat & Poultry'],            // 9 uses
  ['Pork Belly', 'pound', 'Meat & Poultry'],        // 8 uses
  ['Beef Broth', 'pound', 'Meat & Poultry'],        // 7 uses (should be Canned Goods)
  ['Whole Chicken', 'pound', 'Meat & Poultry'],     // 7 uses
  ['Pork Chops', 'pound', 'Meat & Poultry'],        // 6 uses
  
  // SEAFOOD (by usage frequency)
  ['Salmon Fillets', 'pound', 'Seafood'],           // 21 uses
  ['Cod Fillets', 'pound', 'Seafood'],              // 11 uses
  ['Oyster Sauce', 'pound', 'Seafood'],             // 8 uses (should be Condiments & Sauces)
  
  // CONDIMENTS & SAUCES (by usage frequency)
  ['Soy Sauce', 'fl oz', 'Condiments & Sauces'],    // 145 uses
  ['Rice Vinegar', 'fl oz', 'Condiments & Sauces'], // 48 uses
  ['Fish Sauce', 'fl oz', 'Condiments & Sauces'],   // 42 uses
  ['Tomato Paste', 'each', 'Condiments & Sauces'],  // 38 uses
  ['Mayonnaise', 'fl oz', 'Condiments & Sauces'],   // 29 uses
  ['Dijon Mustard', 'fl oz', 'Condiments & Sauces'], // 26 uses
  ['Tahini', 'ounce', 'Condiments & Sauces'],       // 26 uses
  ['Red Wine Vinegar', 'fl oz', 'Condiments & Sauces'], // 25 uses
  ['White Wine', 'fl oz', 'Condiments & Sauces'],   // 22 uses
  ['Mirin', 'fl oz', 'Condiments & Sauces'],        // 21 uses
  ['Apple Cider Vinegar', 'each', 'Condiments & Sauces'], // 15 uses
  ['Gochujang', 'ounce', 'Condiments & Sauces'],    // 13 uses
  ['Coconut Aminos', 'fl oz', 'Condiments & Sauces'], // 10 uses
  ['Balsamic Vinegar', 'fl oz', 'Condiments & Sauces'], // 10 uses
  ['Red Wine', 'fl oz', 'Condiments & Sauces'],     // 10 uses
  ['Sauce', 'fl oz', 'Condiments & Sauces'],        // 8 uses
  ['Worcestershire Sauce', 'fl oz', 'Condiments & Sauces'], // 8 uses
  ['White Miso Paste', 'ounce', 'Condiments & Sauces'], // 8 uses
  ['Mustard Seeds', 'fl oz', 'Condiments & Sauces'], // 6 uses
  ['White Vinegar', 'fl oz', 'Condiments & Sauces'], // 6 uses
  
  // RICE & GRAINS (by usage frequency)
  ['Quinoa', 'pound', 'Rice & Grains'],             // 79 uses
  ['Jasmine Rice', 'pound', 'Rice & Grains'],       // 48 uses
  ['Basmati Rice', 'pound', 'Rice & Grains'],       // 17 uses
  ['Rice', 'pound', 'Rice & Grains'],               // 16 uses
  ['White Rice', 'pound', 'Rice & Grains'],         // 15 uses
  ['Cauliflower Rice', 'pound', 'Rice & Grains'],   // 14 uses
  ['Brown Rice', 'pound', 'Rice & Grains'],         // 8 uses
  ['Couscous', 'pound', 'Rice & Grains'],           // 7 uses
  ['Long Grain White Rice', 'pound', 'Rice & Grains'], // 9 uses
  ['Short Grain Rice', 'pound', 'Rice & Grains'],   // 7 uses
  ['Short Grain White Rice', 'pound', 'Rice & Grains'], // 7 uses
  
  // PASTA (by usage frequency)
  ['Rice Noodles', 'pound', 'Pasta'],               // 11 uses
  
  // CANNED GOODS (by usage frequency) 
  ['Vegetable Broth', 'can', 'Canned Goods'],       // 62 uses
  ['Canned Tomatoes', 'each', 'Canned Goods'],      // 61 uses
  ['Coconut Milk', 'can', 'Canned Goods'],          // 25 uses
  ['Canned Chickpeas', 'can', 'Canned Goods'],      // 22 uses
  ['Anchovy Fillets', 'can', 'Canned Goods'],       // 9 uses
  
  // NUTS & SEEDS (by usage frequency)
  ['Sesame Seeds', 'ounce', 'Nuts & Seeds'],        // 60 uses
  ['Pine Nuts', 'ounce', 'Nuts & Seeds'],           // 15 uses
  ['Pumpkin Seeds', 'ounce', 'Nuts & Seeds'],       // 10 uses
  ['Walnuts', 'ounce', 'Nuts & Seeds'],             // 9 uses
  ['Roasted Peanuts', 'ounce', 'Nuts & Seeds'],     // 7 uses
  ['Almonds', 'ounce', 'Nuts & Seeds'],             // 7 uses
  
  // BAKING & PANTRY STAPLES (by usage frequency)
  ['Water', 'fl oz', 'Baking & Pantry Staples'],    // 151 uses
  ['Granulated Sugar', 'package', 'Baking & Pantry Staples'], // 100 uses  
  ['All-Purpose Flour', 'package', 'Baking & Pantry Staples'], // 55 uses
  ['Brown Sugar', 'package', 'Baking & Pantry Staples'], // 39 uses
  ['Honey', 'fl oz', 'Baking & Pantry Staples'],    // 38 uses
  ['Cornstarch', 'package', 'Baking & Pantry Staples'], // 37 uses
  ['Capers', 'package', 'Baking & Pantry Staples'], // 36 uses
  ['Shrimp', 'package', 'Baking & Pantry Staples'], // 34 uses (should be Seafood)
  ['Bay Leaf', 'ounce', 'Baking & Pantry Staples'], // 28 uses
  ['Maple Syrup', 'package', 'Baking & Pantry Staples'], // 25 uses
  ['Kalamata Olives', 'package', 'Baking & Pantry Staples'], // 22 uses
  ['Tofu', 'package', 'Baking & Pantry Staples'],   // 20 uses
  ['Chickpeas', 'package', 'Baking & Pantry Staples'], // 18 uses
  ['Mixed Vegetables', 'package', 'Baking & Pantry Staples'], // 17 uses
  ['Cinnamon', 'ounce', 'Baking & Pantry Staples'], // 17 uses
  ['Black Beans', 'package', 'Baking & Pantry Staples'], // 16 uses
  ['Green Beans', 'package', 'Baking & Pantry Staples'], // 15 uses (should be Produce)
  ['Extra Tofu', 'package', 'Baking & Pantry Staples'], // 13 uses
  ['Baking Powder', 'ounce', 'Baking & Pantry Staples'], // 11 uses
  ['Bean Sprouts', 'package', 'Baking & Pantry Staples'], // 10 uses
  ['Palm Sugar', 'package', 'Baking & Pantry Staples'], // 10 uses
  ['Green Olives', 'package', 'Baking & Pantry Staples'], // 9 uses
  ['Erythritol', 'package', 'Baking & Pantry Staples'], // 8 uses
  ['Bok Choy', 'package', 'Baking & Pantry Staples'], // 7 uses (should be Produce)
  ['Vanilla Extract', 'package', 'Baking & Pantry Staples'], // 7 uses
  ['Fenugreek Leaves', 'package', 'Baking & Pantry Staples'], // 7 uses
  ['Nutmeg', 'ounce', 'Baking & Pantry Staples'],   // 6 uses
  
  // BAKERY & BREAD (by usage frequency)
  ['Corn Tortillas', 'package', 'Bakery & Bread'],  // 14 uses
  ['Crusty Bread', 'package', 'Bakery & Bread'],    // 11 uses
  ['Pita Bread', 'package', 'Bakery & Bread'],      // 9 uses
  ['Bread', 'package', 'Bakery & Bread'],           // 9 uses
  ['Sourdough Bread', 'package', 'Bakery & Bread'], // 8 uses
  ['Breadcrumbs', 'package', 'Bakery & Bread'],     // 6 uses
  
  // FROZEN (by usage frequency)
  ['Frozen Peas', 'package', 'Frozen'],             // 12 uses
  
  // PRODUCE MISCLASSIFIED (need to fix)
  ['Chili Powder', 'package', 'Produce'],           // 34 uses (should be Spices)
  ['Onion Powder', 'each', 'Produce'],              // 9 uses (should be Spices)
  
  // SEAFOOD MISCLASSIFIED (need to fix)  
  ['Butter Lettuce Leaves', 'head', 'Dairy & Eggs'], // 7 uses (should be Produce)
  
  // MEAT MISCLASSIFIED (need to fix)
  ['Flank Steak', 'package', 'Baking & Pantry Staples'] // 9 uses (should be Meat & Poultry)
];

// Legacy ingredient lookup - now replaced by CSV loading  
// const INGREDIENT_NAME_MAP = {}; // Removed - now uses Map from CSV
// const INGREDIENT_STANDARDS = {}; // Removed - now uses Map from CSV

// Legacy ingredient map building - now handled by CSV loading
// This is kept for reference but not executed
/*
LEGACY_STANDARD_INGREDIENTS.forEach(([name, unit, category]) => {
  // Add the canonical name to standards
  LEGACY_INGREDIENT_STANDARDS[name] = { name, unit, category };
  
  // Add common variations to the name map
  const lowerName = name.toLowerCase();
  LEGACY_INGREDIENT_NAME_MAP[lowerName] = name;
  
  // Add common variations for each ingredient
  if (name === 'Yellow Onion') {
    LEGACY_INGREDIENT_NAME_MAP['onion'] = name;
    LEGACY_INGREDIENT_NAME_MAP['onions'] = name;
  } else if (name === 'Garlic Cloves') {
    LEGACY_INGREDIENT_NAME_MAP['garlic clove'] = name;
    LEGACY_INGREDIENT_NAME_MAP['clove of garlic'] = name;
  } else if (name === 'Extra-Virgin Olive Oil') {
    LEGACY_INGREDIENT_NAME_MAP['olive oil'] = name;
    LEGACY_INGREDIENT_NAME_MAP['extra virgin olive oil'] = name;
    LEGACY_INGREDIENT_NAME_MAP['evoo'] = name;
  } else if (name === 'Kosher Salt') {
    LEGACY_INGREDIENT_NAME_MAP['salt'] = name;
  } else if (name === 'Large Eggs') {
    LEGACY_INGREDIENT_NAME_MAP['eggs'] = name;
    LEGACY_INGREDIENT_NAME_MAP['egg'] = name;
    LEGACY_INGREDIENT_NAME_MAP['large egg'] = name;
  } else if (name === 'Chicken Breasts') {
    LEGACY_INGREDIENT_NAME_MAP['chicken breast'] = name;
    LEGACY_INGREDIENT_NAME_MAP['boneless chicken breast'] = name;
    LEGACY_INGREDIENT_NAME_MAP['boneless skinless chicken breast'] = name;
    LEGACY_INGREDIENT_NAME_MAP['boneless skinless chicken breasts'] = name;
  } else if (name === 'White Rice') {
    LEGACY_INGREDIENT_NAME_MAP['rice'] = name; // Default rice to white rice
    LEGACY_INGREDIENT_NAME_MAP['long grain rice'] = name;
  } else if (name === 'Red Bell Pepper') {
    LEGACY_INGREDIENT_NAME_MAP['bell pepper'] = name; // Default to red bell pepper
    LEGACY_INGREDIENT_NAME_MAP['bell peppers'] = name;
    LEGACY_INGREDIENT_NAME_MAP['red bell peppers'] = name;
  } else if (name === 'Tomatoes') {
    LEGACY_INGREDIENT_NAME_MAP['tomato'] = name;
  } else if (name === 'Fresh Mozzarella') {
    LEGACY_INGREDIENT_NAME_MAP['fresh mozzarella cheese'] = name;
    LEGACY_INGREDIENT_NAME_MAP['buffalo mozzarella'] = name;
  } else if (name === 'All-Purpose Flour') {
    LEGACY_INGREDIENT_NAME_MAP['flour'] = name; // Default flour to all-purpose
    LEGACY_INGREDIENT_NAME_MAP['all purpose flour'] = name;
    LEGACY_INGREDIENT_NAME_MAP['ap flour'] = name;
  } else if (name === 'Granulated Sugar') {
    LEGACY_INGREDIENT_NAME_MAP['sugar'] = name; // Default sugar to granulated
    LEGACY_INGREDIENT_NAME_MAP['white sugar'] = name;
    LEGACY_INGREDIENT_NAME_MAP['cane sugar'] = name;
  }
  
  // Add plural/singular variations automatically
  if (name.endsWith('s') && !name.endsWith('ss')) {
    // Remove 's' for singular form
    const singular = name.slice(0, -1).toLowerCase();
    LEGACY_INGREDIENT_NAME_MAP[singular] = name;
  } else if (!name.endsWith('s') && !name.includes(' ')) {
    // Add 's' for plural form  
    const plural = name.toLowerCase() + 's';
    LEGACY_INGREDIENT_NAME_MAP[plural] = name;
  }
  
  // Add "fresh" variations for herbs
  if (category === 'Fresh Herbs') {
    LEGACY_INGREDIENT_NAME_MAP[`fresh ${lowerName}`] = name;
  }
});
*/

// Function to standardize ingredient (updated for CSV-based maps)
function standardizeIngredient(rawName) {
  if (!rawName) return null;
  
  const normalized = rawName.toLowerCase().trim();
  
  // Check direct mapping in CSV-loaded standards
  if (INGREDIENT_NAME_MAP.has && INGREDIENT_NAME_MAP.has(normalized)) {
    const canonicalName = INGREDIENT_NAME_MAP.get(normalized);
    const standard = INGREDIENT_STANDARDS.get(canonicalName);
    if (standard) {
      return {
        name: standard.name,
        unit: standard.unit,
        category: standard.category
      };
    }
  }
  
  // Check if it's already a canonical name
  const titleCase = rawName.replace(/\b\w/g, l => l.toUpperCase());
  if (INGREDIENT_STANDARDS.has && INGREDIENT_STANDARDS.has(titleCase)) {
    const standard = INGREDIENT_STANDARDS.get(titleCase);
    return {
      name: standard.name,
      unit: standard.unit,
      category: standard.category
    };
  }
  
  // No legacy fallback needed - CSV system is comprehensive
  
  // Final fallback: create basic standard format
  return {
    name: titleCase,
    unit: 'each', // Safe default unit
    category: 'Gourmet' // Catch-all category
  };
}

// OpenAI prompt for meal generation (updated with new fields and constraints)
const GENERATION_PROMPT = `You are a professional recipe developer. Generate a comprehensive meal data object for the given meal name.

IMPORTANT: Include ALL required fields including the new cooking_equipment field.

FIELD CONSTRAINTS:
- cuisines: ONLY use these exact values: ${VALID_CUISINES.join(', ')}
- diets_supported: ONLY use these exact values: ${VALID_DIETS.join(', ')} (including new "kosher" option)
- allergens_present: ONLY use these exact values: ${VALID_ALLERGENS.join(', ')}
- cooking_equipment: ONLY use equipment from this list: ${COOKING_EQUIPMENT.slice(0, 20).join(', ')}... (analyze recipe and select appropriate equipment)

HEALTH FILTERS LOGIC:
- ORGANIC: Apply to fresh produce, dairy, eggs, meat when organic varieties exist
- GLUTEN_FREE: Apply to all ingredients except wheat/flour-based items (pasta, bread, flour)
- VEGAN: Apply only if the entire meal is vegan (no meat, dairy, eggs, fish)
- KOSHER: Apply to meat, dairy, processed foods when kosher versions exist
- FAT_FREE/LOW_FAT: Apply to dairy products, dressings where low-fat versions exist
- SUGAR_FREE: Apply to condiments, sauces, beverages where sugar-free versions exist

BRAND FILTERS LOGIC:
- Suggest 2-4 major brands that commonly carry each product type
- Use exact brand names as they appear on Instacart (case-sensitive)
- Examples: Pasta = ["Barilla", "De Cecco"], Olive Oil = ["Bertolli", "California Olive Ranch"]
- For generic items use store brands: ["Whole Foods Market", "Kroger Brand", "Great Value"]

INGREDIENT SCHEMA (Instacart API compatible):
- name: Use specific, standardized ingredient names (e.g., "Red Bell Pepper", "Chicken Breasts", "Extra-Virgin Olive Oil")
- quantity: Numeric amount
- unit: ONLY use Instacart-supported units: cup, teaspoon, tablespoon, ounce, pound, gram, each, clove, etc.
- category: ONLY use these: ${INGREDIENT_CATEGORIES.join(', ')} (for internal use)
- health_filters: Array of applicable filters from: ["ORGANIC", "GLUTEN_FREE", "FAT_FREE", "VEGAN", "KOSHER", "SUGAR_FREE", "LOW_FAT"] (based on ingredient type)
- brand_filters: Array of common brand names that would carry this product (e.g., ["Barilla", "De Cecco"] for pasta)

STANDARDIZED INGREDIENT NAMES (use these exact names when possible):
PRODUCE: Garlic, Garlic Cloves, Lemons, Yellow Onion, Red Onion, Limes, Carrots, Red Bell Pepper, Cherry Tomatoes, Tomatoes, Cucumber, Avocado
SPICES & OILS: Black Pepper, Extra-Virgin Olive Oil, Kosher Salt, Vegetable Oil, Red Pepper Flakes, Cumin, Smoked Paprika, Sesame Oil, Turmeric
HERBS: Parsley, Cilantro, Thyme, Oregano, Basil, Mint, Scallions
DAIRY: Large Eggs, Butter, Parmesan Cheese, Fresh Mozzarella, Heavy Cream, Sour Cream
GRAINS: Quinoa, White Rice, Jasmine Rice, Brown Rice, Rice Noodles
PROTEINS: Chicken Thighs, Chicken Breasts, Ground Beef, Cod Fillets, Salmon Fillets
PANTRY: All-Purpose Flour, Granulated Sugar, Brown Sugar, Honey, Baking Powder, Vanilla Extract

NAMING GUIDELINES:
- Use these exact standardized names when the ingredient matches
- For variations, be specific: "Red Bell Pepper" not "bell pepper", "Chicken Breasts" not "chicken"
- Default mappings: "rice" = "White Rice", "onion" = "Yellow Onion", "salt" = "Kosher Salt", "flour" = "All-Purpose Flour"

IMPORTANT - VALID UNITS: Use only these Instacart-supported units: ${VALID_UNITS.slice(0, 20).join(', ')}... (over 50 valid options)

CRITICAL: Return ONLY valid JSON. Do not include any text before or after the JSON object. Do not use markdown code blocks. The response must be valid JSON matching this exact schema:

{
  "slug": "url-friendly-meal-name",
  "title": "Proper Meal Title",
  "description": "Appetizing 2-3 sentence description that makes you want to cook it",
  "courses": ["lunch", "dinner"],
  "cuisines": ["mediterranean"],
  "diets_supported": ["mediterranean", "kosher"],
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
  "allergens_present": ["seafood"],
  "search_keywords": ["cod", "mediterranean", "healthy", "baked", "lemon"],
  "cooking_equipment": ["baking sheet", "mixing bowl", "knife", "cutting board"],
  "ingredients_json": {
    "ingredients": [
      {
        "name": "Cod Fillets",
        "quantity": 1.5,
        "unit": "pound",
        "category": "Seafood",
        "health_filters": ["GLUTEN_FREE"],
        "brand_filters": ["Wild Planet", "Whole Foods Market"]
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

GUIDELINES:
- prep_time + cook_time should equal time_total_min
- cooking_difficulty: Based on TECHNIQUE and SKILL:
  * EASY: Simple techniques, forgiving (roasted vegetables, basic pasta)
  * MEDIUM: Some technique, moderate attention (stir-fry, braised meats)
  * CHALLENGING: Complex techniques, high skill (risotto, soufflé, perfect steak)
- courses: ONLY use "breakfast", "lunch", or "dinner" (lowercase)
- cuisines: Must be from the VALID_CUISINES list only
- diets_supported: Only include if meal STRICTLY complies with diet
- spice_level: 1-5 scale (1=mild, 5=very spicy)
- cost_per_serving: "$" (budget), "$$" (moderate), "$$$" (premium)
- allergens_present: Use VALID_ALLERGENS list, identify common allergens
- cooking_equipment: Analyze the cooking methods and list ALL necessary equipment from the provided list
- search_keywords: 8-12 relevant searchable terms
- ingredients: Use INGREDIENT_CATEGORIES exactly as listed
- kosher: If meal follows kosher dietary laws, include "kosher" in diets_supported

COOKING EQUIPMENT SELECTION:
Analyze the meal name and cooking instructions. Select ALL equipment needed from the provided list:
- Basic equipment (knife, cutting board, mixing bowl) for most recipes
- Cooking vessels (pot, frying pan, baking sheet, etc.) based on cooking method  
- Specialized tools based on techniques (whisk for mixing, tongs for grilling, etc.)
- Be comprehensive but realistic - include what's actually needed

Generate data for: "{MEAL_NAME}"`;

/**
 * Build system prompt with constraints and rules
 * @returns {string} - System prompt
 */
function buildSystemPrompt() {
  return `You are a professional recipe developer. Generate comprehensive meal data strictly following the JSON schema.

FIELD CONSTRAINTS:
- cuisines: ONLY use these exact values: ${VALID_CUISINES.join(', ')}
- diets_supported: ONLY use these exact values: ${VALID_DIETS.join(', ')}
- allergens_present: ONLY use these exact values: ${VALID_ALLERGENS.join(', ')}
- cooking_equipment: Select appropriate equipment from the comprehensive list provided
- units: Use only Instacart-compatible units: ${CANONICAL_UNITS.slice(0, 15).join(', ')}, etc.

HEALTH FILTERS LOGIC:
- ORGANIC: Apply to fresh produce, dairy, eggs, meat when organic varieties exist
- GLUTEN_FREE: Apply to all ingredients except wheat/flour-based items
- VEGAN: Apply only if the entire meal is vegan (no animal products)
- KOSHER: Apply to meat, dairy, processed foods when kosher versions exist

BRAND FILTERS: Suggest 2-4 major brands that commonly carry each product type.

TIME CONSISTENCY: Ensure prep_time + cook_time = time_total_min exactly.

COOKING DIFFICULTY:
- easy: Simple techniques, forgiving recipes
- medium: Some technique required, moderate attention
- challenging: Complex techniques, high skill needed

Return only valid JSON matching the schema. No text before or after.`;
}

/**
 * Build user prompt for specific meal
 * @param {string} mealName - Name of meal to generate
 * @returns {string} - User prompt
 */
function buildUserPrompt(mealName) {
  const topIngredients = TOP_INGREDIENTS_FOR_PROMPT.slice(0, 50).join(', ');
  
  return `Generate meal data for: "${transliterate(mealName)}"

${topIngredients ? `Prefer these standardized ingredient names when applicable:
${topIngredients}

` : ''}Analyze the meal name and create comprehensive recipe data with:
- Appropriate cuisine and diet classifications
- Realistic prep/cook times and difficulty
- Complete ingredient list with proper units and categories
- Step-by-step cooking instructions
- All required equipment for preparation

Output only the JSON object.`;
}

async function generateMealData(mealName) {
  console.log(`🤖 Generating data for: ${mealName}`);
  
  // Ensure ingredient standards are loaded
  if (INGREDIENT_STANDARDS.size === 0) {
    console.log('📊 Loading ingredient standards from CSV...');
    const { standards, nameMap, topForPrompt } = await loadIngredientStandards();
    INGREDIENT_STANDARDS = standards;
    INGREDIENT_NAME_MAP = nameMap;
    TOP_INGREDIENTS_FOR_PROMPT = topForPrompt;
  }
  
  // Pre-generate the correct slug for the meal
  const correctSlug = generateSlug(mealName);
  console.log(`📝 Generated slug: ${correctSlug}`);
  
  try {
    const response = await openai.responses.create({
      model: 'gpt-5-mini',
      reasoning: { effort: 'medium' },
      text: {
        format: {
          name: 'Meal',
          type: 'json_schema',
          schema: MEAL_SCHEMA,
          strict: true
        }
      },
      input: [
        {
          role: 'system',
          content: buildSystemPrompt()
        },
        {
          role: 'user', 
          content: buildUserPrompt(mealName)
        }
      ],
      max_output_tokens: 6000
    });

    // With structured outputs, we get guaranteed valid JSON
    const mealData = JSON.parse(response.output_text);
    console.log('✅ Received structured JSON response');

    // Override the slug with our correctly transliterated version
    const originalSlug = mealData.slug;
    mealData.slug = correctSlug;
    if (originalSlug !== correctSlug) {
      console.log(`🔄 Corrected slug: ${originalSlug} → ${correctSlug}`);
    }

    // Validate required fields
    const requiredFields = [
      'slug', 'title', 'description', 'courses', 'cuisines', 'diets_supported',
      'primary_ingredient', 'spice_level', 'prep_time', 'cook_time', 'cooking_difficulty', 
      'time_total_min', 'servings_default', 'servings_min', 'servings_max',
      'cost_per_serving', 'allergens_present', 'search_keywords', 'cooking_equipment',
      'ingredients_json', 'instructions_json'
    ];

    const missingFields = requiredFields.filter(field => !mealData[field]);
    if (missingFields.length > 0) {
      console.error(`❌ Missing required fields for ${mealName}:`, missingFields);
      return null;
    }

    // Auto-generate ingredient_tags from ingredients
    if (mealData.ingredients_json && mealData.ingredients_json.ingredients) {
      mealData.ingredient_tags = mealData.ingredients_json.ingredients.map(ingredient => 
        ingredient.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
      );
    } else {
      mealData.ingredient_tags = [];
    }

    // Validate and clean data
    // Validate cuisines
    if (mealData.cuisines) {
      mealData.cuisines = mealData.cuisines.filter(cuisine => 
        VALID_CUISINES.includes(cuisine.toLowerCase())
      ).map(c => c.toLowerCase());
    }

    // Validate diets
    if (mealData.diets_supported) {
      mealData.diets_supported = mealData.diets_supported.filter(diet => 
        VALID_DIETS.includes(diet.toLowerCase())
      ).map(d => d.toLowerCase());
    }

    // Validate allergens
    if (mealData.allergens_present) {
      mealData.allergens_present = mealData.allergens_present.filter(allergen => 
        VALID_ALLERGENS.includes(allergen.toLowerCase())
      ).map(a => a.toLowerCase());
    }

    // Validate cooking equipment
    if (mealData.cooking_equipment) {
      mealData.cooking_equipment = mealData.cooking_equipment.filter(equipment => 
        COOKING_EQUIPMENT.includes(equipment.toLowerCase())
      );
    }

    // Fix time consistency automatically
    if (mealData.prep_time + mealData.cook_time !== mealData.time_total_min) {
      console.log(`🔧 Fixing time inconsistency: ${mealData.prep_time} + ${mealData.cook_time} != ${mealData.time_total_min}`);
      mealData.time_total_min = mealData.prep_time + mealData.cook_time;
      console.log(`✅ Corrected time_total_min to: ${mealData.time_total_min}`);
    }
    
    // Also fix instructions_json timing
    if (mealData.instructions_json) {
      mealData.instructions_json.prep_time = mealData.prep_time;
      mealData.instructions_json.cook_time = mealData.cook_time;
      mealData.instructions_json.total_time = mealData.time_total_min;
    }

    // Validate cooking difficulty
    const validDifficulties = ['easy', 'medium', 'challenging'];
    if (!validDifficulties.includes(mealData.cooking_difficulty)) {
      console.error(`❌ Invalid cooking_difficulty for ${mealName}: ${mealData.cooking_difficulty}`);
      return null;
    }

    // INGREDIENT STANDARDIZATION - Apply canonical names, units, and categories
    if (mealData.ingredients_json && mealData.ingredients_json.ingredients) {
      console.log(`🔧 Standardizing ${mealData.ingredients_json.ingredients.length} ingredients...`);
      
      // Apply standardization to each ingredient
      mealData.ingredients_json.ingredients.forEach((ingredient, index) => {
        const standardized = standardizeIngredient(ingredient.name);
        
        // Apply standardized values
        const originalName = ingredient.name;
        const originalUnit = ingredient.unit;
        const originalCategory = ingredient.category;
        
        ingredient.name = standardized.name;
        ingredient.unit = standardized.unit;
        ingredient.category = standardized.category;
        
        // Log significant changes for debugging
        if (originalName !== standardized.name || 
            originalUnit !== standardized.unit || 
            originalCategory !== standardized.category) {
          console.log(`  📝 Standardized ingredient ${index + 1}:`);
          if (originalName !== standardized.name) {
            console.log(`     Name: "${originalName}" → "${standardized.name}"`);
          }
          if (originalUnit !== standardized.unit) {
            console.log(`     Unit: "${originalUnit}" → "${standardized.unit}"`);
          }
          if (originalCategory !== standardized.category) {
            console.log(`     Category: "${originalCategory}" → "${standardized.category}"`);
          }
        }
      });
      
      console.log(`✅ Ingredient standardization complete`);
    }

    // Legacy category mapping (as fallback for any missed cases)
    if (mealData.ingredients_json && mealData.ingredients_json.ingredients) {
      mealData.ingredients_json.ingredients.forEach((ingredient, index) => {
        const originalCategory = ingredient.category;
        
        // Map old categories to new consolidated categories
        if (originalCategory === 'Fresh Produce') {
          ingredient.category = 'Produce';
        } else if (originalCategory === 'Oils & Vinegars' || originalCategory === 'Spices & Seasonings') {
          ingredient.category = 'Spices, Seasonings, & Oils';
        } else if (originalCategory === 'Condiments' || originalCategory === 'Sauces') {
          ingredient.category = 'Condiments & Sauces';
        } else if (originalCategory === 'Pantry Staples') {
          ingredient.category = 'Baking & Pantry Staples';
        } else if (!INGREDIENT_CATEGORIES.includes(ingredient.category)) {
          console.warn(`⚠️  Invalid category for ingredient ${index + 1} in ${mealName}: ${ingredient.category}`);
          
          // Try to find a close match or default to a general category
          const categoryLower = ingredient.category.toLowerCase();
          if (categoryLower.includes('produce')) {
            ingredient.category = 'Produce';
          } else if (categoryLower.includes('spice') || categoryLower.includes('seasoning') || categoryLower.includes('oil') || categoryLower.includes('vinegar')) {
            ingredient.category = 'Spices, Seasonings, & Oils';
          } else if (categoryLower.includes('condiment') || categoryLower.includes('sauce')) {
            ingredient.category = 'Condiments & Sauces';
          } else if (categoryLower.includes('bread') || categoryLower.includes('bakery')) {
            ingredient.category = 'Bakery & Bread';
          } else if (categoryLower.includes('dairy') || categoryLower.includes('egg')) {
            ingredient.category = 'Dairy & Eggs';
          } else if (categoryLower.includes('meat') || categoryLower.includes('poultry')) {
            ingredient.category = 'Meat & Poultry';
          } else if (categoryLower.includes('herb')) {
            ingredient.category = 'Fresh Herbs';
          } else if (categoryLower.includes('pantry') || categoryLower.includes('baking')) {
            ingredient.category = 'Baking & Pantry Staples';
          } else {
            ingredient.category = 'Baking & Pantry Staples'; // Default fallback
          }
        }
        
        if (originalCategory !== ingredient.category) {
          console.log(`🔄 Mapped category: ${originalCategory} → ${ingredient.category}`);
        }
        
        // Validate and fix units of measurement
        const originalUnit = ingredient.unit;
        if (!VALID_UNITS.includes(ingredient.unit)) {
          // Try to map common variations to valid Instacart units
          const unitLower = ingredient.unit.toLowerCase();
          
          // Common unit mappings
          if (unitLower === 'tbsp') {
            ingredient.unit = 'tablespoon';
          } else if (unitLower === 'tsp') {
            ingredient.unit = 'teaspoon';
          } else if (unitLower === 'oz') {
            ingredient.unit = 'ounce';
          } else if (unitLower === 'lb') {
            ingredient.unit = 'pound';
          } else if (unitLower === 'g') {
            ingredient.unit = 'gram';
          } else if (unitLower === 'kg') {
            ingredient.unit = 'kilogram';
          } else if (unitLower === 'ml') {
            ingredient.unit = 'milliliter';
          } else if (unitLower === 'l') {
            ingredient.unit = 'liter';
          } else if (unitLower === 'count') {
            ingredient.unit = 'each';
          } else {
            // Find closest match or default to a safe unit
            const bestMatch = VALID_UNITS.find(validUnit => 
              validUnit.includes(unitLower) || unitLower.includes(validUnit)
            );
            
            if (bestMatch) {
              ingredient.unit = bestMatch;
            } else {
              console.warn(`⚠️  Unknown unit for ingredient ${index + 1}: ${ingredient.unit}, defaulting to 'each'`);
              ingredient.unit = 'each';
            }
          }
        }
        
        if (originalUnit !== ingredient.unit) {
          console.log(`🔄 Corrected unit: ${originalUnit} → ${ingredient.unit}`);
        }
      });
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
      .from('meal2')
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
  console.log('🚀 Starting ChefsCart Meal Data Generation (Updated Version)');
  console.log(`📊 Processing ${TEST_MEALS.length} meals\n`);

  console.log('🔧 Configuration:');
  console.log(`  Cuisines: ${VALID_CUISINES.length} options`);
  console.log(`  Diets: ${VALID_DIETS.length} options (including Kosher)`);
  console.log(`  Allergens: ${VALID_ALLERGENS.length} options`);
  console.log(`  Ingredient Categories: ${INGREDIENT_CATEGORIES.length} categories`);
  console.log(`  Cooking Equipment: ${COOKING_EQUIPMENT.length} items\n`);

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

    // Save to database (commented out for testing)
    console.log(`🔍 Generated fields: ${Object.keys(mealData).join(', ')}`);
    console.log(`🍽️  Equipment needed: ${mealData.cooking_equipment?.join(', ') || 'None specified'}`);
    
    // Uncomment to save to database:
    // const savedData = await saveMealData(mealData);
    // if (savedData) {
    //   results.successful++;
    // } else {
    //   results.failed++;
    //   results.errors.push(`Failed to save: ${mealName}`);
    // }

    results.successful++; // For testing without DB save

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
  console.log(`💾 Database records ready for insertion`);
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

export { generateMealData, saveMealData, generateSlug, transliterate };