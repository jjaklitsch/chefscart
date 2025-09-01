#!/usr/bin/env node

/**
 * Detailed meal review with human-like judgment
 * Reviews meal names and descriptions to identify truly problematic meals
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function detailedMealReview(meal) {
  const title = meal.title.toLowerCase();
  const description = (meal.description || '').toLowerCase();
  const ingredients = meal.ingredients_json?.ingredients || [];
  
  // Extract ingredient names
  const ingredientNames = ingredients.map(ing => 
    (ing.name || ing.display_name || ing.shoppable_name || '').toLowerCase()
  ).filter(name => name && name !== 'undefined');

  // More sophisticated protein detection
  const proteinSources = [
    // Meats
    'chicken', 'beef', 'pork', 'lamb', 'duck', 'turkey', 'sausage', 'bacon', 'ham',
    // Seafood  
    'fish', 'salmon', 'cod', 'tuna', 'shrimp', 'prawns', 'crab', 'lobster', 'scallops', 'mussels', 'sardines', 'mackerel', 'trout',
    // Vegetarian proteins
    'tofu', 'tempeh', 'seitan', 'eggs', 'cheese', 'paneer', 'feta', 'mozzarella', 'ricotta', 'goat cheese',
    // Legumes
    'beans', 'chickpeas', 'lentils', 'peas', 'hummus'
  ];

  const carbSources = [
    'rice', 'pasta', 'noodles', 'bread', 'toast', 'tortilla', 'wrap', 'pizza', 'pita',
    'potato', 'quinoa', 'couscous', 'bulgur', 'barley', 'farro', 'gnocchi', 'dumplings'
  ];

  const hasProtein = proteinSources.some(p => 
    title.includes(p) || description.includes(p) || ingredientNames.some(ing => ing.includes(p))
  );

  const hasCarbs = carbSources.some(c => 
    title.includes(c) || description.includes(c) || ingredientNames.some(ing => ing.includes(c))
  );

  // Analyze meal completeness with context
  let issues = [];
  let verdict = 'KEEP';
  let rationale = 'Complete meal with protein, carbs, and/or vegetables';

  // Special cases that are acceptable despite appearing incomplete
  const acceptableExceptions = [
    // Soups and stews (complete on their own)
    { pattern: ['soup', 'stew', 'chili', 'bisque', 'chowder'], reason: 'Soups/stews are traditionally complete meals' },
    // Salads with substantial additions
    { pattern: ['salad'], hasProtein: true, reason: 'Protein salads are complete meals' },
    // Pizza (complete food)
    { pattern: ['pizza'], reason: 'Pizza is traditionally a complete meal' },
    // Breakfast items
    { pattern: ['pancakes', 'waffles', 'french toast', 'omelette', 'scramble', 'parfait'], reason: 'Traditional breakfast foods are complete' },
    // Sandwiches and wraps
    { pattern: ['sandwich', 'wrap', 'burger', 'sub'], reason: 'Sandwiches are complete handheld meals' },
    // Traditional complete dishes
    { pattern: ['curry', 'biryani', 'paella', 'risotto', 'casserole'], reason: 'Traditional complete dishes' }
  ];

  // Check if meal fits acceptable exceptions
  let isException = false;
  let exceptionReason = '';
  
  for (const exception of acceptableExceptions) {
    if (exception.pattern.some(p => title.includes(p) || description.includes(p))) {
      if (!exception.hasProtein || hasProtein) {
        isException = true;
        exceptionReason = exception.reason;
        break;
      }
    }
  }

  // Now apply judgment
  if (isException) {
    verdict = 'KEEP';
    rationale = exceptionReason;
  } else if (!hasProtein) {
    // Missing protein is usually problematic
    if (title.includes('salad') || title.includes('vegetable') || title.includes('greens')) {
      verdict = 'FLAG';
      rationale = 'Vegetable/salad dish without substantial protein - customers may find it incomplete';
      issues.push('No substantial protein');
    } else {
      verdict = 'FLAG';
      rationale = 'No identifiable protein source - may disappoint customers expecting a complete meal';
      issues.push('No substantial protein');
    }
  } else if (hasProtein && !hasCarbs) {
    // Protein without carbs - check context
    if (ingredients.length < 5) {
      verdict = 'FLAG';
      rationale = 'Appears to be mainly just protein with minimal sides - customers may expect more complete meal';
      issues.push('Protein-only dish, minimal sides');
    } else {
      verdict = 'KEEP';
      rationale = 'Protein with vegetables/sides - adequate for some diets (keto, low-carb)';
    }
  }

  // Additional context-based analysis
  if (title.includes('bowl') && hasProtein) {
    verdict = 'KEEP';
    rationale = 'Bowl meals are typically substantial and complete';
  }

  if (title.includes('with') && hasProtein) {
    verdict = 'KEEP';
    rationale = 'Includes protein and accompaniments as indicated by "with"';
  }

  return {
    title: meal.title,
    description: meal.description || '',
    verdict,
    rationale,
    issues: issues.join('; ') || 'None',
    has_protein: hasProtein,
    has_carbs: hasCarbs,
    ingredient_count: ingredients.length,
    protein_sources: proteinSources.filter(p => 
      title.includes(p) || description.includes(p) || ingredientNames.some(ing => ing.includes(p))
    ).join(', ') || 'None detected',
    carb_sources: carbSources.filter(c => 
      title.includes(c) || description.includes(c) || ingredientNames.some(ing => ing.includes(c))
    ).join(', ') || 'None detected'
  };
}

async function main() {
  console.log('🔍 Detailed ChefsCart Meal Review');
  console.log('=================================\n');
  
  // Fetch all meals
  console.log('📊 Fetching meals from database...');
  const { data: meals, error } = await supabase
    .from('meals')
    .select('id, title, description, ingredients_json')
    .order('title');
  
  if (error) {
    console.error('❌ Database error:', error.message);
    return;
  }
  
  console.log(`✅ Reviewing ${meals.length} meals...\n`);
  
  // Analyze all meals
  const results = meals.map(detailedMealReview);
  
  // Filter flagged meals
  const flaggedMeals = results.filter(r => r.verdict === 'FLAG');
  const keptMeals = results.filter(r => r.verdict === 'KEEP');
  
  console.log(`📈 REVIEW RESULTS:`);
  console.log(`✅ Keep: ${keptMeals.length} meals (${((keptMeals.length/results.length)*100).toFixed(1)}%)`);
  console.log(`🚨 Flag for review: ${flaggedMeals.length} meals (${((flaggedMeals.length/results.length)*100).toFixed(1)}%)`);
  
  // Create CSV content
  const csvHeaders = [
    'Meal Title',
    'Description', 
    'Verdict',
    'Rationale',
    'Issues',
    'Has Protein',
    'Has Carbs',
    'Ingredient Count',
    'Protein Sources',
    'Carb Sources'
  ];
  
  const csvRows = [csvHeaders.join(',')];
  
  // Add flagged meals to CSV (sorted by severity)
  flaggedMeals
    .sort((a, b) => a.ingredient_count - b.ingredient_count) // Least ingredients first (likely most problematic)
    .forEach(meal => {
      const row = [
        `"${meal.title}"`,
        `"${meal.description.replace(/"/g, '""')}"`,
        meal.verdict,
        `"${meal.rationale}"`,
        `"${meal.issues}"`,
        meal.has_protein,
        meal.has_carbs,
        meal.ingredient_count,
        `"${meal.protein_sources}"`,
        `"${meal.carb_sources}"`
      ];
      csvRows.push(row.join(','));
    });
  
  // Save CSV
  const csvContent = csvRows.join('\n');
  const timestamp = new Date().toISOString().split('T')[0];
  const csvFilename = `problematic-meals-${timestamp}.csv`;
  const csvPath = path.join(__dirname, csvFilename);
  
  fs.writeFileSync(csvPath, csvContent);
  
  console.log(`\n💾 CSV saved: ${csvFilename}`);
  console.log(`📁 Location: ${csvPath}`);
  
  // Show summary of flagged meals
  if (flaggedMeals.length > 0) {
    console.log(`\n🚨 FLAGGED MEALS (${flaggedMeals.length} total):`);
    console.log('Top 15 most concerning:\n');
    
    flaggedMeals.slice(0, 15).forEach((meal, index) => {
      console.log(`${index + 1}. "${meal.title}"`);
      console.log(`   Rationale: ${meal.rationale}`);
      console.log(`   Protein: ${meal.protein_sources || 'None'}`);
      console.log(`   Ingredients: ${meal.ingredient_count}`);
      console.log('');
    });
  }
  
  console.log(`\n🎯 SUMMARY:`);
  console.log(`• ${results.length} total meals reviewed`);
  console.log(`• ${flaggedMeals.length} meals flagged for potential customer disappointment`);
  console.log(`• ${keptMeals.length} meals deemed satisfactory`);
  console.log(`• Review the CSV file for detailed analysis`);
}

main().catch(console.error);