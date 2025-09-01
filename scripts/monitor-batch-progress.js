#!/usr/bin/env node

/**
 * Monitor Batch Processing Progress
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function monitorProgress() {
  const { count } = await supabase
    .from('meal2')
    .select('*', { count: 'exact', head: true });
    
  const progress = Math.round((count / 50) * 100);
  const bar = '█'.repeat(Math.floor(progress / 2)) + '░'.repeat(50 - Math.floor(progress / 2));
  
  console.log(`🔄 Progress: ${count}/50 meals (${progress}%)`);
  console.log(`[${bar}]`);
  
  if (count > 0) {
    const { data: latest } = await supabase
      .from('meal2')
      .select('id, title')
      .order('id', { ascending: false })
      .limit(1);
      
    console.log(`📝 Latest: ${latest[0].title} (ID: ${latest[0].id})`);
  }
  
  if (count >= 50) {
    console.log('🎉 Batch processing complete!');
    return true;
  }
  
  return false;
}

// Monitor progress every 30 seconds
async function startMonitoring() {
  console.log('📊 Starting batch processing monitor...\n');
  
  while (true) {
    try {
      const complete = await monitorProgress();
      if (complete) break;
      
      console.log('⏱️  Checking again in 30 seconds...\n');
      await new Promise(resolve => setTimeout(resolve, 30000));
    } catch (error) {
      console.error('❌ Monitor error:', error.message);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startMonitoring();
}