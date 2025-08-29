import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupSchema() {
  console.log('🔧 Setting up Instacart schema in Supabase...');

  // Read the SQL file
  const sql = fs.readFileSync('setup_instacart_schema.sql', 'utf8');
  
  // Split into individual statements (simple approach for our use case)
  const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i].trim();
    if (!statement) continue;

    try {
      console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: statement + ';' 
      });

      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error);
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    } catch (err) {
      console.error(`❌ Exception in statement ${i + 1}:`, err.message);
    }
  }

  // Verify the setup
  console.log('\n🔍 Verifying schema setup...');
  
  // Check ingredient_categories
  const { data: categories, error: catError } = await supabase
    .from('ingredient_categories')
    .select('category_name, store_section')
    .order('display_order');

  if (catError) {
    console.error('❌ Error checking ingredient_categories:', catError);
  } else {
    console.log(`✅ ingredient_categories table: ${categories.length} categories`);
    categories.slice(0, 5).forEach(cat => {
      console.log(`   - ${cat.category_name} (${cat.store_section})`);
    });
    if (categories.length > 5) {
      console.log(`   ... and ${categories.length - 5} more`);
    }
  }

  // Check health_filter_mapping
  const { data: healthFilters, error: healthError } = await supabase
    .from('health_filter_mapping')
    .select('chefscart_preference, instacart_filter');

  if (healthError) {
    console.error('❌ Error checking health_filter_mapping:', healthError);
  } else {
    console.log(`✅ health_filter_mapping table: ${healthFilters.length} mappings`);
    healthFilters.slice(0, 5).forEach(filter => {
      console.log(`   - ${filter.chefscart_preference} → ${filter.instacart_filter}`);
    });
    if (healthFilters.length > 5) {
      console.log(`   ... and ${healthFilters.length - 5} more`);
    }
  }

  // Check updated meals
  const { data: mealStats, error: mealError } = await supabase
    .from('meals')
    .select('instacart_optimized')
    .eq('instacart_optimized', true);

  if (mealError) {
    console.error('❌ Error checking meal stats:', mealError);
  } else {
    console.log(`✅ Instacart-optimized meals: ${mealStats.length}`);
  }

  console.log('\n🎉 Schema setup complete!');
}

// Alternative approach using direct SQL execution if the above doesn't work
async function setupSchemaAlternative() {
  console.log('🔧 Setting up Instacart schema (alternative approach)...');

  const tables = [
    {
      name: 'ingredient_categories',
      sql: `CREATE TABLE IF NOT EXISTS ingredient_categories (
        id SERIAL PRIMARY KEY,
        category_name TEXT UNIQUE NOT NULL,
        display_order INTEGER NOT NULL,
        store_section TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )`
    },
    {
      name: 'health_filter_mapping',  
      sql: `CREATE TABLE IF NOT EXISTS health_filter_mapping (
        id SERIAL PRIMARY KEY,
        chefscart_preference TEXT NOT NULL,
        instacart_filter TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )`
    },
    {
      name: 'user_retailer_preferences',
      sql: `CREATE TABLE IF NOT EXISTS user_retailer_preferences (
        id SERIAL PRIMARY KEY,
        user_session TEXT,
        zip_code TEXT NOT NULL,
        retailer_key TEXT NOT NULL,
        retailer_name TEXT NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        last_used TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )`
    }
  ];

  for (const table of tables) {
    try {
      console.log(`📝 Creating table: ${table.name}...`);
      // Note: This would require a custom RPC function in Supabase to execute DDL
      console.log(`⚠️  Manual SQL needed for ${table.name}:`);
      console.log(table.sql);
      console.log('');
    } catch (error) {
      console.error(`❌ Error creating ${table.name}:`, error);
    }
  }

  console.log('📋 Manual SQL statements needed - copy to Supabase SQL Editor');
}

// Run setup
setupSchemaAlternative().catch(console.error);