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

// Enhanced prompt generation with stronger anti-text prompting
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
  "negative_prompt": "...comma-separated negatives including NO TEXT, NO NUMBERS, NO LABELS...",
  "plate_or_bowl": "plate|bowl"
}`;

  const userPrompt = `Meal title: ${meal.title}
Description: ${meal.description}
${meal.cuisines ? `Cuisines: ${meal.cuisines.join(', ')}` : ''}
${meal.primary_ingredient ? `Primary ingredient: ${meal.primary_ingredient}` : ''}

IMPORTANT: This meal previously generated with unwanted text overlays. Ensure the negative prompt strongly prevents ANY text, numbers, labels, or technical metadata.

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
    console.error(`Error generating prompt for meal ${meal.id}:`, error.message);
    throw error;
  }
}

// Generate image using Imagen 4
async function generateImage(promptData, mealId) {
  try {
    // Combine prompt and enhanced negative prompt for Imagen 4
    const fullPrompt = `${promptData.prompt}. AVOID: ${promptData.negative_prompt}`;
    
    console.log(`    🎨 Generating image with enhanced anti-text prompting...`);
    console.log(`    📝 Negative prompt: ${promptData.negative_prompt.substring(0, 100)}...`);
    
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
    const imagePath = join(__dirname, 'generated-images', `meal-${mealId}-regenerated.png`);
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
    console.error(`    ❌ Image generation failed:`, error.message);
    throw error;
  }
}

// Regenerate a specific meal
async function regenerateMeal(mealId) {
  console.log(`🔄 Regenerating meal ${mealId}...`);
  
  // Fetch meal data
  const { data: meal, error } = await supabase
    .from('meals')
    .select('id, title, description, cuisines, primary_ingredient')
    .eq('id', mealId)
    .single();
  
  if (error || !meal) {
    console.error("Error fetching meal:", error);
    return;
  }
  
  console.log(`📋 Processing: ${meal.title}`);
  
  try {
    // Step 1: Generate enhanced prompt
    console.log(`    🧠 Generating enhanced prompt with anti-text measures...`);
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
        image_generation_model: 'imagen-4.0-generate-001'
      })
      .eq('id', meal.id);
    
    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }
    
    console.log(`    ✅ Successfully regenerated meal ${meal.id}`);
    console.log(`    🔗 New URL: ${imageResult.url}`);
    console.log(`    💾 Local backup: ${imageResult.localPath}`);
    
  } catch (error) {
    console.log(`    ❌ Failed to regenerate meal ${meal.id}: ${error.message}`);
  }
}

// Run regeneration for meal 57
regenerateMeal(57).catch(console.error);