#!/usr/bin/env node

/**
 * Generate images for first 10 meals for review
 */

const { processMealImage } = require('./generate-meal-images');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function generateFirst10() {
  console.log('🎨 Generating Images for First 10 Meals');
  console.log('=====================================');
  
  // Get first 10 meals without images
  const { data: meals, error } = await supabase
    .from('meals')
    .select('*')
    .is('image_url', null)
    .order('created_at', { ascending: true })
    .limit(10);
  
  if (error || !meals || meals.length === 0) {
    console.log('❌ No meals found or error:', error);
    return;
  }
  
  console.log(`📷 Found ${meals.length} meals to process:`);
  meals.forEach((meal, i) => {
    console.log(`   ${i+1}. ${meal.title}`);
  });
  console.log('');
  
  const results = {
    successful: [],
    failed: []
  };
  
  for (const meal of meals) {
    const index = meals.indexOf(meal) + 1;
    console.log(`\n🍽️ [${index}/10] Processing: ${meal.title}`);
    console.log('-'.repeat(60));
    
    try {
      await processMealImage(meal);
      
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/meal-images/${meal.slug}.png`;
      results.successful.push({
        title: meal.title,
        slug: meal.slug,
        url: publicUrl
      });
      
      console.log(`✅ Success: ${meal.title}`);
      
    } catch (error) {
      console.error(`❌ Failed: ${meal.title} - ${error.message}`);
      results.failed.push(meal.title);
    }
    
    // Rate limiting - 3 second delay
    if (index < meals.length) {
      console.log('⏳ Rate limiting... (3 seconds)');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 FIRST 10 MEALS - SUMMARY FOR REVIEW');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${results.successful.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  
  if (results.successful.length > 0) {
    console.log('\n✅ Successfully generated images:');
    results.successful.forEach(item => {
      console.log(`   ${item.title}`);
      console.log(`   📸 ${item.url}`);
      console.log('');
    });
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed to generate:');
    results.failed.forEach(title => {
      console.log(`   - ${title}`);
    });
  }
  
  console.log('🎉 First 10 complete! Please review images before continuing.');
  console.log('💡 Run this script again to process more meals.');
}

generateFirst10().catch(console.error);