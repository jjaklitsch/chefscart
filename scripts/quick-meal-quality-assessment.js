#!/usr/bin/env node

/**
 * Quick Meal Quality Assessment
 * Performs rule-based analysis to identify obvious issues without GPT calls
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Rule-based checks
function assessMealCompleteness(meal) {
  const issues = [];
  const ingredients = meal.ingredients_json?.ingredients || [];
  const ingredientNames = ingredients.map(i => (i.display_name || i.shoppable_name || '').toLowerCase());
  const categories = [...new Set(ingredients.map(i => i.category))];
  
  // Check for complete meal components
  const hasProtein = categories.includes('Meat & Poultry') || 
                    categories.includes('Seafood') || 
                    meal.primary_ingredient === 'tofu' ||
                    ingredientNames.some(name => name.includes('chicken') || name.includes('beef') || name.includes('pork') || name.includes('fish') || name.includes('tofu'));
  
  const hasStarch = categories.includes('Rice & Grains') || 
                   categories.includes('Pasta') || 
                   ingredientNames.some(name => name.includes('rice') || name.includes('pasta') || name.includes('bread') || name.includes('potato'));
  
  const hasVegetables = categories.includes('Produce') || 
                       ingredientNames.some(name => name.includes('vegetable') || name.includes('lettuce') || name.includes('spinach'));

  // Complete meal assessment
  if (ingredients.length < 4) {
    issues.push('Very few ingredients - may be incomplete');
  }
  
  if (hasProtein && !hasStarch && !hasVegetables && ingredients.length < 8) {
    issues.push('Appears to be just protein without sides');
  }

  return {
    isIncomplete: issues.length > 0,
    issues,
    hasProtein,
    hasStarch, 
    hasVegetables,
    ingredientCount: ingredients.length
  };
}

function checkMissingIngredients(meal) {
  const missing = [];
  const title = meal.title.toLowerCase();
  const description = (meal.description || '').toLowerCase();
  const ingredients = meal.ingredients_json?.ingredients || [];
  const ingredientNames = ingredients.map(i => (i.display_name || i.shoppable_name || '').toLowerCase());

  // Common missing ingredient patterns
  if ((title.includes('salad') || description.includes('salad')) && 
      !ingredientNames.some(name => name.includes('lettuce') || name.includes('greens') || name.includes('spinach') || name.includes('arugula') || name.includes('kale'))) {
    missing.push('lettuce/greens for salad');
  }

  if ((title.includes('pasta') || description.includes('pasta')) && 
      !ingredientNames.some(name => name.includes('pasta') || name.includes('spaghetti') || name.includes('penne') || name.includes('noodle'))) {
    missing.push('pasta noodles');
  }

  if ((title.includes('rice') || description.includes('rice')) && 
      !ingredientNames.some(name => name.includes('rice'))) {
    missing.push('rice');
  }

  if ((title.includes('taco') || title.includes('wrap') || description.includes('tortilla')) && 
      !ingredientNames.some(name => name.includes('tortilla') || name.includes('wrap'))) {
    missing.push('tortillas/wraps');
  }

  if ((title.includes('sandwich') || title.includes('toast') || description.includes('bread')) && 
      !ingredientNames.some(name => name.includes('bread') || name.includes('bun') || name.includes('roll'))) {
    missing.push('bread/buns');
  }

  return missing;
}

function checkQuantityIssues(meal) {
  const issues = [];
  const ingredients = meal.ingredients_json?.ingredients || [];
  const servings = meal.servings_default || 2;

  ingredients.forEach(ingredient => {
    const name = (ingredient.display_name || ingredient.shoppable_name || '').toLowerCase();
    const quantity = ingredient.quantity || 0;
    const unit = (ingredient.unit || '').toLowerCase();

    // Check protein quantities
    if (name.includes('chicken') || name.includes('beef') || name.includes('pork') || 
        name.includes('salmon') || name.includes('fish') || name.includes('shrimp')) {
      
      if (unit === 'each' || unit === 'count') {
        issues.push({
          ingredient: ingredient.display_name || ingredient.shoppable_name,
          issue: 'Protein measured as "each" instead of weight',
          suggestion: `Should be ~${servings * 0.5} lb`
        });
      }
      
      if (unit === 'oz' && quantity < servings * 8) {
        issues.push({
          ingredient: ingredient.display_name || ingredient.shoppable_name,
          issue: 'Protein quantity too small',
          suggestion: `Should be ~${servings * 8} oz or ${servings * 0.5} lb`
        });
      }
    }

    // Check for invalid units
    const validUnits = ['cup', 'cups', 'tbsp', 'tsp', 'lb', 'oz', 'each', 'count', 'bunch', 'head', 'can', 'package', 'clove', 'slice', 'g', 'kg', 'ml', 'l'];
    if (!validUnits.includes(unit)) {
      issues.push({
        ingredient: ingredient.display_name || ingredient.shoppable_name,
        issue: `Invalid unit: "${unit}"`,
        suggestion: 'Use standard Instacart units'
      });
    }
  });

  return issues;
}

async function quickAssessment() {
  console.log('⚡ QUICK MEAL QUALITY ASSESSMENT');
  console.log('='.repeat(50));
  console.log('Rule-based analysis to identify obvious issues\n');

  // Fetch all meals
  const { data: meals, error } = await supabase
    .from('meals')
    .select('*')
    .order('id', { ascending: true })
    .limit(100); // Assess first 100 meals

  if (error) {
    console.error('❌ Failed to fetch meals:', error.message);
    return;
  }

  console.log(`📊 Analyzing ${meals.length} meals...\n`);

  const summary = {
    totalMeals: meals.length,
    incompleteMeals: [],
    missingIngredientIssues: [],
    quantityIssues: [],
    totalIssues: 0
  };

  meals.forEach((meal, index) => {
    const completeness = assessMealCompleteness(meal);
    const missingIngredients = checkMissingIngredients(meal);
    const quantityIssues = checkQuantityIssues(meal);

    const hasIssues = completeness.isIncomplete || missingIngredients.length > 0 || quantityIssues.length > 0;

    if (hasIssues) {
      console.log(`\n${index + 1}. 🍽️  ${meal.title}`);
      
      if (completeness.isIncomplete) {
        console.log(`   ❌ INCOMPLETE: ${completeness.issues.join(', ')}`);
        console.log(`      Components: ${completeness.hasProtein ? '✓' : '✗'} Protein, ${completeness.hasStarch ? '✓' : '✗'} Starch, ${completeness.hasVegetables ? '✓' : '✗'} Vegetables`);
        summary.incompleteMeals.push({
          title: meal.title,
          issues: completeness.issues,
          components: { protein: completeness.hasProtein, starch: completeness.hasStarch, vegetables: completeness.hasVegetables }
        });
      }

      if (missingIngredients.length > 0) {
        console.log(`   ❌ MISSING: ${missingIngredients.join(', ')}`);
        summary.missingIngredientIssues.push({
          title: meal.title,
          missing: missingIngredients
        });
      }

      if (quantityIssues.length > 0) {
        console.log(`   ❌ QUANTITIES:`);
        quantityIssues.forEach(issue => {
          console.log(`      - ${issue.ingredient}: ${issue.issue} (${issue.suggestion})`);
        });
        summary.quantityIssues.push({
          title: meal.title,
          issues: quantityIssues
        });
      }

      summary.totalIssues++;
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total meals analyzed: ${summary.totalMeals}`);
  console.log(`Meals with issues: ${summary.totalIssues}`);
  console.log(`Incomplete meals: ${summary.incompleteMeals.length}`);
  console.log(`Missing ingredient issues: ${summary.missingIngredientIssues.length}`);
  console.log(`Quantity issues: ${summary.quantityIssues.length}`);

  // Save detailed report
  const reportDir = path.join(__dirname, 'meal-quality-reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `quick-assessment-${timestamp}.json`;
  const filepath = path.join(reportDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(summary, null, 2));
  console.log(`\n📄 Detailed report saved: ${filename}`);

  if (summary.totalIssues > 0) {
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Review the detailed issues above');
    console.log('2. Run the full GPT-powered fix: node scripts/audit-and-fix-meal-quality.js --dry-run');
    console.log('3. Apply fixes: node scripts/audit-and-fix-meal-quality.js');
  } else {
    console.log('\n✅ No obvious issues found in this batch!');
  }
}

if (require.main === module) {
  quickAssessment().catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
  });
}