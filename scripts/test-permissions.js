#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(process.cwd(), '.env.local') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testPermissions() {
  console.log('🧪 Testing API permissions...');
  
  try {
    // Test 1: Can we read the meals table?
    const { data, error } = await supabase
      .from('meals')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ Can read meals table');
    
    // Test 2: Can we call built-in functions?
    const { data: versionData, error: versionError } = await supabase
      .rpc('version'); // This should work if rpc functions are available
    
    if (versionError) {
      console.log('❌ RPC functions not available:', versionError.message);
    } else {
      console.log('✅ RPC functions available:', versionData);
    }
    
    // Test 3: Check what functions are available
    const { data: functions, error: funcError } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'version')
      .limit(5);
    
    if (funcError) {
      console.log('❌ Cannot access pg_proc:', funcError.message);
    } else {
      console.log('✅ Found functions:', functions);
    }
    
  } catch (error) {
    console.error('❌ Permission test failed:', error.message);
  }
}

testPermissions();