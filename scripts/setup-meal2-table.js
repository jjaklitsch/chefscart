#!/usr/bin/env node

/**
 * Setup meal2 table and get first 10 meals for regeneration
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('🔧 Setting up meal2 table and getting first 10 meals');
  console.log('====================================================\n');

  try {
    // First, get the first 10 meals from the existing table
    console.log('📊 Fetching first 10 meals from existing table...');
    const { data: firstTenMeals, error: fetchError } = await supabase
      .from('meals')
      .select('*')
      .order('id')
      .limit(10);

    if (fetchError) {
      throw new Error(`Error fetching meals: ${fetchError.message}`);
    }

    console.log(`✅ Found ${firstTenMeals.length} meals to regenerate:`);
    firstTenMeals.forEach((meal, index) => {
      console.log(`${index + 1}. "${meal.title}"`);
    });

    console.log('\n📋 SQL to create meal2 table (run this in Supabase SQL Editor):');
    console.log('================================================================');
    console.log(`
-- Create meal2 table with same structure as meals table
CREATE TABLE IF NOT EXISTS meal2 (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  courses TEXT[] DEFAULT '{}',
  cuisines TEXT[] DEFAULT '{}',
  diets_supported TEXT[] DEFAULT '{}',
  primary_ingredient TEXT,
  spice_level INTEGER DEFAULT 1,
  prep_time INTEGER DEFAULT 0,
  cook_time INTEGER DEFAULT 0,
  cooking_difficulty TEXT,
  time_total_min INTEGER DEFAULT 0,
  servings_default INTEGER DEFAULT 2,
  servings_min INTEGER DEFAULT 1,
  servings_max INTEGER DEFAULT 6,
  cost_per_serving TEXT,
  allergens_present TEXT[] DEFAULT '{}',
  search_keywords TEXT[] DEFAULT '{}',
  cooking_equipment TEXT[] DEFAULT '{}',
  ingredients_json JSONB,
  instructions_json JSONB,
  ingredient_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meal2_slug ON meal2(slug);
CREATE INDEX IF NOT EXISTS idx_meal2_cuisines ON meal2 USING GIN(cuisines);
CREATE INDEX IF NOT EXISTS idx_meal2_diets ON meal2 USING GIN(diets_supported);
CREATE INDEX IF NOT EXISTS idx_meal2_allergens ON meal2 USING GIN(allergens_present);
CREATE INDEX IF NOT EXISTS idx_meal2_difficulty ON meal2(cooking_difficulty);
CREATE INDEX IF NOT EXISTS idx_meal2_spice_level ON meal2(spice_level);
CREATE INDEX IF NOT EXISTS idx_meal2_prep_time ON meal2(prep_time);
CREATE INDEX IF NOT EXISTS idx_meal2_cook_time ON meal2(cook_time);
`);

    console.log('\n📝 Meal titles to regenerate:');
    const mealTitles = firstTenMeals.map(meal => meal.title);
    console.log(JSON.stringify(mealTitles, null, 2));

    // Save the meal data for the generation script
    const fs = await import('fs');
    const mealData = {
      meals: firstTenMeals.map(meal => ({
        id: meal.id,
        title: meal.title,
        originalSlug: meal.slug,
        description: meal.description
      }))
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'first-10-meals.json'), 
      JSON.stringify(mealData, null, 2)
    );
    
    console.log('\n💾 Saved meal data to first-10-meals.json');
    console.log('\n🚀 Next steps:');
    console.log('1. Run the SQL above in Supabase Dashboard → SQL Editor');
    console.log('2. Update codebase to reference meal2 table'); 
    console.log('3. Run meal generation script with the 10 meal titles');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();