#!/usr/bin/env node

/**
 * Create meal2 table in Supabase via SQL
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createMeal2Table() {
  console.log('🔧 Creating meal2 table in Supabase...');

  const createTableSQL = `
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
`;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (error) {
      // Try alternative approach - execute raw SQL
      const { error: sqlError } = await supabase
        .from('meal2')
        .select('id')
        .limit(1);
        
      if (sqlError && sqlError.code !== 'PGRST116') {
        console.log('⚠️ Table creation via API failed, but this is expected.');
        console.log('Please run this SQL in Supabase Dashboard → SQL Editor:');
        console.log(createTableSQL);
        return false;
      }
    }
    
    console.log('✅ meal2 table created successfully!');
    return true;
    
  } catch (error) {
    console.log('⚠️ Direct creation failed (this is normal for DDL operations)');
    console.log('Please create the table manually in Supabase Dashboard → SQL Editor');
    console.log('\nSQL to run:');
    console.log(createTableSQL);
    return false;
  }
}

async function main() {
  const success = await createMeal2Table();
  
  if (success) {
    // Test the table exists
    try {
      const { data, error } = await supabase
        .from('meal2')
        .select('*')
        .limit(1);
        
      if (error) {
        console.log('❌ Table verification failed:', error.message);
      } else {
        console.log('✅ meal2 table verified and ready!');
      }
    } catch (error) {
      console.log('❌ Table verification error:', error.message);
    }
  }
}

main();