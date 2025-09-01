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
    console.error("Error generating prompt:", error);
    throw error;
  }
}

// Step 2: Generate image using Imagen 4 and upload to Supabase Storage
async function generateImage(promptData, mealId) {
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
    console.log(`  ✓ Image saved locally: ${imagePath}`);
    
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
      console.error("  ⚠️ Supabase upload failed:", uploadError);
      // Return local path as fallback
      return {
        localPath: imagePath,
        url: `/images/meals/meal-${mealId}.png`
      };
    }
    
    // Get public URL from Supabase
    const { data: publicUrlData } = supabase.storage
      .from('meal-images')
      .getPublicUrl(filePath);
    
    const publicUrl = publicUrlData?.publicUrl;
    console.log(`  ✓ Image uploaded to Supabase: ${publicUrl}`);
    
    return {
      localPath: imagePath,
      url: publicUrl,
      storagePath: filePath
    };
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
}

// Alternative Step 2: Use text-to-image with Gemini (if Imagen not available)
async function generateImageWithGemini(promptData, mealId) {
  // Note: Gemini doesn't directly generate images, but can work with image generation APIs
  // This is a placeholder for integration with external image generation services
  
  // For now, we'll store the prompt and mark it for external generation
  return {
    url: null,
    prompt: promptData.prompt,
    negative_prompt: promptData.negative_prompt,
    status: 'pending_external_generation'
  };
}

// Main function to process meals
async function processMeals(limit = 2) {
  console.log(`Starting image generation for ${limit} meals...`);
  
  // Fetch meals from meal2 table that don't have images yet
  const { data: meals, error } = await supabase
    .from('meal2')
    .select('id, title, description, cuisines, primary_ingredient')
    .is('image_url', null)
    .limit(limit);
  
  if (error) {
    console.error("Error fetching meals:", error);
    return;
  }
  
  if (!meals || meals.length === 0) {
    console.log("No meals found that need images");
    return;
  }
  
  console.log(`Found ${meals.length} meals to process`);
  
  for (const meal of meals) {
    console.log(`\nProcessing: ${meal.title}`);
    
    try {
      // Step 1: Generate prompt
      console.log("  Step 1: Generating prompt...");
      const promptData = await generateImagePrompt(meal);
      console.log("  Prompt generated:", promptData.prompt.substring(0, 100) + "...");
      
      // Step 2: Generate image with Imagen
      console.log("  Step 2: Generating image with Imagen...");
      const imageResult = await generateImage(promptData, meal.id);
      
      // Update database with prompt and image URL
      const { error: updateError } = await supabase
        .from('meal2')
        .update({
          image_prompt: promptData.prompt,
          image_negative_prompt: promptData.negative_prompt,
          image_url: imageResult.url,
          image_generated_at: new Date().toISOString(),
          image_generation_model: 'imagen-4.0-generate-001' // Imagen 4 model
        })
        .eq('id', meal.id);
      
      if (updateError) {
        console.error(`  Error updating meal ${meal.id}:`, updateError);
      } else {
        console.log(`  ✓ Meal ${meal.id} updated successfully`);
        console.log(`    Prompt stored: ${promptData.prompt.substring(0, 50)}...`);
        if (imageResult.url) {
          console.log(`    Image URL: ${imageResult.url}`);
        } else {
          console.log(`    Image generation pending (prompt saved for external processing)`);
        }
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`  Error processing meal ${meal.id}:`, error.message);
    }
  }
  
  console.log("\n✅ Processing complete!");
  
  // Summary
  const { count } = await supabase
    .from('meal2')
    .select('*', { count: 'exact', head: true })
    .not('image_prompt', 'is', null);
  
  console.log(`\nSummary: ${count} meals now have prompts generated`);
}

// Run the script
processMeals(2).catch(console.error);