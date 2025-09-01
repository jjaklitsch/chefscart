#!/usr/bin/env node

/**
 * Migration script to populate common_ingredients table from CSV data
 * This replaces the CSV file loading with a proper database-backed system
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Category mapping logic from the CSV data
function determineCategory(ingredientName) {
  const name = ingredientName.toLowerCase();
  
  // Proteins
  if (name.includes('chicken') || name.includes('beef') || name.includes('pork') || 
      name.includes('turkey') || name.includes('lamb') || name.includes('bacon') || 
      name.includes('sausage') || name.includes('ham')) {
    return 'Meat & Poultry';
  }
  
  if (name.includes('salmon') || name.includes('cod') || name.includes('tuna') || 
      name.includes('shrimp') || name.includes('prawns') || name.includes('crab') || 
      name.includes('fish') || name.includes('scallops') || name.includes('mussels')) {
    return 'Seafood';
  }
  
  // Produce
  if (name.includes('onion') || name.includes('garlic') || name.includes('tomato') || 
      name.includes('pepper') || name.includes('mushroom') || name.includes('spinach') || 
      name.includes('lettuce') || name.includes('cucumber') || name.includes('carrot') ||
      name.includes('celery') || name.includes('broccoli') || name.includes('zucchini') ||
      name.includes('lemon') || name.includes('lime') || name.includes('apple') ||
      name.includes('avocado') || name.includes('herb') || name.includes('basil') ||
      name.includes('parsley') || name.includes('cilantro')) {
    return 'Produce';
  }
  
  // Dairy
  if (name.includes('cheese') || name.includes('milk') || name.includes('yogurt') || 
      name.includes('cream') || name.includes('butter') || name.includes('eggs')) {
    return 'Dairy & Eggs';
  }
  
  // Grains
  if (name.includes('rice') || name.includes('pasta') || name.includes('bread') || 
      name.includes('flour') || name.includes('quinoa') || name.includes('oats') ||
      name.includes('barley') || name.includes('noodles')) {
    return 'Rice & Grains';
  }
  
  // Canned goods
  if (name.includes('canned') || name.includes('broth') || name.includes('stock') || 
      name.includes('coconut milk') || name.includes('tomato paste')) {
    return 'Canned Goods';
  }
  
  // Condiments & Sauces  
  if (name.includes('sauce') || name.includes('vinegar') || name.includes('oil') || 
      name.includes('mayo') || name.includes('mustard') || name.includes('ketchup')) {
    return 'Condiments & Sauces';
  }
  
  // Spices
  if (name.includes('salt') || name.includes('pepper') || name.includes('spice') || 
      name.includes('cumin') || name.includes('paprika') || name.includes('oregano')) {
    return 'Spices, Seasonings, & Oils';
  }
  
  // Default fallback
  return 'Gourmet';
}

function determineDefaultUnit(ingredientName, category) {
  const name = ingredientName.toLowerCase();
  
  // Proteins get pounds
  if (category === 'Seafood' || category === 'Meat & Poultry') {
    return 'pound';
  }
  
  // Liquids get fl oz
  if (name.includes('oil') || name.includes('vinegar') || name.includes('sauce') || 
      name.includes('milk') || name.includes('cream')) {
    return 'fl oz';
  }
  
  // Canned goods get cans
  if (category === 'Canned Goods' || name.includes('canned') || name.includes('broth')) {
    return 'can';
  }
  
  // Spices get ounces
  if (category === 'Spices, Seasonings, & Oils') {
    return 'ounce';
  }
  
  // Packaged items
  if (name.includes('cheese') || name.includes('tofu') || name.includes('bread')) {
    return 'package';
  }
  
  // Individual items
  if (name.includes('onion') || name.includes('pepper') || name.includes('lemon') || 
      name.includes('lime') || name.includes('garlic')) {
    return 'each';
  }
  
  // Default to pound for substantial ingredients
  return 'pound';
}

function determineOrganicSupported(ingredientName, category) {
  const name = ingredientName.toLowerCase();
  
  // Generally not organic: processed foods, seafood, canned goods
  if (category === 'Seafood' || name.includes('canned') || 
      name.includes('processed') || name.includes('artificial')) {
    return false;
  }
  
  // Generally organic: produce, dairy, grains, oils, spices
  if (category === 'Produce' || category === 'Dairy & Eggs' || 
      category === 'Rice & Grains' || name.includes('oil') || 
      category === 'Spices, Seasonings, & Oils') {
    return true;
  }
  
  // Default to true for whole foods
  return true;
}

async function migrateCsvToDatabase() {
  console.log('🔄 Migrating CSV data to common_ingredients table...');
  
  try {
    // Read CSV file
    const csvPath = '/Users/jonathanjaklitsch/Downloads/deduped_ingredients_v6.csv';
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ CSV file not found at:', csvPath);
      return false;
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const rows = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`📊 Processing ${rows.length} ingredients from CSV...`);
    
    // Process ingredients
    const processedIngredients = new Map();
    
    rows.forEach(row => {
      const standardName = row.standard_name || row.name;
      const variations = row.variations ? row.variations.split('|').filter(v => v.trim()) : [];
      
      if (!processedIngredients.has(standardName)) {
        const category = determineCategory(standardName);
        const defaultUnit = determineDefaultUnit(standardName, category);
        const organicSupported = determineOrganicSupported(standardName, category);
        
        processedIngredients.set(standardName, {
          name: standardName,
          category: category,
          default_unit: defaultUnit,
          organic_supported: organicSupported,
          aliases: [...new Set(variations)], // Remove duplicates
          typical_brands: [] // Will be populated later
        });
      } else {
        // Merge variations
        const existing = processedIngredients.get(standardName);
        existing.aliases = [...new Set([...existing.aliases, ...variations])];
      }
    });
    
    const ingredients = Array.from(processedIngredients.values());
    console.log(`✅ Processed ${ingredients.length} unique ingredients`);
    
    // Clear existing data
    console.log('🗑️  Clearing existing common_ingredients data...');
    const { error: clearError } = await supabase
      .from('common_ingredients')
      .delete()
      .neq('id', 0); // Delete all
      
    if (clearError) {
      console.warn('⚠️  Error clearing table:', clearError.message);
    }
    
    // Insert in batches
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < ingredients.length; i += batchSize) {
      const batch = ingredients.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('common_ingredients')
        .insert(batch)
        .select('id');
        
      if (error) {
        console.error(`❌ Batch insert error (${i}-${i + batch.length}):`, error.message);
        continue;
      }
      
      inserted += data.length;
      console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${data.length} ingredients`);
    }
    
    console.log(`🎉 Migration completed! Inserted ${inserted} ingredients`);
    
    // Verify the results
    const { count } = await supabase
      .from('common_ingredients')
      .select('*', { count: 'exact', head: true });
      
    console.log(`📊 Final count in database: ${count} ingredients`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    return false;
  }
}

// Run migration
migrateCsvToDatabase().then(success => {
  process.exit(success ? 0 : 1);
});