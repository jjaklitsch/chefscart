#!/usr/bin/env node

/**
 * Ingredient & Cooking Instructions Schema Analysis
 * Analyzes current ingredient structure and determines optimal 
 * approach for scalable recipe quantities vs Instacart quantities
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

// Initialize clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function analyzeMealIngredients(meal) {
  const systemPrompt = `You are a culinary expert analyzing meal ingredients and cooking instructions to determine if the current quantities are appropriate for both cooking and shopping.

ANALYSIS REQUIREMENTS:
1. Review ingredient quantities vs cooking instructions for consistency
2. Identify if quantities work for both recipe measurements and Instacart purchasing
3. Determine if cooking instructions need specific ingredient amounts
4. Assess if ingredients need both "cooking quantities" and "shopping quantities"
5. Check for missing ingredients referenced in cooking steps

COOKING VS SHOPPING QUANTITIES:
- Shopping quantities: What you need to buy (e.g., "1 package butter" = 1 pound)
- Cooking quantities: What you actually use (e.g., "2 tablespoons butter")
- Some ingredients: use all purchased (e.g., 1.5 pounds fish = use all 1.5 pounds)
- Other ingredients: use partial (e.g., buy 1 pound flour, use 1/2 cup)

Return detailed analysis about ingredient quantity accuracy and cooking instruction completeness.`;

  const userPrompt = `Analyze this meal's ingredients and cooking instructions:

MEAL: "${meal.title}"
SERVINGS: Default ${meal.servings_default} (${meal.servings_min}-${meal.servings_max})

INGREDIENTS:
${meal.ingredients_json.map(ing => `- ${ing.name}: ${ing.quantity} ${ing.unit} (${ing.category})`).join('\n')}

COOKING INSTRUCTIONS:
${meal.instructions_json.steps.map(step => `${step.step}. ${step.instruction} (${step.time_minutes}min)`).join('\n')}

Analyze and return JSON:
{
  "ingredient_quantity_issues": ["specific issues with quantities"],
  "missing_cooking_details": ["ingredients mentioned in steps but missing specific amounts"],
  "shopping_vs_cooking_mismatch": ["ingredients where shopping quantity ≠ cooking usage"],
  "scalability_concerns": ["issues with scaling quantities up/down"],
  "recommendations": {
    "separate_quantities_needed": boolean,
    "cooking_instruction_improvements": ["specific improvements needed"],
    "ingredient_schema_changes": ["suggested schema modifications"]
  },
  "overall_assessment": "brief assessment of current structure"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    });

    const analysis = JSON.parse(completion.choices[0].message.content);
    
    return {
      mealId: meal.id,
      title: meal.title,
      servings: `${meal.servings_default} (${meal.servings_min}-${meal.servings_max})`,
      analysis
    };

  } catch (error) {
    console.error(`❌ Error analyzing meal ${meal.id}:`, error.message);
    return {
      mealId: meal.id,
      title: meal.title,
      error: error.message
    };
  }
}

async function analyzeSampleMeals(limit = 10) {
  console.log('📊 Fetching sample meals for ingredients analysis...');
  
  const { data, error } = await supabase
    .from('meals')
    .select('id, title, servings_default, servings_min, servings_max, ingredients_json, instructions_json')
    .limit(limit);
    
  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }
  
  console.log(`✅ Loaded ${data.length} sample meals for analysis\n`);

  const analyses = [];
  
  for (const meal of data) {
    console.log(`🔍 Analyzing meal ${meal.id}: "${meal.title}"`);
    
    const analysis = await analyzeMealIngredients(meal);
    analyses.push(analysis);
    
    if (analysis.analysis) {
      console.log(`\n📝 ANALYSIS RESULTS:`);
      console.log(`├─ Quantity Issues: ${analysis.analysis.ingredient_quantity_issues?.length || 0}`);
      console.log(`├─ Missing Details: ${analysis.analysis.missing_cooking_details?.length || 0}`);
      console.log(`├─ Shop vs Cook Mismatch: ${analysis.analysis.shopping_vs_cooking_mismatch?.length || 0}`);
      console.log(`└─ Needs Separate Quantities: ${analysis.analysis.recommendations?.separate_quantities_needed ? 'YES' : 'NO'}`);
      
      if (analysis.analysis.ingredient_quantity_issues?.length > 0) {
        console.log(`\n🔴 ISSUES FOUND:`);
        analysis.analysis.ingredient_quantity_issues.forEach(issue => 
          console.log(`   • ${issue}`)
        );
      }
      
      if (analysis.analysis.recommendations?.cooking_instruction_improvements?.length > 0) {
        console.log(`\n💡 COOKING IMPROVEMENTS NEEDED:`);
        analysis.analysis.recommendations.cooking_instruction_improvements.forEach(imp => 
          console.log(`   • ${imp}`)
        );
      }
    }
    
    console.log('\n' + '-'.repeat(50) + '\n');
    
    // Brief pause
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return analyses;
}

function generateGamePlan(analyses) {
  const issues = {
    quantityIssues: 0,
    missingDetails: 0,
    shopVsCookMismatch: 0,
    needsSeparateQuantities: 0
  };

  analyses.forEach(analysis => {
    if (!analysis.analysis) return;
    
    issues.quantityIssues += analysis.analysis.ingredient_quantity_issues?.length || 0;
    issues.missingDetails += analysis.analysis.missing_cooking_details?.length || 0;
    issues.shopVsCookMismatch += analysis.analysis.shopping_vs_cooking_mismatch?.length || 0;
    
    if (analysis.analysis.recommendations?.separate_quantities_needed) {
      issues.needsSeparateQuantities++;
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('📊 INGREDIENT SCHEMA ANALYSIS SUMMARY');
  console.log('='.repeat(60));
  console.log(`🔍 Meals analyzed: ${analyses.length}`);
  console.log(`🔴 Total quantity issues: ${issues.quantityIssues}`);
  console.log(`❓ Missing cooking details: ${issues.missingDetails}`);
  console.log(`🛒 Shop vs Cook mismatches: ${issues.shopVsCookMismatch}`);
  console.log(`📏 Need separate quantities: ${issues.needsSeparateQuantities}/${analyses.length} meals`);
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 RECOMMENDED GAME PLAN');
  console.log('='.repeat(60));

  if (issues.needsSeparateQuantities > analyses.length / 2) {
    console.log('📋 RECOMMENDATION: Implement dual-quantity system');
    console.log('   • Add cooking_quantity field to ingredients');
    console.log('   • Keep current quantity for Instacart purchases');
    console.log('   • Update cooking instructions with specific amounts');
  } else {
    console.log('📋 RECOMMENDATION: Improve current single-quantity system');
    console.log('   • Fix quantity calculation errors');
    console.log('   • Add missing ingredient details to instructions');
  }

  console.log('\n🔧 IMPLEMENTATION STEPS:');
  console.log('1. Create ingredient schema update script');
  console.log('2. Add cooking quantities to existing ingredients');
  console.log('3. Update cooking instructions with specific amounts');
  console.log('4. Implement frontend scaling logic');
  console.log('5. Test scaling with different serving sizes');

  return issues;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 10;

  console.log('🍳 ChefsCart Ingredient & Cooking Schema Analysis');
  console.log('   Using GPT-5-mini with reasoning capabilities for detailed ingredient analysis');
  console.log('');
  console.log(`📊 Analyzing ${limit} sample meals\n`);

  try {
    const analyses = await analyzeSampleMeals(limit);
    const gameplan = generateGamePlan(analyses);
    
    console.log('\n🎉 Analysis completed successfully!');
    return gameplan;
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}