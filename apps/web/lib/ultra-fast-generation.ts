import OpenAI from 'openai'
import { UserPreferences, Recipe } from '../types'

let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 15000, // Fast timeout
    })
  }
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }
  return openai
}

// Complete recipe generation in ONE call
const COMPLETE_RECIPE_FUNCTION = {
  name: 'generate_complete_recipe',
  description: 'Generate one complete recipe with all details',
  parameters: {
    type: 'object',
    properties: {
      recipe: {
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
    },
    required: ['recipe']
  }
}

interface MealRequest {
  mealType: string
  day: string
  servings: number
  index: number
}

// Generate ONE complete recipe (ultra-fast)
async function generateCompleteRecipe(
  request: MealRequest,
  preferences: UserPreferences,
  uniquenessSeed: string,
  varietyHint?: string
): Promise<Recipe> {
  const prompt = `Create 1 COMPLETE ${request.mealType} recipe for ${request.day}.

REQUIREMENTS:
- Serves ${request.servings} people
- Cooking skill: ${preferences.cookingSkillLevel}
- Max total time: ${preferences.maxCookTime || 30} minutes
- Cuisines: ${preferences.preferredCuisines?.join(', ') || 'Any'}
- Dietary restrictions: ${preferences.diets?.join(', ') || 'None'}
- Avoid allergies: ${preferences.allergies?.join(', ') || 'None'}

UNIQUENESS SEED: ${uniquenessSeed} (use this to ensure variety)
${varietyHint ? `VARIETY FOCUS: ${varietyHint}` : ''}

CRITICAL: This recipe must be COMPLETELY DIFFERENT from typical recipes. Use:
- Unique protein combinations (mix proteins, use seafood, plant-based options)
- Different cooking methods (grill, roast, sauté, steam, air-fry)
- Varied cuisine fusion (Italian-Asian, Mexican-Mediterranean, etc.)
- Creative ingredient combinations
- Different base starches (quinoa, rice, pasta, potatoes, bread)

Generate a COMPLETE recipe with:
- Detailed ingredients list (8-12 items)
- Step-by-step instructions (4-8 steps)
- Accurate nutrition info
- Realistic cost estimate ($6-12 per serving)

Make it UNIQUE and delicious!`

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'Generate ONE complete recipe with all details. Be concise but thorough.'
        },
        { role: 'user', content: prompt }
      ],
      functions: [COMPLETE_RECIPE_FUNCTION],
      function_call: { name: 'generate_complete_recipe' },
      temperature: 0.9,
      max_tokens: 1500,
    })

    const functionCall = completion.choices[0]?.message?.function_call
    if (functionCall?.name === 'generate_complete_recipe') {
      const result = JSON.parse(functionCall.arguments || '{}')
      if (!result.recipe) {
        throw new Error('Recipe object not found in response')
      }
      return {
        ...result.recipe,
        tags: [result.recipe.mealType, result.recipe.cuisine],
        imageUrl: null,
        imageLoading: true,
        imageError: false
      }
    }
    throw new Error('No recipe function call in response')
  } catch (error) {
    console.error(`Error generating complete recipe for ${request.mealType}:`, error)
    throw error
  }
}

// ULTRA-FAST: Generate ALL recipes in TRUE PARALLEL
export async function generateMealPlanUltraFast(
  preferences: UserPreferences
): Promise<{ recipes: Recipe[], generationTime: number }> {
  const startTime = Date.now()
  
  // Create meal requests
  const requests: MealRequest[] = []
  let index = 0
  
  preferences.mealTypes?.forEach(mealType => {
    mealType.days.forEach(day => {
      requests.push({
        mealType: mealType.type,
        day,
        servings: preferences.peoplePerMeal || 2,
        index: index++
      })
    })
  })

  console.log(`🚀 ULTRA-FAST: Generating ${requests.length} complete recipes in TRUE PARALLEL`)

  if (requests.length === 0) {
    throw new Error('No meals requested')
  }

  if (requests.length > 15) {
    throw new Error(`Too many meals requested (${requests.length}). Maximum is 15 for ultra-fast generation.`)
  }

  try {
    // Generate ALL recipes in TRUE PARALLEL (no sequential bottleneck!)
    const recipePromises = requests.map((request, index) => {
      // Each recipe gets a unique seed for variety
      const uniquenessSeed = `${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`
      
      // Add variety constraints based on index
      const varietyConstraints = [
        'Focus on chicken/poultry proteins',
        'Focus on beef/pork proteins', 
        'Focus on seafood/fish proteins',
        'Focus on vegetarian/plant-based proteins',
        'Focus on pasta/noodle base',
        'Focus on rice/grain base',
        'Focus on potato/root vegetable base',
        'Focus on bread/sandwich style'
      ]
      const varietyHint = varietyConstraints[index % varietyConstraints.length]
      
      return Promise.race([
        generateCompleteRecipe(request, preferences, uniquenessSeed, varietyHint),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Recipe ${index + 1} timeout`)), 12000)
        )
      ]).catch(error => {
        console.warn(`Failed to generate recipe ${index + 1}:`, error.message)
        return null // Return null for failed recipes (no fallbacks!)
      })
    })

    // Wait for ALL parallel requests to complete
    const results = await Promise.allSettled(recipePromises)
    
    // Extract successful recipes (no fallbacks!)
    const successfulRecipes: Recipe[] = []
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        successfulRecipes.push(result.value)
      } else {
        console.warn(`Recipe ${index + 1} failed or timed out`)
      }
    })

    const generationTime = Date.now() - startTime
    console.log(`✅ ULTRA-FAST complete: ${successfulRecipes.length}/${requests.length} recipes in ${generationTime}ms`)

    if (successfulRecipes.length === 0) {
      throw new Error('All recipe generation failed - check OpenAI API')
    }

    return { recipes: successfulRecipes, generationTime }

  } catch (error) {
    console.error('Ultra-fast meal generation failed:', error)
    throw error
  }
}