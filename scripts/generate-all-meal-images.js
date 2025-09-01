import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../apps/web/.env.local') });

// Initialize Google AI with the new SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin access
);

// Configuration
const CONCURRENT_BATCHES = 3; // Number of parallel batches
const BATCH_SIZE = 3; // Meals per batch
const RETRY_ATTEMPTS = 2; // Retry failed generations

// Step 1: Generate prompt from meal data
async function generateImagePrompt(meal) {
  const systemPrompt = `You are a food photography prompt engineer. Given a meal title and description, produce a single photorealistic studio food photo prompt for image generation with the following hard constraints:

**Look/Style**
* Real food, natural textures, accurate color, photograph (not illustration/CGI/3D)
* Square 1:1, white seamless background
* White, rimless plate or bowl (choose whichever suits the dish), centered, fills most of the frame with a 12-15% white margin
* Generous full portion (restaurant plating, not sparse)
* Camera: 90° overhead unless the dish reads better at ~15-25° (e.g., tall stacks)
* Lighting: soft diffused daylight/studio, gentle highlights, slight soft under-shadow beneath plate/bowl

**Content rules**
* Finished dish only; garnishes only if cuisine-appropriate
* Include the key components named in the description (protein, main sides)

**BAN list (negative prompt)**
* Props/backgrounds (wood/stone/linen), utensils, hands, napkins, bottles, logos/text, multiple plates, side ramekins, patterned/colored rims, cutting boards, messy crumbs, busy shadows

**Output JSON**
Return ONLY a valid JSON object with this structure:
{
  "prompt": "...single concise prompt for the image model...",
  "negative_prompt": "...comma-separated negatives...",
  "plate_or_bowl": "plate|bowl"
}`;

  const userPrompt = `Meal title: ${meal.title}
Description: ${meal.description}
${meal.cuisines ? `Cuisines: ${meal.cuisines.join(', ')}` : ''}
${meal.primary_ingredient ? `Primary ingredient: ${meal.primary_ingredient}` : ''}

Return ONLY the JSON object.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "user", parts: [{ text: userPrompt }] }
      ]
    });
    
    const text = result.text ?? "";
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch (error) {
    console.error(`Error generating prompt for meal ${meal.id}:`, error.message);
    throw error;
  }
}

// Step 2: Generate image using Imagen 4 and upload to Supabase Storage
async function generateImage(promptData, mealId, retryCount = 0) {
  try {
    // Combine prompt and negative prompt for Imagen 4
    const fullPrompt = `${promptData.prompt}. AVOID: ${promptData.negative_prompt}`;
    
    const result = await ai.models.generateImages({
      model: "imagen-4.0-generate-001", // Using Imagen 4
      prompt: fullPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: "1:1",
        sampleImageSize: "2K", // High quality for food photography
        personGeneration: "dont_allow",
      },
    });
    
    const imageData = result.generatedImages?.[0]?.image?.imageBytes;
    
    if (!imageData) {
      throw new Error("No image data in response");
    }
    
    // Save image locally (backup)
    const imagePath = join(__dirname, 'generated-images', `meal-${mealId}.png`);
    await fs.mkdir(join(__dirname, 'generated-images'), { recursive: true });
    const imageBuffer = Buffer.from(imageData, 'base64');
    await fs.writeFile(imagePath, imageBuffer);
    
    // Upload to Supabase Storage
    const fileName = `meal-${mealId}.png`;
    const filePath = `meals/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('meal-images')
      .upload(filePath, imageBuffer, {
        contentType: 'image/png',
        upsert: true // Overwrite if exists
      });
    
    if (uploadError) {
      console.error(`  ⚠️ Supabase upload failed for meal ${mealId}:`, uploadError);
      // Return local path as fallback
      return {
        localPath: imagePath,
        url: `/images/meals/meal-${mealId}.png`,
        success: false
      };
    }
    
    // Get public URL from Supabase
    const { data: publicUrlData } = supabase.storage
      .from('meal-images')
      .getPublicUrl(filePath);
    
    const publicUrl = publicUrlData?.publicUrl;
    
    return {
      localPath: imagePath,
      url: publicUrl,
      storagePath: filePath,
      success: true
    };
  } catch (error) {
    console.error(`Error generating image for meal ${mealId} (attempt ${retryCount + 1}):`, error.message);
    
    if (retryCount < RETRY_ATTEMPTS) {
      console.log(`  🔄 Retrying meal ${mealId}...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      return generateImage(promptData, mealId, retryCount + 1);
    }
    
    throw error;
  }
}

// Process a single meal
async function processMeal(meal, batchIndex, mealIndex) {
  const prefix = `[B${batchIndex}:${mealIndex}]`;
  
  try {
    console.log(`${prefix} Processing: ${meal.title}`);
    
    // Step 1: Generate prompt
    const promptData = await generateImagePrompt(meal);
    console.log(`${prefix} ✓ Prompt generated`);
    
    // Step 2: Generate image
    const imageResult = await generateImage(promptData, meal.id);
    console.log(`${prefix} ✓ Image ${imageResult.success ? 'uploaded to Supabase' : 'saved locally'}`);
    
    // Step 3: Update database
    const { error: updateError } = await supabase
      .from('meal2')
      .update({
        image_prompt: promptData.prompt,
        image_negative_prompt: promptData.negative_prompt,
        image_url: imageResult.url,
        image_generated_at: new Date().toISOString(),
        image_generation_model: 'imagen-4.0-generate-001'
      })
      .eq('id', meal.id);
    
    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }
    
    console.log(`${prefix} ✅ Meal ${meal.id} completed - ${imageResult.url}`);
    return { success: true, mealId: meal.id, url: imageResult.url };
    
  } catch (error) {
    console.error(`${prefix} ❌ Failed meal ${meal.id}:`, error.message);
    return { success: false, mealId: meal.id, error: error.message };
  }
}

// Process a batch of meals
async function processBatch(meals, batchIndex) {
  console.log(`\n🚀 Starting Batch ${batchIndex} (${meals.length} meals)`);
  
  const batchPromises = meals.map((meal, index) => 
    processMeal(meal, batchIndex, index + 1)
  );
  
  const results = await Promise.all(batchPromises);
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n📊 Batch ${batchIndex} Complete: ${successful} ✅ ${failed} ❌`);
  
  return results;
}

// Main function to process all meals with parallel batching
async function processAllMeals() {
  const startTime = Date.now();
  console.log('🎨 Starting parallel meal image generation...\n');
  
  // Fetch all meals without images
  const { data: meals, error } = await supabase
    .from('meal2')
    .select('id, title, description, cuisines, primary_ingredient')
    .is('image_url', null)
    .order('id');
  
  if (error) {
    console.error("Error fetching meals:", error);
    return;
  }
  
  if (!meals || meals.length === 0) {
    console.log("✨ All meals already have images!");
    return;
  }
  
  console.log(`📋 Found ${meals.length} meals to process`);
  console.log(`⚡ Using ${CONCURRENT_BATCHES} parallel batches of ${BATCH_SIZE} meals each`);
  console.log(`💰 Estimated cost: $${(meals.length * 0.04).toFixed(2)}`);
  console.log(`⏱️  Estimated time: ${Math.ceil(meals.length / (CONCURRENT_BATCHES * BATCH_SIZE))} minutes\n`);
  
  // Split meals into batches
  const batches = [];
  for (let i = 0; i < meals.length; i += BATCH_SIZE) {
    batches.push(meals.slice(i, i + BATCH_SIZE));
  }
  
  // Process batches in parallel groups
  const allResults = [];
  
  for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
    const currentBatches = batches.slice(i, i + CONCURRENT_BATCHES);
    
    const batchPromises = currentBatches.map((batch, index) => 
      processBatch(batch, i + index + 1)
    );
    
    const batchResults = await Promise.all(batchPromises);
    allResults.push(...batchResults.flat());
    
    // Small delay between batch groups to avoid overwhelming APIs
    if (i + CONCURRENT_BATCHES < batches.length) {
      console.log('\n⏸️  Brief pause before next batch group...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Final summary
  const successful = allResults.filter(r => r.success).length;
  const failed = allResults.filter(r => !r.success).length;
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 FINAL RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Successful: ${successful}/${meals.length} meals`);
  console.log(`❌ Failed: ${failed}/${meals.length} meals`);
  console.log(`⏱️  Total time: ${elapsed} minutes`);
  console.log(`💰 Actual cost: ~$${(successful * 0.04).toFixed(2)}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed meals:');
    allResults.filter(r => !r.success).forEach(r => {
      console.log(`  - Meal ${r.mealId}: ${r.error}`);
    });
  }
  
  console.log('\n🚀 Run the script again to retry any failed meals!');
}

// Run the script
processAllMeals().catch(console.error);