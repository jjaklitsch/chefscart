#!/usr/bin/env node

/**
 * Database Field Reassessment Script
 * Comprehensive analysis of all meal database fields after quality migration
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

async function generateComprehensiveReport() {
  console.log('📊 COMPREHENSIVE DATABASE FIELD ASSESSMENT');
  console.log('='.repeat(60));
  console.log('Post-migration analysis of all meal data fields\n');

  // Fetch all meals
  const { data: meals, error } = await supabase
    .from('meals')
    .select('*')
    .order('title', { ascending: true });

  if (error) {
    console.error('❌ Failed to fetch meals:', error.message);
    return;
  }

  console.log(`📈 Analyzing ${meals.length} meals...\n`);

  // Initialize comprehensive analysis
  const analysis = {
    timestamp: new Date().toISOString(),
    total_meals: meals.length,
    field_analysis: {},
    quality_metrics: {
      complete_meals: 0,
      avg_ingredients_per_meal: 0,
      protein_distribution: {},
      cuisine_distribution: {},
      course_distribution: {},
      diet_distribution: {},
      difficulty_distribution: {},
      spice_level_distribution: {},
      cost_distribution: {},
      allergen_distribution: {},
      cooking_time_stats: {},
      ingredient_category_stats: {},
      unit_compliance: { valid: 0, invalid: 0 },
      portion_size_analysis: {}
    },
    data_quality_issues: {
      missing_fields: [],
      invalid_values: [],
      inconsistencies: []
    }
  };

  // Valid Instacart units for validation
  const validUnits = new Set([
    'cup', 'cups', 'c', 'tbsp', 'tsp', 'lb', 'oz', 'each', 'count', 'bunch', 'head', 
    'can', 'package', 'clove', 'slice', 'g', 'kg', 'ml', 'l', 'fl oz', 'gal', 'pt', 'qt'
  ]);

  // Analyze each meal
  let totalIngredients = 0;
  const cookingTimes = [];
  const ingredientCounts = [];

  meals.forEach((meal, index) => {
    // Completeness check
    const ingredients = meal.ingredients_json?.ingredients || [];
    const hasProtein = ingredients.some(ing => 
      ing.category === 'Meat & Poultry' || ing.category === 'Seafood' || 
      meal.primary_ingredient === 'tofu'
    );
    const hasStarch = ingredients.some(ing => 
      ing.category === 'Rice & Grains' || ing.category === 'Pasta'
    );
    const hasVegetables = ingredients.some(ing => ing.category === 'Produce');
    
    if (hasProtein && (hasStarch || hasVegetables) && ingredients.length >= 5) {
      analysis.quality_metrics.complete_meals++;
    }

    // Ingredient analysis
    totalIngredients += ingredients.length;
    ingredientCounts.push(ingredients.length);
    
    ingredients.forEach(ing => {
      // Unit compliance
      if (validUnits.has(ing.unit?.toLowerCase())) {
        analysis.quality_metrics.unit_compliance.valid++;
      } else {
        analysis.quality_metrics.unit_compliance.invalid++;
      }

      // Category distribution
      const category = ing.category || 'Uncategorized';
      analysis.quality_metrics.ingredient_category_stats[category] = 
        (analysis.quality_metrics.ingredient_category_stats[category] || 0) + 1;
    });

    // Distribution analysis
    if (meal.primary_ingredient) {
      analysis.quality_metrics.protein_distribution[meal.primary_ingredient] = 
        (analysis.quality_metrics.protein_distribution[meal.primary_ingredient] || 0) + 1;
    }

    meal.cuisines?.forEach(cuisine => {
      analysis.quality_metrics.cuisine_distribution[cuisine] = 
        (analysis.quality_metrics.cuisine_distribution[cuisine] || 0) + 1;
    });

    meal.courses?.forEach(course => {
      analysis.quality_metrics.course_distribution[course] = 
        (analysis.quality_metrics.course_distribution[course] || 0) + 1;
    });

    meal.diets_supported?.forEach(diet => {
      analysis.quality_metrics.diet_distribution[diet] = 
        (analysis.quality_metrics.diet_distribution[diet] || 0) + 1;
    });

    if (meal.cooking_difficulty) {
      analysis.quality_metrics.difficulty_distribution[meal.cooking_difficulty] = 
        (analysis.quality_metrics.difficulty_distribution[meal.cooking_difficulty] || 0) + 1;
    }

    if (meal.spice_level) {
      analysis.quality_metrics.spice_level_distribution[meal.spice_level] = 
        (analysis.quality_metrics.spice_level_distribution[meal.spice_level] || 0) + 1;
    }

    if (meal.cost_per_serving) {
      analysis.quality_metrics.cost_distribution[meal.cost_per_serving] = 
        (analysis.quality_metrics.cost_distribution[meal.cost_per_serving] || 0) + 1;
    }

    meal.allergens_present?.forEach(allergen => {
      analysis.quality_metrics.allergen_distribution[allergen] = 
        (analysis.quality_metrics.allergen_distribution[allergen] || 0) + 1;
    });

    // Cooking time analysis
    if (meal.time_total_min) {
      cookingTimes.push(meal.time_total_min);
    }

    // Field completeness validation
    const requiredFields = [
      'title', 'description', 'courses', 'cuisines', 'primary_ingredient',
      'prep_time', 'cook_time', 'time_total_min', 'cooking_difficulty',
      'servings_default', 'ingredients_json', 'instructions_json'
    ];

    requiredFields.forEach(field => {
      if (!meal[field] || (Array.isArray(meal[field]) && meal[field].length === 0)) {
        analysis.data_quality_issues.missing_fields.push({
          meal: meal.title,
          field: field
        });
      }
    });

    // Time consistency validation
    if (meal.prep_time && meal.cook_time && meal.time_total_min) {
      if (meal.prep_time + meal.cook_time !== meal.time_total_min) {
        analysis.data_quality_issues.inconsistencies.push({
          meal: meal.title,
          issue: 'prep_time + cook_time ≠ time_total_min',
          values: `${meal.prep_time} + ${meal.cook_time} ≠ ${meal.time_total_min}`
        });
      }
    }
  });

  // Calculate statistics
  analysis.quality_metrics.avg_ingredients_per_meal = totalIngredients / meals.length;
  
  if (cookingTimes.length > 0) {
    analysis.quality_metrics.cooking_time_stats = {
      min: Math.min(...cookingTimes),
      max: Math.max(...cookingTimes),
      average: cookingTimes.reduce((a, b) => a + b, 0) / cookingTimes.length,
      median: cookingTimes.sort((a, b) => a - b)[Math.floor(cookingTimes.length / 2)]
    };
  }

  // Sort distributions for better readability
  const sortByCount = (obj) => 
    Object.entries(obj).sort(([,a], [,b]) => b - a).reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

  analysis.quality_metrics.protein_distribution = sortByCount(analysis.quality_metrics.protein_distribution);
  analysis.quality_metrics.cuisine_distribution = sortByCount(analysis.quality_metrics.cuisine_distribution);
  analysis.quality_metrics.ingredient_category_stats = sortByCount(analysis.quality_metrics.ingredient_category_stats);

  // Generate report
  console.log('🎯 QUALITY METRICS SUMMARY');
  console.log('='.repeat(40));
  console.log(`Total meals: ${analysis.total_meals}`);
  console.log(`Complete meals: ${analysis.quality_metrics.complete_meals} (${((analysis.quality_metrics.complete_meals/analysis.total_meals)*100).toFixed(1)}%)`);
  console.log(`Avg ingredients per meal: ${analysis.quality_metrics.avg_ingredients_per_meal.toFixed(1)}`);
  console.log(`Unit compliance: ${analysis.quality_metrics.unit_compliance.valid}/${analysis.quality_metrics.unit_compliance.valid + analysis.quality_metrics.unit_compliance.invalid} (${((analysis.quality_metrics.unit_compliance.valid/(analysis.quality_metrics.unit_compliance.valid + analysis.quality_metrics.unit_compliance.invalid))*100).toFixed(1)}%)`);

  if (analysis.quality_metrics.cooking_time_stats.average) {
    console.log(`\n⏱️  COOKING TIME ANALYSIS`);
    console.log(`Average: ${analysis.quality_metrics.cooking_time_stats.average.toFixed(0)} min`);
    console.log(`Range: ${analysis.quality_metrics.cooking_time_stats.min}-${analysis.quality_metrics.cooking_time_stats.max} min`);
    console.log(`Median: ${analysis.quality_metrics.cooking_time_stats.median} min`);
  }

  console.log(`\n🥘 TOP PROTEIN SOURCES`);
  Object.entries(analysis.quality_metrics.protein_distribution).slice(0, 10).forEach(([protein, count]) => {
    console.log(`${protein}: ${count} meals`);
  });

  console.log(`\n🌍 TOP CUISINES`);
  Object.entries(analysis.quality_metrics.cuisine_distribution).slice(0, 10).forEach(([cuisine, count]) => {
    console.log(`${cuisine}: ${count} meals`);
  });

  console.log(`\n📊 DIFFICULTY DISTRIBUTION`);
  Object.entries(analysis.quality_metrics.difficulty_distribution).forEach(([difficulty, count]) => {
    console.log(`${difficulty}: ${count} meals (${((count/analysis.total_meals)*100).toFixed(1)}%)`);
  });

  if (analysis.data_quality_issues.missing_fields.length > 0) {
    console.log(`\n⚠️  DATA QUALITY ISSUES`);
    console.log(`Missing fields: ${analysis.data_quality_issues.missing_fields.length}`);
    console.log(`Inconsistencies: ${analysis.data_quality_issues.inconsistencies.length}`);
  }

  // Save comprehensive report
  const reportDir = path.join(__dirname, 'meal-quality-reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `comprehensive-assessment-${timestamp}.json`;
  const filepath = path.join(reportDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(analysis, null, 2));
  console.log(`\n📋 Comprehensive report saved: ${filename}`);
  console.log(`\n✅ Database assessment complete!`);

  return analysis;
}

if (require.main === module) {
  generateComprehensiveReport().catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
  });
}

module.exports = { generateComprehensiveReport };