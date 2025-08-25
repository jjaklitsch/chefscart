#!/usr/bin/env node

/**
 * Test Image Generation with Actual Supabase Data
 * Deep analysis of what makes a photorealistic food image
 */

const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Analyze meal data and create photorealistic prompt
 */
function createPhotorealisticPrompt(meal) {
  const { title, description, ingredients_json } = meal;
  
  // Extract key visible components from ingredients
  // Focus on the main, visually distinctive ingredients
  const keyIngredients = ingredients_json.ingredients
    .filter(ing => {
      const name = ing.display_name.toLowerCase();
      // Skip dressing/sauce components and seasonings
      return !name.includes('oil') && 
             !name.includes('vinegar') && 
             !name.includes('mustard') &&
             !name.includes('salt') &&
             !name.includes('pepper') &&
             !name.includes('butter') &&
             !name.includes('yolk') &&
             !name.includes('worcestershire') &&
             !name.includes('anchovy fillet') && // in dressing
             !name.includes('garlic') && // usually minced
             !name.includes('wine');
    })
    .slice(0, 8) // Get main visible ingredients
    .map(ing => {
      // Clean up the name for clarity
      let name = ing.display_name
        .replace(/\(.*?\)/g, '') // Remove parenthetical
        .replace(/,.*$/, '') // Remove after comma
        .trim();
      
      // Special handling for key ingredients
      if (name.includes('mixed salad greens') || name.includes('romaine')) {
        return 'fresh crisp lettuce';
      }
      if (name.includes('egg') && !name.includes('yolk')) {
        return 'hard-boiled eggs';
      }
      
      return name;
    });

  // Build a more specific, photorealistic prompt
  const prompt = `Ultra-photorealistic food photography: ${title}

EXACT DISH COMPOSITION:
${description}

KEY VISIBLE INGREDIENTS that MUST appear:
${keyIngredients.join(', ')}

PHOTOGRAPHY SPECIFICATIONS:
- Camera: Professional DSLR food photography, NOT AI-generated art
- Angle: Directly overhead (top-down flat lay)
- Lighting: Natural daylight, soft shadows, highlight textures
- Background: Pure white seamless backdrop
- Framing: ENTIRE plate/bowl visible with white margin
- Style: Authentic restaurant presentation, generous portion
- Quality: Photorealistic textures - you should see the grain of the lettuce, the sear marks on proteins, the glisten of dressings
- Plating: Natural, slightly imperfect arrangement as a chef would plate it

CRITICAL: This must look like a REAL PHOTOGRAPH taken by a food photographer, not a computer-generated image. Show natural imperfections, realistic textures, and authentic food presentation.`;

  return { prompt, keyIngredients };
}

/**
 * Test with specific meals from Supabase
 */
async function testWithSupabaseData() {
  console.log('🔬 Deep Analysis: Photorealistic Food Image Generation\n');
  
  // Test with the 3 meals
  const testSlugs = [
    'grilled-chicken-caesar-salad',
    'low-carb-baked-cod-with-ratatouille',
    'nioise-salad-bowl'
  ];
  
  for (const slug of testSlugs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Analyzing: ${slug}`);
    console.log('='.repeat(60));
    
    // Fetch from Supabase
    const { data: meal, error } = await supabase
      .from('meals')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error || !meal) {
      console.error(`❌ Failed to fetch: ${slug}`);
      continue;
    }
    
    console.log(`\n📋 Meal: ${meal.title}`);
    console.log(`📝 Description: ${meal.description}\n`);
    
    // Check current ingredients to debug missing items
    console.log('🥗 All Ingredients in Database:');
    meal.ingredients_json.ingredients.forEach((ing, i) => {
      console.log(`   ${i+1}. ${ing.display_name} (${ing.quantity} ${ing.unit})`);
    });
    
    const { prompt, keyIngredients } = createPhotorealisticPrompt(meal);
    
    console.log('\n🎯 Key Visible Ingredients Extracted:');
    keyIngredients.forEach(ing => console.log(`   ✓ ${ing}`));
    
    console.log('\n💬 PHOTOREALISTIC PROMPT:');
    console.log(prompt);
    
    // Generate if flag is passed
    if (process.argv.includes('--generate')) {
      console.log('\n🎨 Generating photorealistic image...');
      
      try {
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1024",
          quality: "hd",
          style: "natural" // Natural style for photorealism
        });
        
        const imageUrl = response.data[0].url;
        console.log(`✅ Generated: ${imageUrl}`);
        
        // Save with v3 suffix for testing
        const https = require('https');
        const imageBuffer = await new Promise((resolve, reject) => {
          https.get(imageUrl, (response) => {
            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
          });
        });
        
        const fileName = `${slug}-v3.png`;
        const { data, error: uploadError } = await supabase.storage
          .from('meal-images')
          .upload(fileName, imageBuffer, {
            contentType: 'image/png',
            upsert: true
          });
        
        if (!uploadError) {
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/meal-images/${fileName}`;
          console.log(`📸 Saved: ${publicUrl}`);
        }
        
      } catch (error) {
        console.error(`❌ Generation failed: ${error.message}`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Analysis complete!');
  console.log('Add --generate flag to create test images');
}

// Run the test
testWithSupabaseData().catch(console.error);