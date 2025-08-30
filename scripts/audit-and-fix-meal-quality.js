#!/usr/bin/env node

/**
 * ChefsCart Meal Quality Audit & Fix Script
 * 
 * This script performs a comprehensive audit and fix of all meal data to ensure:
 * 1. Meals are complete (not just a single protein)
 * 2. All ingredients are captured (matches meal name, description, instructions)
 * 3. Quantities and units are correct per Instacart standards
 * 
 * Uses GPT-4 with high-level reasoning for accurate analysis and fixes
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

// Audit configuration
const BATCH_SIZE = 10;
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1] || null;

// Valid Instacart units
const INSTACART_UNITS = {
  volume: ['cup', 'cups', 'c', 'fl oz', 'fluid ounce', 'fluid ounces', 'gal', 'gallon', 'gallons', 
           'ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters', 'pt', 'pint', 'pints', 
           'qt', 'quart', 'quarts', 'tbsp', 'tablespoon', 'tablespoons', 'tb', 'tbs', 
           'tsp', 'teaspoon', 'teaspoons', 'ts'],
  weight: ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'lb', 'pound', 'pounds', 
           'oz', 'ounce', 'ounces'],
  count: ['bunch', 'bunches', 'can', 'cans', 'each', 'ear', 'ears', 'head', 'heads', 
          'large', 'medium', 'small', 'package', 'packet', 'packages', 'packets', 'count', 
          'piece', 'pieces', 'clove', 'cloves', 'stalk', 'stalks', 'slice', 'slices']
};

// Standard portion sizes for proteins (per person)
const PROTEIN_PORTIONS = {
  'chicken': { quantity: 0.5, unit: 'lb' },
  'beef': { quantity: 0.5, unit: 'lb' },
  'pork': { quantity: 0.5, unit: 'lb' },
  'lamb': { quantity: 0.5, unit: 'lb' },
  'turkey': { quantity: 0.5, unit: 'lb' },
  'fish': { quantity: 0.5, unit: 'lb' },
  'salmon': { quantity: 0.5, unit: 'lb' },
  'cod': { quantity: 0.5, unit: 'lb' },
  'tuna': { quantity: 0.5, unit: 'lb' },
  'shrimp': { quantity: 0.5, unit: 'lb' },
  'tofu': { quantity: 0.75, unit: 'lb' },
  'tempeh': { quantity: 0.5, unit: 'lb' }
};

const AUDIT_PROMPT = `<role>
You are a professional chef and recipe quality analyst with 20+ years of experience in recipe development and meal planning.
</role>

<task>
Perform a systematic, comprehensive quality audit of meal data using deep reasoning and culinary expertise.
</task>

<exploration>
- Analyze meal completeness using nutritional balance principles
- Cross-reference all text sources for ingredient consistency  
- Validate quantities against professional cooking standards
- Apply Instacart marketplace requirements for units
- Consider cultural and regional meal expectations
</exploration>

<meal_data>
Title: {TITLE}
Description: {DESCRIPTION}
Courses: {COURSES}
Cuisines: {CUISINES}
Primary Ingredient: {PRIMARY}
Current Ingredients: {INGREDIENTS}
Cooking Instructions: {INSTRUCTIONS}
Default Servings: {SERVINGS}
</meal_data>

<analysis_framework>
STEP 1: MEAL COMPLETENESS ANALYSIS
• Think step-by-step about nutritional balance
• Consider: Does this provide adequate nutrition for a complete meal?
• Evaluate components:
  - PROTEIN: Clear protein source present?
  - CARBOHYDRATES: Starch/grain/complex carbs included?
  - VEGETABLES: Fresh produce/fiber sources?
  - FATS: Healthy fats incorporated?
• Regional expectations: Asian meals expect rice, pasta dishes expect noodles, etc.
• Exception analysis: Is this intentionally minimal (toast, salad) or incomplete (just protein)?

STEP 2: INGREDIENT CROSS-VALIDATION
• Systematic text analysis approach:
  - Extract every food item mentioned in TITLE
  - Extract every food item mentioned in DESCRIPTION  
  - Extract every food item mentioned in INSTRUCTIONS
  - Compare against actual INGREDIENTS list
• Identify gaps with reasoning:
  - Why would this ingredient be expected?
  - Is it essential vs optional?
  - Would a home cook assume it's included?
• Consider implicit ingredients (oil for cooking, salt for seasoning)

STEP 3: QUANTITY & UNIT STANDARDS VALIDATION
• Apply professional cooking standards:
  - Proteins: 6-8 oz (0.375-0.5 lb) per person for meat/fish
  - Vegetables: 1/2 to 1 cup per person
  - Grains/pasta: 1/2 to 3/4 cup dry per person
  - Liquids: Context-dependent volumes
• Instacart unit compliance check against: {UNITS}
• Flag non-standard units: "pinch", "medium", "large", "stalk", "leaves"
• Calculate serving-appropriate quantities for {SERVINGS} people
</analysis_framework>

<output_requirements>
Provide detailed JSON analysis with your reasoning:

{
  "reasoning_process": {
    "meal_completeness_analysis": "Your step-by-step thinking about nutritional balance and completeness",
    "ingredient_validation_process": "How you cross-referenced title/description/instructions with ingredient list", 
    "quantity_analysis_approach": "Your evaluation of each ingredient's quantity and unit appropriateness"
  },
  "is_complete_meal": true/false,
  "completeness_issues": ["specific issue with reasoning"],
  "missing_ingredients": [
    {
      "name": "ingredient name",
      "reason": "detailed explanation of why this should be included",
      "source": "mentioned in title/description/instructions",
      "importance": "essential/recommended/optional"
    }
  ],
  "quantity_fixes": [
    {
      "ingredient": "current ingredient name", 
      "current_quantity": current_value,
      "current_unit": "current_unit",
      "fixed_quantity": recommended_value,
      "fixed_unit": "proper_unit",
      "reasoning": "detailed explanation of why this quantity/unit is more appropriate"
    }
  ],
  "overall_quality_score": 1-10,
  "critical_issues": ["high-priority problems that affect meal success"],
  "confidence_level": "high/medium/low"
}
</output_requirements>`;

const FIX_PROMPT = `<role>
You are a master chef and recipe developer with expertise in creating balanced, complete meals and extensive knowledge of ingredient scaling and professional cooking standards.
</role>

<task>
Generate a completely corrected and enhanced meal based on audit findings, using systematic reasoning to ensure nutritional balance, ingredient completeness, and proper quantities.
</task>

<current_situation>
MEAL DATA TO FIX:
{CURRENT_DATA}

AUDIT FINDINGS:
{AUDIT_RESULTS}
</current_situation>

<correction_framework>
STEP 1: MEAL COMPLETENESS ENHANCEMENT
• Analyze audit findings for completeness issues
• If meal lacks balance, systematically add:
  - Missing protein sources (maintain cuisine authenticity)
  - Starch/grain components (rice for Asian, pasta for Italian, etc.)
  - Vegetable components (seasonal, culturally appropriate)
  - Healthy fat sources (olive oil, nuts, avocado, etc.)
• Preserve original cuisine character and cooking methods
• Update title and description to reflect complete balanced meal

STEP 2: INGREDIENT INTEGRATION  
• Add every missing ingredient identified in audit
• Consider cooking method requirements:
  - Cooking oils for sautéing/frying
  - Aromatics (onion, garlic, ginger) if mentioned in instructions
  - Seasonings and spices for flavor development
• Ensure logical ingredient categories and proper shoppable names
• Maintain ingredient quality and authenticity

STEP 3: QUANTITY AND UNIT STANDARDIZATION
• Apply professional portion standards:
  - Proteins: 6-8 oz (0.375-0.5 lb) per person
  - Vegetables: 0.5-1 cup per person  
  - Grains/pasta: 0.5-0.75 cup dry per person
  - Cooking oils: 1-2 tbsp per dish
  - Seasonings: tsp/tbsp measurements
• Convert all units to Instacart standards: {UNITS}
• Scale all quantities for default servings
• Ensure realistic cooking proportions

STEP 4: INSTRUCTION ALIGNMENT
• Update cooking instructions to match new complete ingredient list
• Ensure timing reflects all preparation and cooking steps
• Verify prep_time + cook_time = time_total_min
• Add steps for newly included ingredients
</correction_framework>

<output_requirements>
Return ONLY complete meal data as valid JSON with ALL original fields plus corrections:

{
  "id": [preserve original],
  "slug": "updated-if-title-changed",
  "title": "Updated Complete Meal Title",
  "description": "Enhanced description reflecting complete balanced meal",
  "courses": [...],
  "cuisines": [...], 
  "diets_supported": [...],
  "primary_ingredient": "...",
  "spice_level": 1-5,
  "prep_time": minutes,
  "cook_time": minutes,
  "cooking_difficulty": "easy/medium/challenging",
  "time_total_min": prep_time + cook_time,
  "servings_default": number,
  "servings_min": number,
  "servings_max": number,
  "cost_per_serving": "$/$$/$$",
  "allergens_present": [...],
  "search_keywords": [...],
  "ingredients_json": {
    "servings": servings_default,
    "ingredients": [
      {
        "display_name": "descriptive recipe name",
        "shoppable_name": "Title Case Shopping Name", 
        "quantity": numeric_value,
        "unit": "instacart_standard_unit",
        "category": "proper_category",
        "scale_type": "linear/fixed/sqrt",
        "optional": false
      }
    ]
  },
  "instructions_json": {
    "prep_time": minutes,
    "cook_time": minutes, 
    "total_time": minutes,
    "steps": [
      {
        "step": number,
        "instruction": "clear step including new ingredients",
        "time_minutes": estimated_time
      }
    ]
  }
}

CRITICAL: Ensure all fixes from audit are implemented. Maintain cuisine authenticity while achieving nutritional completeness.
</output_requirements>`;

async function auditMeal(meal) {
  try {
    const prompt = AUDIT_PROMPT
      .replace('{TITLE}', meal.title)
      .replace('{DESCRIPTION}', meal.description || '')
      .replace('{COURSES}', JSON.stringify(meal.courses))
      .replace('{CUISINES}', JSON.stringify(meal.cuisines))
      .replace('{PRIMARY}', meal.primary_ingredient || '')
      .replace('{INGREDIENTS}', JSON.stringify(meal.ingredients_json))
      .replace('{INSTRUCTIONS}', JSON.stringify(meal.instructions_json))
      .replace('{SERVINGS}', meal.servings_default || 2)
      .replace('{UNITS}', JSON.stringify(INSTACART_UNITS));

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional chef and recipe quality auditor with deep culinary expertise. Think systematically and reason through each analysis step. Provide detailed explanations for your conclusions. Focus on practical meal preparation and nutritional completeness.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 3000
    });

    const content = response.choices[0].message.content;
    
    // Parse JSON from response
    let auditResult;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      auditResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.error(`❌ Failed to parse audit JSON for ${meal.title}:`, parseError.message);
      
      // Try to fix common JSON issues
      try {
        // Remove incomplete trailing content and try again
        let cleanedContent = content;
        const lastBrace = cleanedContent.lastIndexOf('}');
        if (lastBrace > 0) {
          cleanedContent = cleanedContent.substring(0, lastBrace + 1);
          auditResult = JSON.parse(cleanedContent);
          console.log(`   ✅ Recovered from JSON error`);
          return auditResult;
        }
      } catch (retryError) {
        // If recovery fails, skip this meal
        console.log('   ⚠️  Skipping meal due to JSON parsing issue');
        return null;
      }
      
      return null;
    }

    return auditResult;

  } catch (error) {
    console.error(`❌ Audit error for ${meal.title}:`, error.message);
    return null;
  }
}

async function fixMeal(meal, auditResult) {
  try {
    const prompt = FIX_PROMPT
      .replace('{CURRENT_DATA}', JSON.stringify(meal, null, 2))
      .replace('{AUDIT_RESULTS}', JSON.stringify(auditResult, null, 2))
      .replace('{UNITS}', JSON.stringify(INSTACART_UNITS));

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a master chef and recipe developer with expertise in creating balanced, complete meals. Use systematic reasoning to generate comprehensive meal data that addresses all identified issues. Ensure nutritional balance, cultural authenticity, and practical cooking requirements.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 5000
    });

    const content = response.choices[0].message.content;
    
    // Parse JSON from response
    let fixedMeal;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      fixedMeal = JSON.parse(jsonString);
    } catch (parseError) {
      console.error(`❌ Failed to parse fixed meal JSON for ${meal.title}`);
      return null;
    }

    // Preserve the original ID
    fixedMeal.id = meal.id;
    
    return fixedMeal;

  } catch (error) {
    console.error(`❌ Fix error for ${meal.title}:`, error.message);
    return null;
  }
}

async function saveMealUpdate(mealId, updates) {
  if (DRY_RUN) {
    console.log(`🔍 DRY RUN: Would update meal ${mealId}`);
    return true;
  }

  try {
    const { data, error } = await supabase
      .from('meals')
      .update(updates)
      .eq('id', mealId)
      .select()
      .single();

    if (error) throw error;
    return true;

  } catch (error) {
    console.error(`❌ Database update error:`, error.message);
    return false;
  }
}

async function saveAuditReport(report) {
  const reportDir = path.join(__dirname, 'meal-quality-reports');
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `audit-report-${timestamp}.json`;
  const filepath = path.join(reportDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`📊 Audit report saved: ${filename}`);
}

async function main() {
  console.log('🚀 Starting ChefsCart Meal Quality Audit & Fix');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE UPDATE'}`);
  if (LIMIT) console.log(`Limit: ${LIMIT} meals`);
  console.log('');

  // Fetch all meals
  let query = supabase
    .from('meals')
    .select('*')
    .order('id', { ascending: true });

  if (LIMIT) {
    query = query.limit(parseInt(LIMIT));
  }

  const { data: meals, error } = await query;

  if (error) {
    console.error('❌ Failed to fetch meals:', error.message);
    process.exit(1);
  }

  console.log(`📊 Found ${meals.length} meals to audit\n`);

  const report = {
    timestamp: new Date().toISOString(),
    mode: DRY_RUN ? 'dry_run' : 'live',
    total_meals: meals.length,
    issues_found: 0,
    incomplete_meals: [],
    missing_ingredients: [],
    quantity_issues: [],
    fixed_meals: [],
    failed_fixes: [],
    statistics: {
      incomplete_meal_count: 0,
      meals_with_missing_ingredients: 0,
      meals_with_quantity_issues: 0,
      total_missing_ingredients: 0,
      total_quantity_fixes: 0
    }
  };

  // Process meals in batches
  for (let i = 0; i < meals.length; i += BATCH_SIZE) {
    const batch = meals.slice(i, Math.min(i + BATCH_SIZE, meals.length));
    console.log(`\n📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1} (meals ${i+1}-${Math.min(i+BATCH_SIZE, meals.length)})`);

    for (const meal of batch) {
      console.log(`\n🍽️  Auditing: ${meal.title}`);
      
      // Perform audit
      const auditResult = await auditMeal(meal);
      
      if (!auditResult) {
        console.log(`⚠️  Skipping ${meal.title} - audit failed`);
        report.failed_fixes.push(meal.title);
        continue;
      }

      // Check if issues were found
      const hasIssues = !auditResult.is_complete_meal || 
                       auditResult.missing_ingredients?.length > 0 || 
                       auditResult.quantity_fixes?.length > 0;

      if (!hasIssues) {
        console.log(`✅ No issues found`);
        continue;
      }

      // Log issues found
      report.issues_found++;
      
      if (!auditResult.is_complete_meal) {
        console.log(`   ❌ Incomplete meal: ${auditResult.completeness_issues.join(', ')}`);
        report.incomplete_meals.push({
          meal: meal.title,
          issues: auditResult.completeness_issues
        });
        report.statistics.incomplete_meal_count++;
      }

      if (auditResult.missing_ingredients?.length > 0) {
        console.log(`   ❌ Missing ingredients: ${auditResult.missing_ingredients.map(i => i.name).join(', ')}`);
        report.missing_ingredients.push({
          meal: meal.title,
          missing: auditResult.missing_ingredients
        });
        report.statistics.meals_with_missing_ingredients++;
        report.statistics.total_missing_ingredients += auditResult.missing_ingredients.length;
      }

      if (auditResult.quantity_fixes?.length > 0) {
        console.log(`   ❌ Quantity issues: ${auditResult.quantity_fixes.length} fixes needed`);
        report.quantity_issues.push({
          meal: meal.title,
          fixes: auditResult.quantity_fixes
        });
        report.statistics.meals_with_quantity_issues++;
        report.statistics.total_quantity_fixes += auditResult.quantity_fixes.length;
      }

      // Fix the meal
      console.log(`   🔧 Generating fixed version...`);
      const fixedMeal = await fixMeal(meal, auditResult);
      
      if (!fixedMeal) {
        console.log(`   ⚠️  Failed to generate fix`);
        report.failed_fixes.push(meal.title);
        continue;
      }

      // Save the fix
      const saved = await saveMealUpdate(meal.id, fixedMeal);
      
      if (saved) {
        console.log(`   ✅ Fixed and ${DRY_RUN ? 'would be saved' : 'saved'}`);
        report.fixed_meals.push({
          meal: meal.title,
          audit: auditResult,
          fixed: DRY_RUN ? 'would_update' : 'updated'
        });
      } else {
        console.log(`   ❌ Failed to save fix`);
        report.failed_fixes.push(meal.title);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Generate summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 AUDIT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total meals audited: ${report.total_meals}`);
  console.log(`Issues found: ${report.issues_found}`);
  console.log(`Incomplete meals: ${report.statistics.incomplete_meal_count}`);
  console.log(`Meals with missing ingredients: ${report.statistics.meals_with_missing_ingredients}`);
  console.log(`Meals with quantity issues: ${report.statistics.meals_with_quantity_issues}`);
  console.log(`Total missing ingredients: ${report.statistics.total_missing_ingredients}`);
  console.log(`Total quantity fixes: ${report.statistics.total_quantity_fixes}`);
  console.log(`Successfully fixed: ${report.fixed_meals.length}`);
  console.log(`Failed to fix: ${report.failed_fixes.length}`);

  // Save detailed report
  await saveAuditReport(report);

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN COMPLETE - No changes were made to the database');
    console.log('To apply fixes, run without --dry-run flag');
  } else {
    console.log('\n✅ All fixes have been applied to the database');
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { auditMeal, fixMeal };