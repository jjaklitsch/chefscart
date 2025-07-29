import OpenAI from 'openai'
import { UserPreferences, Recipe } from '../types'

let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 12000, // Single call timeout
    })
  }
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }
  return openai
}

// Generate ALL recipes in ONE single call
const ALL_RECIPES_FUNCTION = {
  name: 'generate_all_recipes',
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

interface MealRequest {
  mealType: string
  day: string
  servings: number
}

// SINGLE CALL: Generate ALL recipes at once
export async function generateMealPlanSingleCall(
  preferences: UserPreferences
): Promise<{ recipes: Recipe[], generationTime: number }> {
  const startTime = Date.now()
  
  // Create meal requests
  const requests: MealRequest[] = []
  
  preferences.mealTypes?.forEach(mealType => {
    mealType.days.forEach(day => {
      requests.push({
        mealType: mealType.type,
        day,
        servings: preferences.peoplePerMeal || 2
      })
    })
  })

  console.log(`⚡ SINGLE CALL: Generating ${requests.length} complete recipes in ONE API call`)

  if (requests.length === 0) {
    throw new Error('No meals requested')
  }

  const mealBreakdown = requests.map((req, i) => 
    `${i+1}. ${req.mealType} for ${req.day} (serves ${req.servings})`
  ).join('\n')

  const prompt = `Generate ${requests.length} COMPLETE recipes with ingredients & instructions:

${mealBreakdown}

Preferences:
- Skill: ${preferences.cookingSkillLevel}
- Max time: ${preferences.maxCookTime || 30}min  
- Cuisines: ${preferences.preferredCuisines?.join(', ') || 'Any'}
- Avoid: ${preferences.allergies?.join(', ') || 'None'}

CRITICAL: Each recipe must have different protein, cooking method, cuisine. Include full ingredients list and cooking steps for each.`

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'Generate multiple complete recipes with all details in one response. Be efficient but thorough.'
        },
        { role: 'user', content: prompt }
      ],
      functions: [ALL_RECIPES_FUNCTION],
      function_call: { name: 'generate_all_recipes' },
      temperature: 0.8,
      max_tokens: 4000, // Higher for multiple recipes
    })

    const functionCall = completion.choices[0]?.message?.function_call
    if (functionCall?.name === 'generate_all_recipes') {
      const result = JSON.parse(functionCall.arguments || '{}')
      const recipes = (result.recipes || []).map((recipe: any) => ({
        ...recipe,
        tags: [recipe.mealType, recipe.cuisine],
        imageUrl: null,
        imageLoading: true,
        imageError: false
      }))
      
      const generationTime = Date.now() - startTime
      console.log(`✅ SINGLE CALL complete: ${recipes.length} recipes in ${generationTime}ms`)

      return { recipes, generationTime }
    }
    throw new Error('No recipes generated')
  } catch (error) {
    console.error('Single call meal generation failed:', error)
    throw error
  }
}