#!/usr/bin/env node

/**
 * Enhanced ChefsCart Meal Image Generator with Reference Style Analysis
 * 
 * Uses GPT-4V to analyze reference images and create consistent style prompts
 * for DALL-E 3 meal image generation.
 */

const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');

// Simple retry utility
const withBackoff = async (fn, options = {}) => {
  const { tries = 3, base = 1000, shouldRetry = () => true } = options;
  
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === tries - 1 || !shouldRetry(error)) {
        throw error;
      }
      const delay = base * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Reference image paths from the homepage
 */
const REFERENCE_IMAGES = [
  '/Users/jonathanjaklitsch/Desktop/Screenshot 2025-08-28 at 2.28.47 PM.png',
  '/Users/jonathanjaklitsch/Desktop/Screenshot 2025-08-28 at 2.28.40 PM.png', 
  '/Users/jonathanjaklitsch/Desktop/Screenshot 2025-08-28 at 2.28.32 PM.png',
  '/Users/jonathanjaklitsch/Desktop/Screenshot 2025-08-28 at 2.28.27 PM.png',
  '/Users/jonathanjaklitsch/Desktop/Screenshot 2025-08-28 at 2.28.19 PM.png'
];

/**
 * Convert image file to base64 for OpenAI API
 */
async function imageToBase64(imagePath) {
  try {
    const imageBuffer = await fs.readFile(imagePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error(`Failed to read image ${imagePath}:`, error.message);
    return null;
  }
}

/**
 * Analyze reference images to extract style characteristics
 */
async function analyzeReferenceStyle() {
  console.log('🔍 Analyzing reference images for style consistency...');
  
  try {
    // Prepare reference images
    const imageData = [];
    for (const imagePath of REFERENCE_IMAGES) {
      const base64 = await imageToBase64(imagePath);
      if (base64) {
        imageData.push({
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${base64}`
          }
        });
      }
    }

    if (imageData.length === 0) {
      throw new Error('No reference images could be loaded');
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Use GPT-4V for image analysis
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze these food photography images and extract the consistent visual style elements. Focus on:

1. LIGHTING: Type, direction, quality, shadows
2. COMPOSITION: Camera angle, framing, subject placement  
3. BACKGROUND: Color, texture, styling
4. PLATING: Plate/bowl style, food arrangement, garnishing
5. COLOR PALETTE: Overall color scheme, contrast, saturation
6. PHOTOGRAPHY STYLE: Professional qualities, mood, aesthetic

Provide a concise description that could be used to recreate this exact visual style for new food images. Focus on the most consistent elements across all images.`
            },
            ...imageData
          ]
        }
      ],
      max_tokens: 800
    });

    const styleAnalysis = response.choices[0].message.content;
    console.log('✅ Style analysis complete');
    return styleAnalysis;

  } catch (error) {
    console.error('❌ Failed to analyze reference style:', error.message);
    // Fallback to manual style description
    return `Clean professional food photography with soft natural lighting from above-left. 90-degree overhead angle with slight elevation. Pure white seamless background with subtle contact shadows. Food plated on simple white ceramic plates/bowls with clean edges. Vibrant, naturally saturated colors with high contrast. Restaurant-quality plating with thoughtful component arrangement and minimal fresh garnishes. Studio photography aesthetic with professional color grading.`;
  }
}

/**
 * Generate enhanced DALL-E prompt with reference style
 */
function generateEnhancedPrompt(meal, styleGuide) {
  const { title, description, ingredients_json } = meal;
  
  // Extract key visible ingredients
  const keyIngredients = ingredients_json.ingredients
    .filter(ing => {
      const name = ing.display_name.toLowerCase();
      return !name.includes('oil') && !name.includes('salt') && !name.includes('pepper') 
             && !name.includes('butter') && !name.includes('spray');
    })
    .slice(0, 8)
    .map(ing => ing.display_name.split('(')[0].trim())
    .join(', ');

  // Build enhanced prompt with style reference
  const prompt = `Professional food photography of "${title}". ${description}

STYLE REFERENCE: ${styleGuide}

COMPOSITION: Single generous serving, perfectly plated and centered. Camera positioned 90° overhead with slight elevation for dimensional depth.

PLATING: Simple white ceramic plate or bowl, clean rimless edges. Food arranged with chef-quality presentation - each component visible and appealing. Natural garnishes appropriate to cuisine.

LIGHTING: Soft, even lighting from above-left. Creates gentle shadows for depth without harsh contrasts. Professional studio photography quality.

BACKGROUND: Pure white seamless background (#FFFFFF). Subtle contact shadow beneath plate only.

REQUIREMENTS: Square 1024x1024, photorealistic (not illustration), finished/cooked dish, no utensils/napkins/hands/text.

Key ingredients visible: ${keyIngredients}`;

  return prompt;
}

/**
 * Generate meal image with enhanced styling
 */
async function generateStyledImage(meal, styleGuide) {
  console.log(`🎨 Generating styled image for: ${meal.title}`);
  
  const prompt = generateEnhancedPrompt(meal, styleGuide);
  
  const generateWithRetry = () => withBackoff(async () => {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024", 
      quality: "hd",
      style: "natural"
    });
    
    return response.data[0].url;
  }, {
    tries: 3,
    base: 2000,
    shouldRetry: (error) => {
      if (error.status >= 500) return true;
      if (error.status === 429) return true;
      return false;
    }
  });
  
  try {
    const imageUrl = await generateWithRetry();
    console.log(`✅ Styled image generated for: ${meal.title}`);
    return { imageUrl, prompt };
  } catch (error) {
    console.error(`❌ Failed to generate styled image for ${meal.title}:`, error.message);
    throw error;
  }
}

/**
 * Test the enhanced generation with sample meals
 */
async function testEnhancedGeneration() {
  console.log('🧪 Testing Enhanced Image Generation');
  console.log('=====================================\n');

  // Analyze reference style once
  const styleGuide = await analyzeReferenceStyle();
  console.log('\n📋 Extracted Style Guide:');
  console.log(styleGuide);
  console.log('\n');

  // Sample meal for testing (you can replace with actual meal data)
  const sampleMeal = {
    title: "Herb-Crusted Salmon with Roasted Asparagus",
    description: "Fresh Atlantic salmon fillet with herb crust, served with perfectly roasted asparagus spears and lemon wedge",
    slug: "herb-crusted-salmon-asparagus",
    ingredients_json: {
      ingredients: [
        { display_name: "Atlantic Salmon Fillet" },
        { display_name: "Fresh Asparagus" },
        { display_name: "Fresh Herbs (Dill, Parsley)" },
        { display_name: "Lemon" },
        { display_name: "Olive Oil" },
        { display_name: "Salt" },
        { display_name: "Black Pepper" }
      ]
    }
  };

  try {
    const result = await generateStyledImage(sampleMeal, styleGuide);
    
    console.log('\n🎉 Test Results:');
    console.log('================');
    console.log(`Image URL: ${result.imageUrl}`);
    console.log(`\nGenerated Prompt:\n${result.prompt}`);
    
    return {
      success: true,
      styleGuide,
      sampleResult: result
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  analyzeReferenceStyle,
  generateEnhancedPrompt,
  generateStyledImage,
  testEnhancedGeneration
};

// Run test if called directly
if (require.main === module) {
  testEnhancedGeneration()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Enhanced image generation test completed successfully!');
      } else {
        console.log('\n❌ Test failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}