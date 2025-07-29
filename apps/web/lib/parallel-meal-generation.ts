import OpenAI from 'openai'
import { UserPreferences, Recipe } from '../types'

// Initialize OpenAI client
let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 15000, // Shorter timeout for individual calls
    })
  }
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }
  return openai
}

// Single recipe generation function schema
const SINGLE_RECIPE_FUNCTION = {
  name: 'generate_single_recipe',
  description: 'Generate one detailed recipe',
  parameters: {
    type: 'object',
    properties: {
      recipe: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique recipe identifier' },
          title: { type: 'string', description: 'Recipe name' },
          description: { type: 'string', description: 'Brief recipe description' },
          mealType: { type: 'string', description: 'Type of meal (breakfast, lunch, dinner)' },
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
          },
          estimatedCost: { type: 'number' },
          cookTime: { type: 'number' },
          prepTime: { type: 'number' },
          servings: { type: 'number' },
          difficulty: { type: 'string' },
          cuisine: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'title', 'description', 'ingredients', 'instructions', 'mealType']
      }
    },
    required: ['recipe']
  }
}

interface RecipeGenerationTask {
  mealType: string
  requirements: string
  seed: string
}

// Generate a single recipe with optimized prompt
async function generateSingleRecipe(
  task: RecipeGenerationTask, 
  preferences: UserPreferences,
  timeoutMs: number = 15000
): Promise<Recipe> {
  const prompt = createSingleRecipePrompt(task, preferences)
  
  try {
    const completion = await Promise.race([
      getOpenAIClient().chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: `You are a professional recipe developer. Create ONE detailed, unique recipe that matches the requirements exactly.

REQUIREMENTS:
- Generate exactly ONE recipe for ${task.mealType}
- Include ALL ingredients with precise measurements
- Write clear, step-by-step instructions
- Add nutritional estimates and cooking times
- Make it unique and creative (Seed: ${task.seed})

Focus on quality over quantity - this is just one recipe, make it perfect.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        functions: [SINGLE_RECIPE_FUNCTION],
        function_call: { name: 'generate_single_recipe' },
        temperature: 0.8,
        max_tokens: 2000, // Much smaller for single recipe
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Single recipe timeout')), timeoutMs)
      )
    ])

    const functionCall = completion.choices[0]?.message?.function_call
    if (!functionCall || functionCall.name !== 'generate_single_recipe') {
      throw new Error('No function call in OpenAI response')
    }

    const result = JSON.parse(functionCall.arguments || '{}')
    return result.recipe as Recipe

  } catch (error) {
    console.error(`Failed to generate ${task.mealType} recipe:`, error)
    throw error
  }
}

// Create optimized prompt for single recipe
function createSingleRecipePrompt(task: RecipeGenerationTask, preferences: UserPreferences): string {
  const { peoplePerMeal, cookingSkillLevel, preferredCuisines, allergies = [], maxCookTime } = preferences
  
  return `Create ONE ${task.mealType} recipe with these specifications:

MEAL TYPE: ${task.mealType}
SERVINGS: ${peoplePerMeal} people
SKILL LEVEL: ${cookingSkillLevel}
MAX COOK TIME: ${maxCookTime} minutes
CUISINES: ${preferredCuisines?.join(', ') || 'Any'}
AVOID: ${allergies.join(', ') || 'None'}

SPECIFIC REQUIREMENTS: ${task.requirements}

Generate a unique, creative recipe that perfectly matches these requirements.`
}

// Main parallel generation function
export async function generateMealPlanParallel(preferences: UserPreferences): Promise<{
  recipes: Recipe[]
  backupRecipes: Recipe[]
  generationTime: number
}> {
  const startTime = Date.now()
  
  // Create generation tasks based on meal types
  const tasks: RecipeGenerationTask[] = []
  
  preferences.mealTypes?.forEach(mealType => {
    mealType.days.forEach((day, index) => {
      tasks.push({
        mealType: mealType.type,
        requirements: `For ${day}, serves ${mealType.adults} adults and ${mealType.kids} kids`,
        seed: Math.random().toString(36).substring(7)
      })
    })
  })

  // Limit to reasonable number for parallel processing
  const maxTasks = Math.min(tasks.length, 6)
  const selectedTasks = tasks.slice(0, maxTasks)

  console.log(`Starting parallel generation of ${selectedTasks.length} recipes...`)

  try {
    // Run all recipe generations in parallel with individual timeouts
    const recipePromises = selectedTasks.map(task => 
      generateSingleRecipe(task, preferences, 15000)
        .catch(error => {
          console.warn(`Failed to generate ${task.mealType} recipe:`, error.message)
          return null // Return null for failed recipes
        })
    )

    // Wait for all parallel requests to complete or timeout
    const results = await Promise.allSettled(recipePromises)
    
    // Filter successful recipes
    const successfulRecipes: Recipe[] = []
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        successfulRecipes.push(result.value)
      } else {
        console.warn(`Recipe ${index + 1} failed:`, 
          result.status === 'rejected' ? result.reason : 'Null result')
      }
    })

    const generationTime = Date.now() - startTime
    console.log(`Parallel generation completed in ${generationTime}ms. Success: ${successfulRecipes.length}/${selectedTasks.length}`)

    // If we got at least some recipes, return them
    if (successfulRecipes.length > 0) {
      return {
        recipes: successfulRecipes,
        backupRecipes: [], // Could add backup generation here
        generationTime
      }
    }

    throw new Error(`All parallel recipe generation failed`)

  } catch (error) {
    console.error('Parallel meal generation failed:', error)
    throw error
  }
}