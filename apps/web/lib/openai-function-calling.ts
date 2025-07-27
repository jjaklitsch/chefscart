import OpenAI from 'openai'
import { UserPreferences, Recipe } from '../types'

// Initialize OpenAI client only when needed to avoid build-time errors
let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }
  return openai
}

// Function schema for structured recipe generation
const RECIPE_GENERATION_FUNCTION = {
  name: 'generate_recipes',
  description: 'Generate a collection of recipes for meal planning',
  parameters: {
    type: 'object',
    properties: {
      recipes: {
        type: 'array',
        description: 'Array of recipe objects',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique recipe identifier' },
            title: { type: 'string', description: 'Recipe name' },
            description: { type: 'string', description: 'Brief recipe description' },
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
              },
              required: ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar']
            },
            estimatedCost: { type: 'number', description: 'Estimated ingredient cost in USD' },
            cookTime: { type: 'number', description: 'Cooking time in minutes' },
            prepTime: { type: 'number', description: 'Preparation time in minutes' },
            servings: { type: 'number', description: 'Number of servings' },
            difficulty: { 
              type: 'string', 
              enum: ['easy', 'medium', 'hard'],
              description: 'Recipe difficulty level'
            },
            cuisine: { type: 'string', description: 'Cuisine type' },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Recipe tags and categories'
            }
          },
          required: ['id', 'title', 'description', 'ingredients', 'instructions', 'nutrition', 'estimatedCost', 'cookTime', 'prepTime', 'servings', 'difficulty', 'cuisine', 'tags']
        }
      }
    },
    required: ['recipes']
  }
}

export interface MealPlanGenerationOptions {
  preferences: UserPreferences
  pantryItems?: string[]
  timeoutMs?: number
}

export interface MealPlanResult {
  recipes: Recipe[]
  backupRecipes: Recipe[]
  generationTime: number
}

export async function generateMealPlanWithFunctionCalling(
  options: MealPlanGenerationOptions
): Promise<MealPlanResult> {
  const { preferences, pantryItems = [], timeoutMs = 4500 } = options
  const startTime = Date.now()

  // Generate 40% more recipes than needed for backups
  const totalRecipesToGenerate = Math.ceil(preferences.mealsPerWeek * 1.4)
  
  const prompt = createMealPlanPrompt(preferences, pantryItems, totalRecipesToGenerate)

  try {
    const completion = await Promise.race([
      getOpenAIClient().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a Michelin-starred chef and creative food writer. Generate diverse, restaurant-quality meal plans with imaginative descriptions that make every dish sound irresistible. Write recipe titles and descriptions like a high-end restaurant menu - creative, appetizing, and sophisticated. Focus on seasonal ingredients, balanced nutrition, and cost-effective shopping. Always generate exactly the requested number of recipes.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        functions: [RECIPE_GENERATION_FUNCTION],
        function_call: { name: 'generate_recipes' },
        temperature: 0.8, // Higher creativity for more diverse recipes
        max_tokens: 4000,
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI request timeout')), timeoutMs)
      )
    ])

    const functionCall = completion.choices[0]?.message?.function_call
    if (!functionCall || functionCall.name !== 'generate_recipes') {
      throw new Error('No function call in OpenAI response')
    }

    let parsedRecipes: { recipes: Recipe[] }
    try {
      parsedRecipes = JSON.parse(functionCall.arguments)
    } catch (parseError) {
      console.error('Failed to parse function call arguments:', parseError)
      throw new Error('Invalid JSON in function call response')
    }

    const recipes = parsedRecipes.recipes || []
    
    // Validate that we got recipes
    if (recipes.length === 0) {
      throw new Error('No recipes generated by OpenAI')
    }

    // Split into primary and backup recipes
    const primaryRecipes = recipes.slice(0, preferences.mealsPerWeek)
    const backupRecipes = recipes.slice(preferences.mealsPerWeek)

    const generationTime = Date.now() - startTime

    return {
      recipes: primaryRecipes,
      backupRecipes,
      generationTime
    }

  } catch (error) {
    const generationTime = Date.now() - startTime
    console.error('OpenAI function calling error:', error)
    
    // Re-throw with additional context
    if (error instanceof Error) {
      throw new Error(`OpenAI generation failed (${generationTime}ms): ${error.message}`)
    }
    throw new Error(`OpenAI generation failed (${generationTime}ms): Unknown error`)
  }
}

function createMealPlanPrompt(
  preferences: UserPreferences, 
  pantryItems: string[], 
  totalRecipesToGenerate: number
): string {
  const {
    mealsPerWeek,
    peoplePerMeal,
    mealTypes,
    diets,
    allergies,
    avoidIngredients = [],
    maxCookTime,
    cookingSkillLevel,
    preferredCuisines,
    organicPreference
  } = preferences

  const mealTypesString = mealTypes.map(m => `${m.type} (${m.days.join(', ')})`).join('; ')
  const pantryString = pantryItems.length > 0 ? pantryItems.join(', ') : 'None specified'

  return `Create ${totalRecipesToGenerate} diverse, delicious recipes for meal planning. Primary need: ${mealsPerWeek} meals for ${peoplePerMeal} people.

STRICT REQUIREMENTS:
- Meal types: ${mealTypesString}
- Dietary restrictions: ${diets.length > 0 ? diets.join(', ') : 'None'}
- Allergies to avoid: ${allergies.length > 0 ? allergies.join(', ') : 'None'}
- Ingredients to avoid: ${avoidIngredients.length > 0 ? avoidIngredients.join(', ') : 'None'}
- Maximum total time (prep + cook): ${maxCookTime} minutes
- Cooking skill level: ${cookingSkillLevel}
- Preferred cuisines: ${preferredCuisines.length > 0 ? preferredCuisines.join(', ') : 'Any'}
- Organic preference: ${organicPreference}
- Available pantry items: ${pantryString}

OPTIMIZATION GOALS:
1. Maximize variety across cuisines, proteins, and cooking methods
2. Balance nutrition across all meals (aim for 400-600 calories per serving)
3. Optimize ingredient overlap to reduce shopping complexity
4. Consider seasonal availability and cost-effectiveness
5. Match difficulty to stated skill level
6. Utilize pantry items when possible to reduce costs

RECIPE REQUIREMENTS:
- Generate exactly ${totalRecipesToGenerate} complete recipes
- Each recipe serves ${peoplePerMeal} people
- Include precise ingredient quantities and clear instructions
- Provide accurate nutrition information
- Estimate realistic ingredient costs (USD)
- Use diverse cooking techniques (baking, grilling, stovetop, etc.)
- Ensure recipes can be completed within time constraints

CREATIVE PRESENTATION:
- Write enticing titles that sound like restaurant menu items (e.g., "Pan-Seared Herb-Crusted Salmon with Lemon Butter Quinoa")
- Create appetizing descriptions that highlight key flavors, textures, and techniques
- Use sophisticated culinary language but keep it accessible
- Mention cooking methods, key ingredients, and flavor profiles
- Make each dish sound like a special restaurant creation

Focus on creating a cohesive meal plan that's exciting, nutritious, and practical for the specified preferences.`
}

export { RECIPE_GENERATION_FUNCTION }