#!/usr/bin/env node

/**
 * Batch Image Generator for Existing Meals
 * Runs in parallel with meal data generation
 */

const { generateImagePrompt, processMealImage } = require('./generate-meal-images');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Get meals without images
 */
async function getMealsWithoutImages(limit = 100) {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .is('image_url', null)
    .limit(limit);
  
  if (error) {
    console.error('❌ Error fetching meals:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Process meals in batches
 */
async function processBatch() {
  console.log('🚀 Batch Image Generation');
  console.log('========================');
  
  const meals = await getMealsWithoutImages();
  
  if (meals.length === 0) {
    console.log('✅ All meals have images!');
    return;
  }
  
  console.log(`📷 Found ${meals.length} meals without images`);
  
  let successful = 0;
  let failed = 0;
  
  for (const meal of meals) {
    console.log(`\n🍽️ [${meals.indexOf(meal) + 1}/${meals.length}] ${meal.title}`);
    
    try {
      await processMealImage(meal);
      successful++;
    } catch (error) {
      console.error(`❌ Failed: ${error.message}`);
      failed++;
    }
    
    // Rate limit: 50 images per minute max
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  console.log('\n📊 Batch Complete:');
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
}

if (require.main === module) {
  processBatch().catch(console.error);
}