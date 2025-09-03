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

// Configuration
const RETRY_ATTEMPTS = 2;
const DELAY_BETWEEN_REQUESTS = 3000; // 3 seconds

// Model configuration
const IMAGE_MODELS = {
  nanoBanana: {
    name: 'nano-banana-gemini-2.5-flash-image-preview',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent',
    cost: 0.039,
    displayName: 'Nano Banana (Gemini 2.5 Flash Image)'
  },
  imagen4: {
    name: 'imagen-4.0-generate-001',
    cost: 0.04,
    displayName: 'Imagen 4'
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const modelArg = args.find(arg => arg.startsWith('--model='));
const selectedModel = modelArg ? modelArg.split('=')[1] : 'nanoBanana'; // Default to Nano Banana

if (!IMAGE_MODELS[selectedModel]) {
  console.error(`❌ Invalid model: ${selectedModel}. Available models: ${Object.keys(IMAGE_MODELS).join(', ')}`);
  process.exit(1);
}

const MODEL_CONFIG = IMAGE_MODELS[selectedModel];

console.log(`🎨 Using ${MODEL_CONFIG.displayName} for image generation`);
console.log(`💰 Cost per image: $${MODEL_CONFIG.cost}`);

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

IMPORTANT: This meal needs a fresh, high-quality image to replace an existing one. Ensure the negative prompt strongly prevents ANY text, numbers, labels, or technical metadata.

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

// Step 2: Generate image using Nano Banana
async function generateImageWithNanoBanana(promptData, mealId, retryCount = 0) {
  try {
    const fullPrompt = `${promptData.prompt}. AVOID: ${promptData.negative_prompt}`;
    
    console.log(`    🍌 Generating image with Nano Banana...`);
    
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
    const imagePath = join(__dirname, 'regenerated-images', `meal-${mealId}-regenerated.png`);
    await fs.mkdir(join(__dirname, 'regenerated-images'), { recursive: true });
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
      console.log(`    ⚠️ Supabase upload failed, using local fallback`);
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
      console.log(`    ⏰ Rate limit hit, waiting...`);
      if (retryCount < RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
        return generateImageWithNanoBanana(promptData, mealId, retryCount + 1);
      }
    }
    
    console.error(`    ❌ Image generation failed (attempt ${retryCount + 1}):`, error.message.substring(0, 100));
    throw error;
  }
}

// Step 2: Generate image using Imagen 4
async function generateImageWithImagen4(promptData, mealId, retryCount = 0) {
  try {
    const fullPrompt = `${promptData.prompt}. AVOID: ${promptData.negative_prompt}`;
    
    console.log(`    🎨 Generating image with Imagen 4...`);
    
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
    const imagePath = join(__dirname, 'regenerated-images', `meal-${mealId}-regenerated.png`);
    await fs.mkdir(join(__dirname, 'regenerated-images'), { recursive: true });
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
      console.log(`    ⚠️ Supabase upload failed, using local fallback`);
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
      console.log(`    ⏰ Rate limit hit, waiting...`);
      if (retryCount < RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
        return generateImageWithImagen4(promptData, mealId, retryCount + 1);
      }
    }
    
    console.error(`    ❌ Image generation failed (attempt ${retryCount + 1}):`, error.message.substring(0, 100));
    throw error;
  }
}

// Select the appropriate image generation function
const generateImage = selectedModel === 'nanoBanana' ? generateImageWithNanoBanana : generateImageWithImagen4;

// Process a single meal regeneration
async function regenerateMeal(meal) {
  console.log(`🔄 Regenerating: ${meal.title} (ID: ${meal.id})`);
  
  try {
    // Step 1: Generate enhanced prompt
    console.log(`    🧠 Generating enhanced prompt...`);
    const promptData = await generateImagePrompt(meal);
    
    // Step 2: Generate image
    const imageResult = await generateImage(promptData, meal.id);
    
    // Step 3: Update database
    console.log(`    💾 Updating database...`);
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
    
    console.log(`    ✅ Successfully regenerated meal ${meal.id}`);
    console.log(`    🔗 New URL: ${imageResult.url}`);
    console.log(`    💾 Local backup: ${imageResult.localPath}`);
    
    return { success: true, mealId: meal.id, title: meal.title, url: imageResult.url };
    
  } catch (error) {
    console.log(`    ❌ Failed to regenerate meal ${meal.id}: ${error.message}`);
    return { success: false, mealId: meal.id, title: meal.title, error: error.message };
  }
}

// Main regeneration function
async function regenerateSpecificMeals() {
  const startTime = Date.now();
  
  console.log(`🔄 Starting meal image regeneration with ${MODEL_CONFIG.displayName}...`);
  console.log(`💰 Cost per image: $${MODEL_CONFIG.cost}\n`);
  
  // Load meal IDs from the JSON file
  let mealData;
  try {
    const fileContent = await fs.readFile(join(__dirname, 'meals-to-regenerate.json'), 'utf8');
    mealData = JSON.parse(fileContent);
  } catch (error) {
    console.error('❌ Could not load meals-to-regenerate.json. Run find-meals-to-regenerate.js first.');
    return;
  }
  
  const mealIds = mealData.ids;
  
  if (!mealIds || mealIds.length === 0) {
    console.log('❌ No meal IDs found for regeneration');
    return;
  }
  
  // Fetch meal data from database
  const { data: meals, error } = await supabase
    .from('meals')
    .select('id, title, description, cuisines, primary_ingredient')
    .in('id', mealIds);
  
  if (error || !meals) {
    console.error('❌ Error fetching meals:', error);
    return;
  }
  
  console.log(`📋 Regenerating ${meals.length} meals with ${MODEL_CONFIG.displayName}`);
  console.log(`💰 Estimated cost: $${(meals.length * MODEL_CONFIG.cost).toFixed(2)}\n`);
  
  const results = [];
  
  for (let i = 0; i < meals.length; i++) {
    const meal = meals[i];
    console.log(`[${i+1}/${meals.length}] Processing meal...`);
    
    const result = await regenerateMeal(meal);
    results.push(result);
    
    // Delay between requests to avoid rate limits
    if (i < meals.length - 1) {
      console.log(`    ⏸️ Waiting ${DELAY_BETWEEN_REQUESTS/1000}s before next meal...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    }
    
    console.log(''); // Empty line for readability
  }
  
  // Final summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  
  console.log('='.repeat(70));
  console.log(`🎉 MEAL IMAGE REGENERATION COMPLETE (${MODEL_CONFIG.displayName})`);
  console.log('='.repeat(70));
  console.log(`✅ Successful: ${successful}/${meals.length} meals`);
  console.log(`❌ Failed: ${failed}/${meals.length} meals`);
  console.log(`⏱️ Total time: ${elapsed} minutes`);
  console.log(`💰 Actual cost: ~$${(successful * MODEL_CONFIG.cost).toFixed(2)}`);
  
  if (successful > 0) {
    console.log(`\n📸 Successfully Regenerated Images:`);
    results.filter(r => r.success).forEach((r, index) => {
      console.log(`  ${index + 1}. ${r.title} (ID: ${r.mealId})`);
      console.log(`     URL: ${r.url}`);
    });
  }
  
  if (failed > 0) {
    console.log(`\n❌ Failed Regenerations:`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`  • ${r.title}: ${r.error.substring(0, 100)}`);
    });
  }
  
  console.log(`\n🔄 All meal images regenerated with ${MODEL_CONFIG.displayName}!`);
}

// Run the regeneration
console.log(`📋 Available models: ${Object.keys(IMAGE_MODELS).join(', ')}`);
console.log(`💡 Usage: node regenerate-meal-images.js --model=nanoBanana (default) or --model=imagen4\n`);

regenerateSpecificMeals().catch(console.error);