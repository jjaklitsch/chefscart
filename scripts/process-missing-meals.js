#!/usr/bin/env node

/**
 * Process Missing Meals - Complete the meal2 database
 * Processes only the meals that are missing from meal2 table
 */

import { execSync } from 'child_process';
import fs from 'fs';

const BATCH_SIZE = 10; // Smaller batches for reliability
const BATCH_DELAY = 3000; // 3 second delay between batches

async function processMissingMeals() {
  console.log('🔄 PROCESSING MISSING MEALS TO COMPLETE DATABASE\n');
  
  // Load missing meal names
  const missingMeals = JSON.parse(fs.readFileSync('/tmp/missing_meals.json', 'utf-8'));
  console.log(`📋 Found ${missingMeals.length} missing meals to process\n`);
  
  const totalBatches = Math.ceil(missingMeals.length / BATCH_SIZE);
  let successCount = 0;
  let failCount = 0;
  const failedMeals = [];
  
  console.log(`🔄 Processing in ${totalBatches} batches of ${BATCH_SIZE} meals each\n`);
  
  const startTime = Date.now();
  
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIndex = batchIndex * BATCH_SIZE;
    const endIndex = Math.min(startIndex + BATCH_SIZE, missingMeals.length);
    const batchMeals = missingMeals.slice(startIndex, endIndex);
    
    console.log(`📦 BATCH ${batchIndex + 1}/${totalBatches}: Processing meals ${startIndex + 1}-${endIndex}`);
    console.log(`   Meals: ${batchMeals.slice(0, 3).join(', ')}${batchMeals.length > 3 ? '...' : ''}`);
    
    try {
      // Build command with proper escaping
      const quotedMeals = batchMeals.map(name => `"${name.replace(/"/g, '\\"')}"`).join(' ');
      const command = `node scripts/generate-meal-data-comprehensive.js ${quotedMeals}`;
      
      console.log(`⏳ Executing batch ${batchIndex + 1}...`);
      const batchStartTime = Date.now();
      
      // Execute the command
      const output = execSync(command, { 
        encoding: 'utf-8', 
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout: 300000 // 5 minute timeout per batch
      });
      
      const batchEndTime = Date.now();
      const duration = Math.round((batchEndTime - batchStartTime) / 1000);
      
      // Count successes from output
      const successMatches = output.match(/✅ Saved meal with ID: /g);
      const batchSuccessCount = successMatches ? successMatches.length : 0;
      const batchFailCount = batchMeals.length - batchSuccessCount;
      
      successCount += batchSuccessCount;
      failCount += batchFailCount;
      
      if (batchFailCount > 0) {
        // Track which specific meals failed
        batchMeals.forEach(meal => {
          if (!output.includes(`Saving meal: ${meal}`)) {
            failedMeals.push(meal);
          }
        });
      }
      
      console.log(`✅ Batch ${batchIndex + 1} completed in ${duration}s`);
      console.log(`   Success: ${batchSuccessCount}/${batchMeals.length} | Total so far: ${successCount}/${successCount + failCount}`);
      
      // Brief delay between batches (except for last batch)
      if (batchIndex < totalBatches - 1) {
        console.log(`⏱️  Waiting ${BATCH_DELAY/1000}s before next batch...\n`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
      
    } catch (error) {
      console.error(`❌ Batch ${batchIndex + 1} failed:`, error.message);
      failCount += batchMeals.length;
      failedMeals.push(...batchMeals);
      
      // Continue with next batch even if this one fails
      console.log(`🔄 Continuing with next batch...\n`);
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }
  
  const endTime = Date.now();
  const totalDuration = Math.round((endTime - startTime) / 1000);
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 MISSING MEALS PROCESSING COMPLETE!');
  console.log('='.repeat(60));
  console.log(`📊 FINAL RESULTS:`);
  console.log(`   ✅ Successfully processed: ${successCount}/${missingMeals.length} meals`);
  console.log(`   ❌ Failed: ${failCount}/${missingMeals.length} meals`);
  console.log(`   ⏱️  Total time: ${Math.round(totalDuration/60)} minutes`);
  
  if (failedMeals.length > 0) {
    console.log(`\n⚠️  Failed meals (${failedMeals.length}):`);
    failedMeals.forEach((meal, i) => {
      console.log(`   ${i+1}. ${meal}`);
    });
    
    // Save failed meals for potential retry
    fs.writeFileSync('/tmp/failed_meals.json', JSON.stringify(failedMeals, null, 2));
    console.log('\n💾 Saved failed meal names to /tmp/failed_meals.json for retry');
  }
  
  // Check final database status
  const { createClient } = await import('@supabase/supabase-js');
  const dotenv = await import('dotenv');
  dotenv.config({ path: 'apps/web/.env.local' });
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const { count: finalCount } = await supabase
    .from('meal2')
    .select('*', { count: 'exact', head: true });
  
  const { count: originalCount } = await supabase
    .from('meals')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n🗄️  FINAL DATABASE STATUS:`);
  console.log(`   📊 Total in meal2: ${finalCount} meals`);
  console.log(`   📊 Total in original: ${originalCount} meals`);
  console.log(`   📊 Coverage: ${Math.round(finalCount/originalCount*100)}%`);
  
  if (finalCount === originalCount) {
    console.log('\n🎉 SUCCESS: All meals have been processed!');
  } else {
    console.log(`\n⚠️  ${originalCount - finalCount} meals still missing`);
  }
}

// Run the processor
processMissingMeals().catch(error => {
  console.error('💥 Fatal error:', error.message);
  process.exit(1);
});