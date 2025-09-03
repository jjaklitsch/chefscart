import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../apps/web/.env.local') });

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Generate image using Nano Banana with enhanced negative prompts
async function generateImageWithNanoBananaEnhanced(meal, testId) {
  try {
    console.log(`    🍌 Generating enhanced image with Nano Banana...`);
    
    // Create enhanced prompt with strong negative prompt integration
    const basePrompt = `Professional food photography of ${meal.title}. ${meal.description}. 
    
    Style: High-quality 1:1 square image, overhead 90-degree angle, white seamless background, soft diffused studio lighting. 
    
    Composition: White rimless plate centered with 12-15% white margin, restaurant-quality plating with generous portions, natural food textures and accurate colors.`;
    
    const negativePrompt = `text, numbers, labels, watermarks, metadata, technical overlays, seed numbers, dimensions, generation parameters, props, backgrounds, wood, stone, linen, utensils, hands, napkins, bottles, logos, multiple plates, side ramekins, patterned rims, colored rims, cutting boards, messy crumbs, busy shadows, writing, captions, title text`;
    
    const fullPrompt = `${basePrompt}

CRITICAL: AVOID ALL OF THE FOLLOWING: ${negativePrompt}

Create a clean, appetizing, professional food photograph suitable for a meal delivery service with NO TEXT OR OVERLAYS of any kind.`;
    
    console.log(`    📝 Enhanced prompt with negative prompts`);
    console.log(`    ❌ Negative items: ${negativePrompt.substring(0, 80)}...`);
    
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`    📊 Response structure:`, Object.keys(result));
    
    // Extract image data from response
    const candidate = result.candidates?.[0];
    const parts = candidate?.content?.parts;
    
    let imageData = null;
    
    // Look for image data in different possible locations
    for (const part of parts || []) {
      if (part.inline_data?.data || part.inlineData?.data) {
        imageData = part.inline_data?.data || part.inlineData?.data;
        console.log(`    ✅ Found image data in inline_data`);
        break;
      }
      if (part.image_data) {
        imageData = part.image_data;
        console.log(`    ✅ Found image data in image_data`);
        break;
      }
    }
    
    if (!imageData) {
      console.log(`    📋 Full response:`, JSON.stringify(result, null, 2));
      throw new Error("No image data found in response");
    }
    
    // Save image locally (test only - not uploading to Supabase)
    const imagePath = join(__dirname, 'test-images', `nano-banana-test-${testId}-meal-${meal.id}.png`);
    await fs.mkdir(join(__dirname, 'test-images'), { recursive: true });
    const imageBuffer = Buffer.from(imageData, 'base64');
    await fs.writeFile(imagePath, imageBuffer);
    
    console.log(`    ✅ Test image saved locally: ${imagePath}`);
    
    return {
      localPath: imagePath,
      mealTitle: meal.title,
      success: true
    };
  } catch (error) {
    console.error(`    ❌ Nano Banana enhanced generation failed:`, error.message);
    throw error;
  }
}

// Test Nano Banana with enhanced negative prompts (3 meals, no database updates)
async function testNanoBananaEnhanced() {
  console.log('🍌 Testing Enhanced Nano Banana (with negative prompts) - 3 test images...\n');
  
  // Get 3 meals that still need images for testing
  const { data: meals, error } = await supabase
    .from('meals')
    .select('id, title, description, cuisines, primary_ingredient')
    .is('image_url', null)
    .order('id')
    .limit(3);
  
  if (error || !meals || meals.length === 0) {
    console.error("Error fetching test meals:", error);
    return;
  }
  
  console.log(`📋 Testing enhanced negative prompts with ${meals.length} meals:\n`);
  
  const results = [];
  
  for (let i = 0; i < meals.length; i++) {
    const meal = meals[i];
    console.log(`[${i+1}/3] Testing Enhanced: ${meal.title} (ID: ${meal.id})`);
    
    try {
      // Generate image with enhanced negative prompts
      const imageResult = await generateImageWithNanoBananaEnhanced(meal, i+1);
      
      console.log(`    ✅ Successfully generated test image`);
      console.log(`    💾 Local path: ${imageResult.localPath}`);
      results.push({ 
        success: true, 
        mealId: meal.id, 
        title: meal.title,
        localPath: imageResult.localPath
      });
      
    } catch (error) {
      console.log(`    ❌ Failed meal ${meal.id}: ${error.message}`);
      results.push({ 
        success: false, 
        mealId: meal.id, 
        title: meal.title,
        error: error.message 
      });
    }
    
    console.log(''); // Empty line for readability
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  console.log('='.repeat(60));
  console.log('🍌 ENHANCED NANO BANANA TEST RESULTS (LOCAL ONLY)');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successful}/${meals.length} test images`);
  console.log(`❌ Failed: ${meals.length - successful}/${meals.length} images\n`);
  
  if (successful > 0) {
    console.log('📸 Generated Test Images (with enhanced negative prompts):');
    results.filter(r => r.success).forEach((r, index) => {
      console.log(`  ${index + 1}. ${r.title}`);
      console.log(`     Local: ${r.localPath}`);
      console.log('');
    });
    
    console.log('🔍 Note: These are test images with enhanced negative prompts.');
    console.log('💾 Images saved locally in test-images/ directory (not uploaded to database)');
  }
  
  if (successful < meals.length) {
    console.log('❌ Failed Test Images:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  • ${r.title}: ${r.error}`);
    });
  }
  
  return results;
}

// Run the enhanced test
testNanoBananaEnhanced().catch(console.error);