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
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Model configuration
const IMAGE_MODELS = {
  nanoBanana: {
    name: 'nano-banana-gemini-2.5-flash-image-preview',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent',
    cost: 0.039,
    displayName: 'Nano Banana (Gemini 2.5 Flash Image)',
    rateLimit: 3000, // 3 seconds between requests
    retryDelay: 30000 // 30 seconds on rate limit
  },
  imagen4: {
    name: 'imagen-4.0-generate-001',
    cost: 0.04,
    displayName: 'Imagen 4',
    rateLimit: 7000, // 7 seconds between requests
    retryDelay: 60000 // 1 minute on rate limit
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const modelArg = args.find(arg => arg.startsWith('--model='));
const parallelArg = args.find(arg => arg.startsWith('--parallel='));
const selectedModel = modelArg ? modelArg.split('=')[1] : 'nanoBanana'; // Default to Nano Banana
const parallelWorkers = parallelArg ? parseInt(parallelArg.split('=')[1]) : 1;

if (!IMAGE_MODELS[selectedModel]) {
  console.error(`❌ Invalid model: ${selectedModel}. Available models: ${Object.keys(IMAGE_MODELS).join(', ')}`);
  process.exit(1);
}

const MODEL_CONFIG = IMAGE_MODELS[selectedModel];
const RETRY_ATTEMPTS = 2;

console.log(`🎨 Using ${MODEL_CONFIG.displayName} for image generation`);
console.log(`💰 Cost per image: $${MODEL_CONFIG.cost}`);
if (parallelWorkers > 1) {
  console.log(`🚀 Parallel workers: ${parallelWorkers}`);
}

// Step 1: Generate prompt from meal data (same as before)
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

**CRITICAL BAN list (negative prompt)**
* NO TEXT, NO NUMBERS, NO LABELS, NO WATERMARKS, NO METADATA
* NO technical overlays, generation parameters, seed numbers, dimensions
* Props/backgrounds (wood/stone/linen), utensils, hands, napkins, bottles, logos, multiple plates, side ramekins, patterned/colored rims, cutting boards, messy crumbs, busy shadows

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
    
    // Enhance negative prompt to prevent text overlays
    if (parsed.negative_prompt) {
      parsed.negative_prompt = `text, numbers, labels, watermarks, metadata, technical overlays, seed numbers, dimensions, generation parameters, ${parsed.negative_prompt}`;
    } else {
      parsed.negative_prompt = "text, numbers, labels, watermarks, metadata, technical overlays, seed numbers, dimensions, generation parameters, props, backgrounds, utensils, hands, napkins, bottles, logos";
    }
    
    return parsed;
  } catch (error) {
    console.error(`❌ Prompt generation failed for meal ${meal.id}:`, error.message);
    throw error;
  }
}

// Generate image using Nano Banana
async function generateImageWithNanoBanana(promptData, mealId, workerId = '', retryCount = 0) {
  try {
    const fullPrompt = `${promptData.prompt}. AVOID: ${promptData.negative_prompt}`;
    
    console.log(`    🍌${workerId} Generating image with Nano Banana...`);
    
    const response = await fetch(MODEL_CONFIG.endpoint, {
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
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Extract image data
    const candidate = result.candidates?.[0];
    const parts = candidate?.content?.parts;
    
    let imageData = null;
    
    for (const part of parts || []) {
      if (part.inline_data?.data || part.inlineData?.data) {
        imageData = part.inline_data?.data || part.inlineData?.data;
        break;
      }
      if (part.image_data) {
        imageData = part.image_data;
        break;
      }
    }
    
    if (!imageData) {
      throw new Error("No image data in response");
    }
    
    // Save image locally (backup)
    const imagePath = join(__dirname, 'generated-meal-images', `meal-${mealId}.png`);
    await fs.mkdir(join(__dirname, 'generated-meal-images'), { recursive: true });
    const imageBuffer = Buffer.from(imageData, 'base64');
    await fs.writeFile(imagePath, imageBuffer);
    
    // Upload to Supabase Storage
    const fileName = `meal-${mealId}.png`;
    const filePath = `meals/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('meal-images')
      .upload(filePath, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (uploadError) {
      console.log(`    ⚠️${workerId} Supabase upload failed, using local fallback`);
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
    if (error.message.includes('429') || error.message.includes('quota')) {
      console.log(`    ⏰${workerId} Rate limit hit, waiting...`);
      if (retryCount < RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, MODEL_CONFIG.retryDelay));
        return generateImageWithNanoBanana(promptData, mealId, workerId, retryCount + 1);
      }
    }
    
    console.error(`    ❌${workerId} Image generation failed (attempt ${retryCount + 1}):`, error.message.substring(0, 100));
    throw error;
  }
}

// Generate image using Imagen 4
async function generateImageWithImagen4(promptData, mealId, workerId = '', retryCount = 0) {
  try {
    const fullPrompt = `${promptData.prompt}. AVOID: ${promptData.negative_prompt}`;
    
    console.log(`    🎨${workerId} Generating image with Imagen 4...`);
    
    const result = await ai.models.generateImages({
      model: "imagen-4.0-generate-001",
      prompt: fullPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: "1:1",
        sampleImageSize: "2K",
        personGeneration: "dont_allow",
      },
    });
    
    const imageData = result.generatedImages?.[0]?.image?.imageBytes;
    
    if (!imageData) {
      throw new Error("No image data in response");
    }
    
    // Save image locally (backup)
    const imagePath = join(__dirname, 'generated-meal-images', `meal-${mealId}.png`);
    await fs.mkdir(join(__dirname, 'generated-meal-images'), { recursive: true });
    const imageBuffer = Buffer.from(imageData, 'base64');
    await fs.writeFile(imagePath, imageBuffer);
    
    // Upload to Supabase Storage
    const fileName = `meal-${mealId}.png`;
    const filePath = `meals/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('meal-images')
      .upload(filePath, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (uploadError) {
      console.log(`    ⚠️${workerId} Supabase upload failed, using local fallback`);
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
    if (error.message.includes('429') || error.message.includes('quota')) {
      console.log(`    ⏰${workerId} Rate limit hit, waiting...`);
      if (retryCount < RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, MODEL_CONFIG.retryDelay));
        return generateImageWithImagen4(promptData, mealId, workerId, retryCount + 1);
      }
    }
    
    console.error(`    ❌${workerId} Image generation failed (attempt ${retryCount + 1}):`, error.message.substring(0, 100));
    throw error;
  }
}

// Select the appropriate image generation function
const generateImage = selectedModel === 'nanoBanana' ? generateImageWithNanoBanana : generateImageWithImagen4;

// Process a single meal
async function processMeal(meal, workerId = '') {
  console.log(`[${workerId}] Processing: ${meal.title} (ID: ${meal.id})`);
  
  try {
    // Step 1: Generate prompt
    console.log(`    🧠${workerId} Generating prompt...`);
    const promptData = await generateImagePrompt(meal);
    
    // Step 2: Generate image
    const imageResult = await generateImage(promptData, meal.id, workerId);
    
    // Step 3: Update database
    console.log(`    💾${workerId} Updating database...`);
    const { error: updateError } = await supabase
      .from('meals')
      .update({
        image_prompt: promptData.prompt,
        image_negative_prompt: promptData.negative_prompt,
        image_url: imageResult.url,
        image_generated_at: new Date().toISOString(),
        image_generation_model: MODEL_CONFIG.name
      })
      .eq('id', meal.id);
    
    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }
    
    console.log(`    ✅${workerId} Completed meal ${meal.id}`);
    console.log(`    🔗${workerId} URL: ${imageResult.url}`);
    
    return { 
      success: true, 
      mealId: meal.id, 
      title: meal.title,
      url: imageResult.url,
      workerId 
    };
    
  } catch (error) {
    console.log(`    ❌${workerId} Failed meal ${meal.id}: ${error.message.substring(0, 100)}`);
    return { 
      success: false, 
      mealId: meal.id, 
      title: meal.title,
      error: error.message,
      workerId 
    };
  }
}

// Worker function for parallel processing
async function worker(workerMeals, workerId, startDelay = 0) {
  if (startDelay > 0) {
    console.log(`⏸️ Worker ${workerId}: Waiting ${startDelay/1000}s before starting...`);
    await new Promise(resolve => setTimeout(resolve, startDelay));
  }
  
  const results = [];
  
  for (const meal of workerMeals) {
    const result = await processMeal(meal, `Worker ${workerId}`);
    results.push(result);
    
    // Small delay between meals for the same worker
    await new Promise(resolve => setTimeout(resolve, MODEL_CONFIG.rateLimit));
  }
  
  return results;
}

// Main function
async function generateMealImagesConfigurable() {
  const startTime = Date.now();
  
  console.log(`🎨 Starting configurable meal image generation...`);
  console.log(`📋 Model: ${MODEL_CONFIG.displayName}`);
  console.log(`💰 Cost per image: $${MODEL_CONFIG.cost}`);
  console.log(`🚀 Workers: ${parallelWorkers}\n`);
  
  // Fetch meals without images
  const { data: meals, error } = await supabase
    .from('meals')
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
  
  console.log(`📋 Processing ${meals.length} meals`);
  console.log(`💰 Estimated cost: $${(meals.length * MODEL_CONFIG.cost).toFixed(2)}\n`);
  
  let allResults = [];
  
  if (parallelWorkers === 1) {
    // Sequential processing
    for (let i = 0; i < meals.length; i++) {
      const meal = meals[i];
      console.log(`[${i+1}/${meals.length}] Processing meal...`);
      
      const result = await processMeal(meal);
      allResults.push(result);
      
      // Delay between requests
      if (i < meals.length - 1) {
        console.log(`    ⏸️ Waiting ${MODEL_CONFIG.rateLimit/1000}s before next meal...`);
        await new Promise(resolve => setTimeout(resolve, MODEL_CONFIG.rateLimit));
      }
      
      console.log('');
    }
  } else {
    // Parallel processing
    const BATCH_SIZE = parallelWorkers * 3; // Process in batches
    
    for (let batchStart = 0; batchStart < meals.length; batchStart += BATCH_SIZE) {
      const batch = meals.slice(batchStart, Math.min(batchStart + BATCH_SIZE, meals.length));
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(meals.length / BATCH_SIZE);
      
      console.log(`\n🔄 Processing Batch ${batchNum}/${totalBatches} (${batch.length} meals)`);
      
      // Split batch across workers
      const workersData = [];
      for (let i = 0; i < parallelWorkers; i++) {
        workersData.push([]);
      }
      
      batch.forEach((meal, index) => {
        workersData[index % parallelWorkers].push(meal);
      });
      
      // Start workers in parallel with staggered delays
      const workerPromises = workersData.map((workerMeals, index) => {
        if (workerMeals.length === 0) return Promise.resolve([]);
        return worker(workerMeals, index + 1, index * 2000); // 2s stagger
      });
      
      // Wait for all workers to complete
      const batchResults = await Promise.all(workerPromises);
      const flatResults = batchResults.flat();
      allResults = allResults.concat(flatResults);
      
      const batchSuccess = flatResults.filter(r => r.success).length;
      console.log(`\n    ✅ Batch ${batchNum} complete: ${batchSuccess} success, ${flatResults.length - batchSuccess} failed`);
    }
  }
  
  // Final summary
  const successful = allResults.filter(r => r.success).length;
  const failed = allResults.filter(r => !r.success).length;
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  
  console.log('\n' + '='.repeat(80));
  console.log(`🎉 CONFIGURABLE IMAGE GENERATION COMPLETE`);
  console.log('='.repeat(80));
  console.log(`📋 Model: ${MODEL_CONFIG.displayName}`);
  console.log(`✅ Successful: ${successful}/${meals.length} meals`);
  console.log(`❌ Failed: ${failed}/${meals.length} meals`);
  console.log(`⏱️ Total time: ${elapsed} minutes`);
  console.log(`💰 Total cost: ~$${(successful * MODEL_CONFIG.cost).toFixed(2)}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed meals (can be retried):');
    allResults.filter(r => !r.success).slice(0, 10).forEach(r => {
      console.log(`  - ${r.title} (ID: ${r.mealId}): ${r.error.substring(0, 80)}...`);
    });
    if (failed > 10) {
      console.log(`  ... and ${failed - 10} more failed meals`);
    }
  }
  
  console.log(`\n🎨 ${MODEL_CONFIG.displayName} image generation complete!`);
}

// Show usage information
console.log(`📋 Available models: ${Object.keys(IMAGE_MODELS).join(', ')}`);
console.log(`💡 Usage examples:`);
console.log(`   node generate-meal-images-configurable.js --model=nanoBanana (default)`);
console.log(`   node generate-meal-images-configurable.js --model=imagen4`);
console.log(`   node generate-meal-images-configurable.js --model=nanoBanana --parallel=3`);
console.log(``);

// Run the generation
generateMealImagesConfigurable().catch(console.error);