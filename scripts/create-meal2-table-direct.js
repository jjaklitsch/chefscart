#!/usr/bin/env node

/**
 * Create meal2 table directly via SQL query using Supabase rpc function
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createMeal2Table() {
  console.log('🔧 Creating meal2 table via direct SQL execution...');

  try {
    // First, try to create the table using a raw query approach
    const { data, error } = await supabase.rpc('sql', {
      query: `
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
`
    });

    if (error) {
      console.log(`❌ RPC approach failed: ${error.message}`);
      console.log('📋 Please create the table manually in Supabase Dashboard → SQL Editor');
      return false;
    }

    console.log('✅ Table created successfully!');
    return true;

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log('📋 Please create the table manually in Supabase Dashboard → SQL Editor');
    return false;
  }
}

// Test table after creation
async function verifyTable() {
  try {
    const { data, error } = await supabase
      .from('meal2')
      .select('*')
      .limit(1);

    if (error) {
      console.log(`❌ Table verification failed: ${error.message}`);
      return false;
    }

    console.log('✅ meal2 table verified and ready!');
    return true;
  } catch (error) {
    console.log(`❌ Verification error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Setting up meal2 table...\n');
  
  // Try to create table
  const created = await createMeal2Table();
  
  if (created) {
    // Verify it works
    await verifyTable();
    console.log('\n🎉 meal2 table is ready for meal generation!');
    console.log('📋 Next step: Run `node generate-first-10-meals.js`');
  } else {
    console.log('\n📋 Manual table creation required:');
    console.log('1. Go to: https://supabase.com/dashboard/project/bcbpcuzjkuptyxinjchg/sql');
    console.log('2. Copy and run the SQL provided above');
    console.log('3. Then run: node generate-first-10-meals.js');
  }
}

main().catch(console.error);