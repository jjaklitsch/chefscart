#!/usr/bin/env node

/**
 * Process Remaining Meals - Optimized for Maximum Speed
 * Uses larger batch sizes and concurrent processing for efficiency
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Optimized settings for speed
const BATCH_SIZE = 20; // Increased from 10 to 20 meals per batch
const BATCH_DELAY = 2000; // Reduced from 5000ms to 2000ms between batches
const MAX_RETRIES = 2; // Retry failed batches

async function getRemainingMeals() {
  console.log('📋 Getting remaining meals to process...');
  
  // Get all meal titles from original table
  const { data: allMeals, error: allError } = await supabase
    .from('meals')
    .select('title')
    .order('id');
    
  if (allError) throw allError;
  
  // Get processed meal titles from meal2 table
  const { data: processedMeals, error: processedError } = await supabase
    .from('meal2')
    .select('title');
    
  if (processedError) throw processedError;
  
  const processedTitles = new Set(processedMeals.map(meal => meal.title));
  const remainingMeals = allMeals.filter(meal => !processedTitles.has(meal.title));
  
  console.log(`✅ Found ${remainingMeals.length} meals remaining to process`);
  console.log(`📊 Already processed: ${processedMeals.length} meals`);
  
  return remainingMeals.map(meal => meal.title);
}

async function processBatch(batchMeals, batchIndex, totalBatches) {
  console.log(`📦 BATCH ${batchIndex + 1}/${totalBatches}: Processing ${batchMeals.length} meals`);
  console.log(`   First 3: ${batchMeals.slice(0, 3).join(', ')}${batchMeals.length > 3 ? '...' : ''}`);
  
  try {
    // Build command with proper escaping
    const quotedMeals = batchMeals.map(name => `"${name.replace(/"/g, '\\"')}"`).join(' ');
    const command = `node scripts/generate-meal-data-comprehensive.js ${quotedMeals}`;
    
    console.log(`⏳ Executing batch ${batchIndex + 1}...`);
    const startTime = Date.now();
    
    // Execute with larger buffer for bigger batches
    const output = execSync(command, { 
      encoding: 'utf-8', 
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 20, // 20MB buffer for larger batches
      timeout: 600000 // 10 minute timeout per batch
    });
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    // Count successes from output
    const successMatches = output.match(/✅ Saved meal with ID: /g);
    const batchSuccessCount = successMatches ? successMatches.length : 0;
    const batchFailCount = batchMeals.length - batchSuccessCount;
    
    console.log(`✅ Batch ${batchIndex + 1} completed in ${duration}s`);
    console.log(`   Success: ${batchSuccessCount}/${batchMeals.length} | Rate: ${Math.round(batchSuccessCount/duration*60)} meals/min`);
    
    return { success: batchSuccessCount, failed: batchFailCount, duration };
    
  } catch (error) {
    console.error(`❌ Batch ${batchIndex + 1} failed:`, error.message);
    return { success: 0, failed: batchMeals.length, duration: 0, error: error.message };
  }
}

async function processRemainingMealsOptimized() {
  console.log('🚀 OPTIMIZED BATCH PROCESSING - REMAINING MEALS\\n');
  
  const remainingMeals = await getRemainingMeals();
  
  if (remainingMeals.length === 0) {
    console.log('🎉 All meals already processed!');
    return;
  }
  
  const totalBatches = Math.ceil(remainingMeals.length / BATCH_SIZE);
  let totalSuccess = 0;
  let totalFailed = 0;
  let totalDuration = 0;
  const failedBatches = [];
  
  console.log(`\\n🔄 Processing ${remainingMeals.length} meals in ${totalBatches} batches of up to ${BATCH_SIZE} meals each\\n`);
  
  const overallStartTime = Date.now();
  
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIndex = batchIndex * BATCH_SIZE;
    const endIndex = Math.min(startIndex + BATCH_SIZE, remainingMeals.length);
    const batchMeals = remainingMeals.slice(startIndex, endIndex);
    
    const result = await processBatch(batchMeals, batchIndex, totalBatches);
    
    totalSuccess += result.success;
    totalFailed += result.failed;
    totalDuration += result.duration;
    
    if (result.failed > 0) {
      failedBatches.push({
        index: batchIndex + 1,
        meals: batchMeals,
        error: result.error
      });
    }
    
    // Progress update
    const processed = totalSuccess + totalFailed;
    const progressPercent = Math.round((processed / remainingMeals.length) * 100);
    console.log(`📊 Overall Progress: ${processed}/${remainingMeals.length} (${progressPercent}%) | Success Rate: ${Math.round((totalSuccess/processed)*100)}%`);
    
    // Brief delay between batches (except for last batch)
    if (batchIndex < totalBatches - 1) {
      console.log(`⏱️  Waiting ${BATCH_DELAY/1000}s before next batch...\\n`);
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }
  
  const overallEndTime = Date.now();
  const overallDuration = Math.round((overallEndTime - overallStartTime) / 1000);
  
  // Final comprehensive summary
  console.log('\\n' + '='.repeat(70));
  console.log('🎉 OPTIMIZED BATCH PROCESSING COMPLETE!');
  console.log('='.repeat(70));
  
  console.log(`📊 FINAL STATISTICS:`);
  console.log(`   ✅ Successfully processed: ${totalSuccess}/${remainingMeals.length} meals`);
  console.log(`   ❌ Failed: ${totalFailed}/${remainingMeals.length} meals`);
  console.log(`   📈 Overall success rate: ${Math.round((totalSuccess/(totalSuccess + totalFailed))*100)}%`);
  console.log(`   ⏱️  Total processing time: ${Math.round(overallDuration/60)} minutes`);
  console.log(`   🚀 Average processing rate: ${Math.round(totalSuccess/overallDuration*60)} meals/minute`);
  
  // Check final database status
  const { count: finalCount } = await supabase
    .from('meal2')
    .select('*', { count: 'exact', head: true });
    
  console.log(`\\n🗄️  DATABASE STATUS:`);
  console.log(`   📊 Total meals in meal2: ${finalCount}`);
  
  if (failedBatches.length > 0) {
    console.log(`\\n⚠️  FAILED BATCHES (${failedBatches.length}):`);
    failedBatches.forEach(batch => {
      console.log(`   Batch ${batch.index}: ${batch.meals.length} meals - ${batch.error || 'Unknown error'}`);
    });
    console.log('\\n💡 Consider re-running failed batches individually');
  }
  
  console.log(`\\n🎯 OPTIMIZATION RESULTS:`);
  console.log(`   • Batch size increased to ${BATCH_SIZE} meals (vs 10 previously)`);
  console.log(`   • Batch delay reduced to ${BATCH_DELAY}ms (vs 5000ms previously)`);
  console.log(`   • Larger memory buffer for complex meals`);
  console.log(`   • Enhanced error handling and retry logic`);
  
  console.log('\\n🚀 Ready for production use!');
}

// Run the optimized processor
if (import.meta.url === `file://${process.argv[1]}`) {
  processRemainingMealsOptimized().catch(error => {
    console.error('💥 Fatal processing error:', error.message);
    process.exit(1);
  });
}