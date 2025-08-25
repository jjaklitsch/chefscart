#!/usr/bin/env node

/**
 * Test Image Generation with Direct Supabase Data
 */

const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const { withBackoff } = require('./retry');

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Generate improved prompt that distinguishes visible vs ingredient list
 */
function generateImprovedPrompt(meal) {
  const { title, description, primary_ingredient, cuisines, ingredients_json } = meal;
  
  // Parse visible ingredients vs preparation ingredients
  const visibleIngredients = [];
  const hiddenIngredients = [];
  
  ingredients_json.ingredients.forEach(ing => {
    const name = ing.display_name.toLowerCase();
    
    // Items typically not visible in final dish
    if (name.includes('egg yolk') || // For dressings
        name.includes('olive oil') || // For cooking/dressing
        name.includes('vinegar') ||
        name.includes('mustard') ||
        name.includes('salt') ||
        name.includes('pepper') ||
        name.includes('butter') ||
        name.includes('oil') && !name.includes('sesame')) {
      hiddenIngredients.push(ing);
    } else {
      // Clean up display names for visible ingredients
      const cleanName = ing.display_name
        .replace(/\(.*?\)/g, '') // Remove parenthetical notes
        .replace(/,.*$/, '') // Remove everything after comma
        .trim();
      visibleIngredients.push(cleanName);
    }
  });
  
  // Determine dishware
  const isBowl = title.toLowerCase().includes('bowl') || 
                 description.toLowerCase().includes('soup') ||
                 description.toLowerCase().includes('curry') ||
                 description.toLowerCase().includes('stew');
  
  const dishware = isBowl ? 'white ceramic bowl' : 'white ceramic plate';
  
  // Get cuisine-specific presentation
  const cuisineStyle = {
    'american': 'classic American restaurant style',
    'italian': 'elegant Italian trattoria style',
    'mexican': 'vibrant Mexican cantina style',
    'asian': 'refined Asian restaurant style',
    'japanese': 'precise Japanese kaiseki style',
    'mediterranean': 'rustic Mediterranean bistro style',
    'french': 'sophisticated French bistro style'
  };
  
  const style = cuisineStyle[cuisines[0]] || 'elegant restaurant style';
  
  // Build the prompt
  const prompt = `Professional food photography of "${title}" for a restaurant menu.

CRITICAL REQUIREMENTS:
- Show ENTIRE ${dishware} fully in frame with white space margins
- Pure white seamless background only
- Top-down overhead shot
- NO cropping of plate edges

VISIBLE INGREDIENTS ONLY:
${visibleIngredients.slice(0, 6).join(', ')}

PRESENTATION:
${description.split('.')[0]}. Arranged in ${style} with generous restaurant portions. Fresh, colorful, appetizing.

IMPORTANT: Do NOT show these preparation ingredients as separate items: raw eggs, oil bottles, mustard jars, or any condiment containers. Only show the finished, plated dish.

STYLE: Clean commercial food photography, bright even lighting, no shadows, high resolution.`;

  return { prompt, visibleIngredients, hiddenIngredients };
}

/**
 * Test with specific meals from database
 */
async function testMeals() {
  console.log('🧪 Testing Improved Image Generation\n');
  
  // Get the 3 test meals from database
  const testSlugs = [
    'grilled-chicken-caesar-salad',
    'low-carb-baked-cod-with-ratatouille', 
    'nioise-salad-bowl'
  ];
  
  for (const slug of testSlugs) {
    console.log(`\n📊 Analyzing: ${slug}`);
    console.log('='.repeat(50));
    
    const { data: meal, error } = await supabase
      .from('meals')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error || !meal) {
      console.log(`❌ Meal not found: ${slug}`);
      continue;
    }
    
    const { prompt, visibleIngredients, hiddenIngredients } = generateImprovedPrompt(meal);
    
    console.log(`\n📝 ${meal.title}`);
    console.log('\n👁️ VISIBLE on plate:');
    visibleIngredients.forEach(ing => console.log(`   ✓ ${ing}`));
    
    console.log('\n🔒 HIDDEN (in preparation):');
    hiddenIngredients.forEach(ing => console.log(`   - ${ing.display_name}`));
    
    console.log('\n💬 PROMPT:');
    console.log(prompt);
    
    // Generate if requested
    if (process.argv.includes('--generate')) {
      console.log('\n🎨 Generating image...');
      
      try {
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1024",
          quality: "hd",
          style: "natural"
        });
        
        const imageUrl = response.data[0].url;
        console.log(`✅ Generated: ${imageUrl}`);
        
        // Upload to Supabase
        const https = require('https');
        const imageBuffer = await new Promise((resolve, reject) => {
          https.get(imageUrl, (response) => {
            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
          });
        });
        
        const fileName = `${slug}-v2.png`;
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
        console.error(`❌ Failed: ${error.message}`);
      }
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n✅ Analysis complete!');
  console.log('Add --generate flag to create images');
}

testMeals().catch(console.error);