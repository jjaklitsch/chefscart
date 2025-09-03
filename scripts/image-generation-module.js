/**
 * ChefsCart Image Generation Module
 * 
 * Separate module for generating meal images that can be imported by other scripts.
 * Supports both Nano Banana (default) and Imagen 4.
 */

import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables if not already loaded
if (!process.env.GEMINI_API_KEY) {
  dotenv.config({ path: join(__dirname, '../apps/web/.env.local') });
}

// Initialize Google AI
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
    retryDelay: 30000
  },
  imagen4: {
    name: 'imagen-4.0-generate-001',
    cost: 0.04,
    displayName: 'Imagen 4',
    retryDelay: 60000
  }
};

const RETRY_ATTEMPTS = 2;

/**
 * Generate image prompt from meal data
 */
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

/**
 * Generate image using Nano Banana
 */
async function generateImageWithNanoBanana(promptData, mealId, retryCount = 0) {
  try {
    const fullPrompt = `${promptData.prompt}. AVOID: ${promptData.negative_prompt}`;
    
    console.log(`    🍌 Generating image with Nano Banana...`);
    
    const response = await fetch(IMAGE_MODELS.nanoBanana.endpoint, {
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
    
    return Buffer.from(imageData, 'base64');
  } catch (error) {
    if (error.message.includes('429') || error.message.includes('quota')) {
      console.log(`    ⏰ Rate limit hit, waiting...`);
      if (retryCount < RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, IMAGE_MODELS.nanoBanana.retryDelay));
        return generateImageWithNanoBanana(promptData, mealId, retryCount + 1);
      }
    }
    
    console.error(`    ❌ Image generation failed (attempt ${retryCount + 1}):`, error.message.substring(0, 100));
    throw error;
  }
}

/**
 * Generate image using Imagen 4
 */
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
    
    return Buffer.from(imageData, 'base64');
  } catch (error) {
    if (error.message.includes('429') || error.message.includes('quota')) {
      console.log(`    ⏰ Rate limit hit, waiting...`);
      if (retryCount < RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, IMAGE_MODELS.imagen4.retryDelay));
        return generateImageWithImagen4(promptData, mealId, retryCount + 1);
      }
    }
    
    console.error(`    ❌ Image generation failed (attempt ${retryCount + 1}):`, error.message.substring(0, 100));
    throw error;
  }
}

/**
 * Upload image to Supabase storage
 */
async function uploadImageToSupabase(imageBuffer, mealId) {
  try {
    const fileName = `meal-${mealId}.png`;
    const filePath = `meals/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('meal-images')
      .upload(filePath, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (uploadError) {
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }
    
    // Get public URL from Supabase
    const { data: publicUrlData } = supabase.storage
      .from('meal-images')
      .getPublicUrl(filePath);
    
    return {
      url: publicUrlData?.publicUrl,
      storagePath: filePath,
      success: true
    };
  } catch (error) {
    console.error(`❌ Upload failed:`, error.message);
    return {
      url: null,
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate and save image for a meal
 * 
 * @param {Object} meal - Meal object with id, title, description, etc.
 * @param {String} modelType - 'nanoBanana' (default) or 'imagen4'
 * @param {String} saveDirectory - Directory to save local backup (optional)
 * @returns {Object} - Result with success, url, localPath
 */
export async function generateMealImage(meal, modelType = 'nanoBanana', saveDirectory = null) {
  const MODEL_CONFIG = IMAGE_MODELS[modelType];
  if (!MODEL_CONFIG) {
    throw new Error(`Invalid model type: ${modelType}. Available: ${Object.keys(IMAGE_MODELS).join(', ')}`);
  }
  
  console.log(`🎨 Generating image for: ${meal.title} (ID: ${meal.id})`);
  console.log(`🤖 Using: ${MODEL_CONFIG.displayName}`);
  
  try {
    // Step 1: Generate prompt
    console.log(`    🧠 Generating image prompt...`);
    const promptData = await generateImagePrompt(meal);
    
    // Step 2: Generate image
    const generateImageFn = modelType === 'nanoBanana' ? generateImageWithNanoBanana : generateImageWithImagen4;
    const imageBuffer = await generateImageFn(promptData, meal.id);
    
    // Step 3: Save local backup if directory specified
    let localPath = null;
    if (saveDirectory) {
      try {
        await fs.mkdir(saveDirectory, { recursive: true });
        localPath = join(saveDirectory, `meal-${meal.id}.png`);
        await fs.writeFile(localPath, imageBuffer);
        console.log(`    💾 Local backup saved: ${localPath}`);
      } catch (error) {
        console.warn(`    ⚠️ Failed to save local backup: ${error.message}`);
      }
    }
    
    // Step 4: Upload to Supabase
    console.log(`    ☁️ Uploading to Supabase...`);
    const uploadResult = await uploadImageToSupabase(imageBuffer, meal.id);
    
    if (!uploadResult.success) {
      throw new Error(uploadResult.error);
    }
    
    console.log(`    ✅ Image generated successfully!`);
    console.log(`    🔗 URL: ${uploadResult.url}`);
    
    return {
      success: true,
      url: uploadResult.url,
      localPath: localPath,
      storagePath: uploadResult.storagePath,
      model: MODEL_CONFIG.name,
      prompt: promptData.prompt,
      negativePrompt: promptData.negative_prompt,
      cost: MODEL_CONFIG.cost
    };
    
  } catch (error) {
    console.error(`    ❌ Image generation failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      model: MODEL_CONFIG.name
    };
  }
}

/**
 * Update meal record with image information
 */
export async function updateMealWithImageData(mealId, imageResult) {
  if (!imageResult.success) {
    return { success: false, error: 'Image generation failed' };
  }
  
  try {
    const { error } = await supabase
      .from('meals')
      .update({
        image_prompt: imageResult.prompt,
        image_negative_prompt: imageResult.negativePrompt,
        image_url: imageResult.url,
        image_generated_at: new Date().toISOString(),
        image_generation_model: imageResult.model
      })
      .eq('id', mealId);
    
    if (error) {
      throw new Error(`Database update failed: ${error.message}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to update meal ${mealId} with image data:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Generate image for a meal and update database
 * 
 * @param {Object} meal - Meal object
 * @param {String} modelType - 'nanoBanana' (default) or 'imagen4'
 * @param {String} saveDirectory - Directory for local backups
 * @returns {Object} - Complete result
 */
export async function generateAndSaveMealImage(meal, modelType = 'nanoBanana', saveDirectory = null) {
  const imageResult = await generateMealImage(meal, modelType, saveDirectory);
  
  if (imageResult.success) {
    const updateResult = await updateMealWithImageData(meal.id, imageResult);
    return {
      ...imageResult,
      databaseUpdate: updateResult
    };
  }
  
  return imageResult;
}

export { IMAGE_MODELS };