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

// Configuration for rate limiting (9 requests/minute to stay under 10/minute limit)
const RATE_LIMIT_DELAY = 7000; // 7 seconds between requests = ~8.5 requests/minute
const RETRY_ATTEMPTS = 2;

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

// Step 2: Generate image using Imagen 4 with rate limiting
async function generateImage(promptData, mealId, retryCount = 0) {
  try {
    // Combine prompt and negative prompt for Imagen 4
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
      console.log(`    ⏰ Rate limit hit, waiting longer...`);
      if (retryCount < RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute on rate limit
        return generateImage(promptData, mealId, retryCount + 1);
      }
    }
    
    console.error(`    ❌ Image generation failed (attempt ${retryCount + 1}):`, error.message.substring(0, 100));
    throw error;
  }
}

// Process meals sequentially with rate limiting
async function processRemainingMeals() {
  const startTime = Date.now();
  console.log('🎨 Starting rate-limited meal image generation...\n');
  
  // Fetch meals without images
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
  
  console.log(`📋 Processing ${meals.length} remaining meals`);
  console.log(`⏱️ Rate limit: 1 image every ${RATE_LIMIT_DELAY/1000} seconds`);
  console.log(`⌛ Estimated time: ${Math.ceil((meals.length * RATE_LIMIT_DELAY) / 1000 / 60)} minutes`);
  console.log(`💰 Estimated cost: $${(meals.length * 0.04).toFixed(2)}\n`);
  
  const results = [];
  
  for (let i = 0; i < meals.length; i++) {
    const meal = meals[i];
    console.log(`[${i+1}/${meals.length}] Processing: ${meal.title}`);
    
    try {
      // Step 1: Generate prompt
      console.log(`    🧠 Generating prompt with Gemini...`);
      const promptData = await generateImagePrompt(meal);
      
      // Step 2: Generate image with rate limiting
      const imageResult = await generateImage(promptData, meal.id);
      
      // Step 3: Update database
      console.log(`    💾 Updating database...`);
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
      
      console.log(`    ✅ Completed meal ${meal.id}`);
      console.log(`    🔗 URL: ${imageResult.url}`);
      results.push({ success: true, mealId: meal.id, url: imageResult.url });
      
    } catch (error) {
      console.log(`    ❌ Failed meal ${meal.id}: ${error.message.substring(0, 100)}`);
      results.push({ success: false, mealId: meal.id, error: error.message });
    }
    
    // Rate limiting delay (except for last item)
    if (i < meals.length - 1) {
      console.log(`    ⏸️ Waiting ${RATE_LIMIT_DELAY/1000}s for rate limit...`);
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
    
    console.log(''); // Empty line for readability
  }
  
  // Final summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  
  console.log('='.repeat(50));
  console.log('🎉 PROCESSING COMPLETE');
  console.log('='.repeat(50));
  console.log(`✅ Successful: ${successful}/${meals.length} meals`);
  console.log(`❌ Failed: ${failed}/${meals.length} meals`);
  console.log(`⏱️ Total time: ${elapsed} minutes`);
  console.log(`💰 Actual cost: ~$${(successful * 0.04).toFixed(2)}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed meals (run script again to retry):');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - Meal ${r.mealId}: ${r.error.substring(0, 100)}`);
    });
  }
  
  // Show total progress
  const { count: totalCompleted } = await supabase
    .from('meal2')
    .select('*', { count: 'exact', head: true })
    .not('image_url', 'is', null);
  
  const { count: totalRemaining } = await supabase
    .from('meal2')
    .select('*', { count: 'exact', head: true })
    .is('image_url', null);
  
  console.log(`\n📊 OVERALL PROGRESS:`);
  console.log(`✅ Total completed: ${totalCompleted} images`);
  console.log(`⏳ Total remaining: ${totalRemaining} meals`);
  console.log(`📈 Progress: ${((totalCompleted / (totalCompleted + totalRemaining)) * 100).toFixed(1)}%`);
}

// Run the script
processRemainingMeals().catch(console.error);