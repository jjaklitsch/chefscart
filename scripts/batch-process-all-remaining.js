#!/usr/bin/env node

/**
 * Process All Remaining Meals - Efficient Batch Processing
 * 
 * Processes all remaining meals without images in batches of 50
 * for maximum efficiency while respecting API limits
 */

const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const https = require('https');

// Simple retry utility
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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Generate editorial photography prompt for meal images
 */
function generateImagePrompt(meal) {
  const { title, description } = meal;

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
 * Generate single meal image with retry logic
 */
async function generateMealImage(meal, batchIndex, totalBatches) {
  console.log(`🎨 [Batch ${batchIndex}/${totalBatches}] [${meal.slug}] Starting generation...`);
  
  const prompt = generateImagePrompt(meal);
  
  const generateWithRetry = () => withBackoff(async () => {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
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
    const tempImageUrl = await generateWithRetry();
    console.log(`✅ [${meal.slug}] Image generated, uploading...`);
    
    // Download and upload to Supabase
    const imageBuffer = await downloadImage(tempImageUrl);
    const fileName = `${meal.slug}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from('meal-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (uploadError) {
      throw uploadError;
    }
    
    // Get public URL and update database
    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/meal-images/${fileName}`;
    
    const { error: dbError } = await supabase
      .from('meals')
      .update({ image_url: publicUrl })
      .eq('slug', meal.slug);
    
    if (dbError) {
      throw dbError;
    }
    
    console.log(`✅ [${meal.slug}] Complete`);
    return {
      success: true,
      slug: meal.slug,
      title: meal.title,
      url: publicUrl
    };
    
  } catch (error) {
    console.error(`❌ [${meal.slug}] Failed: ${error.message}`);
    return {
      success: false,
      slug: meal.slug,
      title: meal.title,
      error: error.message
    };
  }
}

/**
 * Process a batch of meals simultaneously
 */
async function processBatch(meals, batchIndex, totalBatches) {
  console.log(`\n🚀 Batch ${batchIndex}/${totalBatches}: Processing ${meals.length} meals simultaneously...`);
  
  const startTime = Date.now();
  
  // Process all meals in batch simultaneously
  const promises = meals.map(meal => generateMealImage(meal, batchIndex, totalBatches));
  const results = await Promise.all(promises);
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000 / 60).toFixed(2);
  
  // Analyze results
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n📊 Batch ${batchIndex} Complete: ✅${successful.length} ❌${failed.length} (${duration}min)`);
  
  return { successful, failed, duration: parseFloat(duration) };
}

/**
 * Main execution - process all remaining meals
 */
async function main() {
  try {
    console.log('🎯 Processing ALL Remaining Meal Images');
    console.log('='.repeat(50));
    
    // Get total count first
    const { count: totalCount } = await supabase
      .from('meals')
      .select('count', { count: 'exact' })
      .is('image_url', null);
    
    console.log(`📋 Total meals to process: ${totalCount}`);
    
    if (totalCount === 0) {
      console.log('✅ All meals already have images!');
      return;
    }
    
    const BATCH_SIZE = 50;
    const totalBatches = Math.ceil(totalCount / BATCH_SIZE);
    
    console.log(`📦 Processing in ${totalBatches} batches of ${BATCH_SIZE} each`);
    
    let grandTotal = {
      successful: [],
      failed: [],
      totalDuration: 0,
      processed: 0
    };
    
    for (let batchIndex = 1; batchIndex <= totalBatches; batchIndex++) {
      // Fetch next batch
      const { data: meals, error } = await supabase
        .from('meals')
        .select('*')
        .is('image_url', null)
        .limit(BATCH_SIZE);
      
      if (error) {
        throw error;
      }
      
      if (!meals || meals.length === 0) {
        console.log('✅ No more meals to process');
        break;
      }
      
      // Process batch
      const batchResult = await processBatch(meals, batchIndex, totalBatches);
      
      // Update totals
      grandTotal.successful.push(...batchResult.successful);
      grandTotal.failed.push(...batchResult.failed);
      grandTotal.totalDuration += batchResult.duration;
      grandTotal.processed += meals.length;
      
      // Progress report
      console.log(`\n📈 Progress: ${grandTotal.processed}/${totalCount} meals processed`);
      console.log(`⏱️  Average: ${(grandTotal.totalDuration / batchIndex).toFixed(2)}min per batch`);
      
      // Short delay between batches to be respectful to APIs
      if (batchIndex < totalBatches) {
        console.log(`⏳ Brief pause before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL MEAL IMAGES PROCESSING COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📸 Total images generated: ${grandTotal.successful.length}`);
    console.log(`❌ Total failures: ${grandTotal.failed.length}`);
    console.log(`⏱️  Total time: ${grandTotal.totalDuration.toFixed(2)} minutes`);
    console.log(`📊 Success rate: ${((grandTotal.successful.length / grandTotal.processed) * 100).toFixed(1)}%`);
    
    if (grandTotal.failed.length > 0) {
      console.log(`\n❌ Failed meals (${grandTotal.failed.length}):`);
      grandTotal.failed.forEach(failure => {
        console.log(`   - ${failure.title}: ${failure.error}`);
      });
    }
    
    console.log(`\n✅ Database updated with ${grandTotal.successful.length} image URLs`);
    
  } catch (error) {
    console.error('💥 Processing failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };