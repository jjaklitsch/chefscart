#!/usr/bin/env node

/**
 * ChefsCart Meal Image Generator
 * 
 * Uses DALL-E 3 to generate photorealistic meal images
 * and stores them in Supabase storage.
 * 
 * Usage: node generate-meal-images.js [--test] [--slug=meal-slug]
 */

const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');

// Simple retry utility (inline since retry.js doesn't exist)
const withBackoff = async (fn, options = {}) => {
  const { tries = 3, base = 1000, shouldRetry = () => true } = options;
  
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === tries - 1 || !shouldRetry(error)) {
        throw error;
      }
      const delay = base * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Script options
const TEST_MODE = process.argv.includes('--test');
const SPECIFIC_SLUG = process.argv.find(arg => arg.startsWith('--slug='))?.split('=')[1];

// Initialize clients
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Generate editorial photography prompt for meal images
 */
function generateImagePrompt(meal) {
  const { title, description } = meal;

  // Build professional editorial photography prompt
  const prompt = `PHOTOREALISTIC editorial food photograph of "${title}".
DESCRIPTION: ${description} — plate exactly what the description implies; no extra props.

FORMAT: SQUARE 1024x1024 image
COMPOSITION: 90° overhead shot, plate PERFECTLY CENTERED in frame; full plate rim visible; 
12–15% white margin from plate edge to image border on ALL SIDES; dish fills plate generously

CAMERA: full-frame DSLR look, 50mm, f/5.6, ISO 200, 1/125s; RAW/minimal retouch

LIGHT: north-window daylight from left with soft diffusion; white bounce on right;
seamless white studio sweep background (RGB 248–255) with faint soft contact shadow under plate ONLY

PLATE: simple matte white ceramic, subtle glaze micro-scratches; generous restaurant portion centered on plate
TEXTURE: natural browning/char where appropriate; tiny oil droplets and slight sauce pooling;
torn herbs or irregular garnish scatter (not symmetrical); crumbs allowed; no plastic-smooth surfaces

FOCUS/COLOR: entire dish in focus; neutral/true color, 5200–5600K daylight

CRITICAL BANS: placemats, table surfaces, wood or faux-wood surfaces, visible table grain, 
cutting boards, linens, utensils, extra props; illustration/CGI/3D render; harsh rim-lighting; cut-out look;
anything other than pure white seamless background`;

  return prompt;
}

/**
 * Download image from URL to buffer
 */
async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
  });
}

/**
 * Generate image using DALL-E 3
 */
async function generateImage(meal) {
  console.log(`🎨 Generating image for: ${meal.title}`);
  
  const prompt = generateImagePrompt(meal);
  
  if (TEST_MODE) {
    console.log('\n📝 Generated Prompt:');
    console.log(prompt);
    console.log('\n');
  }
  
  const generateWithRetry = () => withBackoff(async () => {
    const response = await openai.images.generate({
      model: "dall-e-3", // Note: DALL-E 3 is the latest available model
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "hd", // Using HD quality for better results
      style: "natural"
    });
    
    return response.data[0].url;
  }, {
    tries: 3,
    base: 2000,
    shouldRetry: (error) => {
      if (error.status >= 500) return true;
      if (error.status === 429) return true;
      return false;
    }
  });
  
  try {
    const imageUrl = await generateWithRetry();
    console.log(`✅ Image generated for: ${meal.title}`);
    return imageUrl;
  } catch (error) {
    console.error(`❌ Failed to generate image for ${meal.title}:`, error.message);
    throw error;
  }
}

/**
 * Upload image to Supabase storage
 */
async function uploadToSupabase(imageUrl, slug) {
  console.log(`📤 Uploading image for: ${slug}`);
  
  try {
    // Download the image
    const imageBuffer = await downloadImage(imageUrl);
    
    // Upload to Supabase
    const fileName = `${slug}.png`;
    const { error } = await supabase.storage
      .from('meal-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (error) {
      throw error;
    }
    
    // Get public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/meal-images/${fileName}`;
    
    console.log(`✅ Uploaded: ${publicUrl}`);
    return publicUrl;
    
  } catch (error) {
    console.error(`❌ Failed to upload image for ${slug}:`, error.message);
    throw error;
  }
}

/**
 * Update meal record with image URL
 */
async function updateMealWithImage(slug, imageUrl) {
  console.log(`💾 Updating database for: ${slug}`);
  
  const { error } = await supabase
    .from('meals')
    .update({ image_url: imageUrl })
    .eq('slug', slug);
  
  if (error) {
    console.error(`❌ Failed to update meal ${slug}:`, error);
    throw error;
  }
  
  console.log(`✅ Database updated for: ${slug}`);
}

/**
 * Process a single meal
 */
async function processMealImage(meal) {
  try {
    // Generate image with DALL-E
    const tempImageUrl = await generateImage(meal);
    
    // Upload to Supabase storage
    const permanentUrl = await uploadToSupabase(tempImageUrl, meal.slug);
    
    // Update database
    await updateMealWithImage(meal.slug, permanentUrl);
    
    return permanentUrl;
    
  } catch (error) {
    console.error(`💥 Failed to process image for ${meal.slug}:`, error.message);
    return null;
  }
}

/**
 * Get test meals or specific meal
 */
async function getTestMeals() {
  if (SPECIFIC_SLUG) {
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('slug', SPECIFIC_SLUG)
      .single();
    
    if (error || !data) {
      console.error(`❌ Meal not found: ${SPECIFIC_SLUG}`);
      return [];
    }
    
    return [data];
  }
  
  // Get a few test meals with different characteristics
  const testSlugs = [
    'grilled-chicken-caesar-salad',
    'butter-chicken-murgh-makhani',
    'pho-bo-beef-noodle-soup'
  ];
  
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .in('slug', testSlugs);
  
  if (error) {
    console.error('❌ Error fetching test meals:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 ChefsCart Meal Image Generator');
  console.log('=================================');
  
  if (TEST_MODE) {
    console.log('🧪 TEST MODE - Processing sample meals only');
  }
  
  const meals = await getTestMeals();
  
  if (meals.length === 0) {
    console.log('❌ No meals found to process');
    return;
  }
  
  console.log(`📷 Processing ${meals.length} meal(s)...`);
  console.log('');
  
  const results = {
    successful: [],
    failed: []
  };
  
  for (const meal of meals) {
    console.log(`\n🍽️ Processing: ${meal.title}`);
    console.log('-'.repeat(50));
    
    const imageUrl = await processMealImage(meal);
    
    if (imageUrl) {
      results.successful.push({ 
        title: meal.title, 
        slug: meal.slug,
        url: imageUrl 
      });
    } else {
      results.failed.push(meal.title);
    }
    
    // Rate limiting delay
    if (meals.indexOf(meal) < meals.length - 1) {
      console.log('⏳ Waiting 3 seconds...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Successful: ${results.successful.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  
  if (results.successful.length > 0) {
    console.log('\n✅ Successfully generated images:');
    results.successful.forEach(item => {
      console.log(`   - ${item.title}`);
      console.log(`     URL: ${item.url}`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed to generate images:');
    results.failed.forEach(title => {
      console.log(`   - ${title}`);
    });
  }
  
  console.log('\n🎉 Image generation complete!');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateImagePrompt, processMealImage };