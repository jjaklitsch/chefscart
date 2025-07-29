import OpenAI from 'openai'
import { UserPreferences, Recipe } from '../types'

let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 15000,
    })
  }
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }
  return openai
}

// Generate multiple complete recipes in batches
const BATCH_RECIPES_FUNCTION = {
  name: 'generate_recipe_batch',
  description: 'Generate multiple complete recipes in one call',
  parameters: {
    type: 'object',
    properties: {
      recipes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            mealType: { type: 'string' },
            cuisine: { type: 'string' },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
            cookTime: { type: 'number' },
            prepTime: { type: 'number' },
            servings: { type: 'number' },
            estimatedCost: { type: 'number' },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  amount: { type: 'number' },
                  unit: { type: 'string' },
                  category: { type: 'string' }
                },
                required: ['name', 'amount', 'unit']
              }
            },
            instructions: {
              type: 'array',
              items: { type: 'string' }
            },
            nutrition: {
              type: 'object',
              properties: {
                calories: { type: 'number' },
                protein: { type: 'number' },
                carbs: { type: 'number' },
                fat: { type: 'number' },
                fiber: { type: 'number' },
                sugar: { type: 'number' }
              }
            }
          },
          required: ['id', 'title', 'description', 'mealType', 'servings', 'estimatedCost', 'ingredients', 'instructions', 'nutrition']
        }
      }
    },
    required: ['recipes']
  }
}

// OPTIMIZED: Generate recipes in batches of 3-4 to avoid rate limits
export async function generateMealPlanBatched(
  preferences: UserPreferences
): Promise<{ recipes: Recipe[], generationTime: number }> {
  const startTime = Date.now()
  
  // Create meal requests
  const requests = []
  preferences.mealTypes?.forEach(mealType => {
    mealType.days.forEach(day => {
      requests.push({
        mealType: mealType.type,
        day,
        servings: preferences.peoplePerMeal || 2
      })
    })
  })

  console.log(`🚀 BATCHED: Generating ${requests.length} recipes in batches of 4`)

  if (requests.length === 0) {
    throw new Error('No meals requested')
  }

  // Split into batches of 4 recipes each
  const batchSize = 4
  const batches = []
  for (let i = 0; i < requests.length; i += batchSize) {
    batches.push(requests.slice(i, i + batchSize))
  }

  console.log(`📦 Created ${batches.length} batches: ${batches.map(b => b.length).join(', ')} recipes each`)

  try {
    // Generate each batch sequentially (but each batch contains multiple recipes)
    const allRecipes = []
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      const batchStart = Date.now()
      
      console.log(`🔄 Batch ${batchIndex + 1}/${batches.length}: Generating ${batch.length} recipes...`)
      
      const mealBreakdown = batch.map((req, i) => 
        `${i+1}. ${req.mealType} for ${req.day} (serves ${req.servings})`
      ).join('\n')

      const prompt = `Generate ${batch.length} complete recipes with all details:
${mealBreakdown}

Requirements: Each must have different protein, cuisine, cooking method.
Include full ingredients (8-10 items) and instructions (5-6 steps) for each recipe.
Be efficient but complete.`

      const completion = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'Generate multiple complete recipes efficiently. Each recipe must be unique with different proteins and cuisines.'
          },
          { role: 'user', content: prompt }
        ],
        functions: [BATCH_RECIPES_FUNCTION],
        function_call: { name: 'generate_recipe_batch' },
        temperature: 0.8,
        max_tokens: 3000, // Higher limit for batch
      })

      const functionCall = completion.choices[0]?.message?.function_call
      if (functionCall?.name === 'generate_recipe_batch') {
        const result = JSON.parse(functionCall.arguments || '{}')
        const batchRecipes = (result.recipes || []).map((recipe: any) => ({
          ...recipe,
          tags: [recipe.mealType, recipe.cuisine],
          imageUrl: null,
          imageLoading: true,
          imageError: false
        }))
        
        const batchTime = Date.now() - batchStart
        console.log(`✅ Batch ${batchIndex + 1} complete: ${batchRecipes.length} recipes in ${batchTime}ms`)
        allRecipes.push(...batchRecipes)
      } else {
        console.warn(`❌ Batch ${batchIndex + 1} failed: No function call`)
      }
    }
    
    const generationTime = Date.now() - startTime
    console.log(`✅ BATCHED complete: ${allRecipes.length} recipes in ${generationTime}ms`)
    console.log(`📊 Average: ${Math.round(generationTime / allRecipes.length)}ms per recipe`)

    return { recipes: allRecipes, generationTime }

  } catch (error) {
    console.error('Batched meal generation failed:', error)
    throw error
  }
}