import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { UserPreferences } from '../../../../types'

export const dynamic = 'force-dynamic'

let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai && process.env.OPENAI_API_KEY) {
    console.log('Initializing OpenAI client...')
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000, // Increased timeout
    })
  }
  if (!openai) {
    console.error('OpenAI API key not found in environment variables')
    throw new Error('OpenAI API key not configured')
  }
  return openai
}

// First: Generate basic recipe info only
const BASIC_RECIPE_FUNCTION = {
  name: 'generate_basic_recipe',
  description: 'Generate basic recipe info only',
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
          estimatedCost: { type: 'number' }
        },
        required: ['id', 'title', 'description', 'mealType', 'servings', 'estimatedCost', 'cookTime', 'prepTime', 'difficulty', 'cuisine']
      }
    },
    required: ['recipe']
  }
}

// Then: Generate ingredients in parallel
const INGREDIENTS_FUNCTION = {
  name: 'generate_ingredients',
  description: 'Generate detailed ingredients list',
  parameters: {
    type: 'object',
    properties: {
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
      }
    },
    required: ['ingredients']
  }
}

// Then: Generate instructions in parallel
const INSTRUCTIONS_FUNCTION = {
  name: 'generate_instructions',
  description: 'Generate cooking instructions and nutrition',
  parameters: {
    type: 'object',
    properties: {
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
    required: ['instructions']
  }
}

export async function POST(request: NextRequest) {
  try {
    const { preferences } = await request.json()

    if (!preferences) {
      return NextResponse.json({
        error: 'Preferences are required'
      }, { status: 400 })
    }

    console.log('Starting meal generation with sequential + parallel approach...')
    const startTime = Date.now()

    // Create meal requests from preferences
    interface MealRequest {
      mealType: string
      day: string
      servings: number
      index: number
    }
    
    const mealRequests: MealRequest[] = []
    let index = 0
    
    preferences.mealTypes?.forEach((mealType: any) => {
      mealType.days.forEach((day: string) => {
        mealRequests.push({
          mealType: mealType.type,
          day,
          servings: preferences.peoplePerMeal || 2,
          index: index++
        })
      })
    })

    const totalMeals = mealRequests.length
    console.log(`Total meals to generate: ${totalMeals}`)

    if (totalMeals === 0) {
      throw new Error('No meals requested - check meal plan configuration')
    }

    // STAGE 1: Generate basic recipes sequentially to avoid duplicates
    console.log('Stage 1: Generating basic recipes sequentially...')
    const existingTitles: string[] = []
    const basicRecipes: any[] = []
    
    for (let i = 0; i < mealRequests.length; i++) {
      const request = mealRequests[i]
      try {
        const basicRecipe = await generateBasicRecipe(request, preferences, existingTitles)
        if (basicRecipe) {
          existingTitles.push(basicRecipe.title)
          basicRecipes.push({ recipe: basicRecipe, request })
          console.log(`✅ Generated recipe ${i + 1}/${totalMeals}: ${basicRecipe.title}`)
        }
      } catch (error) {
        console.error(`Failed to generate basic recipe ${i + 1}:`, error)
      }
    }

    if (basicRecipes.length === 0) {
      throw new Error('Failed to generate any recipes')
    }

    console.log(`Stage 1 complete: ${basicRecipes.length} basic recipes generated`)

    // STAGE 2: Generate ingredients and instructions in parallel
    console.log('Stage 2: Generating details in parallel...')
    
    const detailPromises = basicRecipes.map(async ({ recipe, request }) => {
      try {
        // Generate ingredients and instructions in parallel for each recipe
        const [ingredients, instructionData] = await Promise.all([
          generateIngredients(recipe, preferences),
          generateInstructions(recipe, preferences)
        ])
        
        return {
          ...recipe,
          ingredients: ingredients || [],
          instructions: instructionData.instructions || [],
          nutrition: instructionData.nutrition || {
            calories: 500,
            protein: 25,
            carbs: 45,
            fat: 20,
            fiber: 5,
            sugar: 8
          }
        }
      } catch (error) {
        console.error(`Failed to generate details for ${recipe.title}:`, error)
        // Return recipe with minimal details rather than failing entirely
        return {
          ...recipe,
          ingredients: [],
          instructions: ['Recipe details not available'],
          nutrition: {
            calories: 500,
            protein: 25,
            carbs: 45,
            fat: 20,
            fiber: 5,
            sugar: 8
          }
        }
      }
    })

    const recipesWithDetails = await Promise.all(detailPromises)
    
    const generationTime = Date.now() - startTime
    console.log(`Complete generation: ${recipesWithDetails.length} recipes in ${generationTime}ms`)

    // Add progressive loading properties (no images initially)
    const recipesWithLoadingState = recipesWithDetails.map(recipe => ({
      ...recipe,
      tags: [recipe.mealType, recipe.cuisine],
      imageUrl: null,
      imageLoading: true,
      imageError: false
    }))

    const mealPlan = {
      id: `plan_${Date.now()}`,
      userId: `temp_${Date.now()}`,
      recipes: recipesWithLoadingState,
      subtotalEstimate: recipes.reduce((sum: number, recipe: any) => 
        sum + ((recipe.estimatedCost || 8) * (recipe.servings || 2)), 0),
      ingredientMatchPct: 95,
      status: 'draft',
      preferences,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    console.log(`Complete meal plan generated: ${recipesWithLoadingState.length} recipes in ${generationTime}ms`)

    return NextResponse.json({
      success: true,
      planId: mealPlan.id,
      mealPlan,
      generationTime
    })

  } catch (error) {
    console.error('Meal generation error:', error)
    return NextResponse.json({
      error: 'Failed to generate meal plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function generateBasicRecipe(
  request: any,
  preferences: UserPreferences,
  existingTitles: string[]
): Promise<any> {
  const avoidDuplicates = existingTitles.length > 0 
    ? `\n\nIMPORTANT: Do NOT create any of these existing recipes: ${existingTitles.join(', ')}`
    : ''
    
  const prompt = `Create a UNIQUE ${request.mealType} recipe for ${request.day}.
  
REQUIREMENTS:
- Serves ${request.servings} people
- Cooking skill: ${preferences.cookingSkillLevel}
- Max cook time: ${preferences.maxCookTime || 30} minutes
- Cuisines: ${preferences.preferredCuisines?.join(', ') || 'Any'}
- Dietary restrictions: ${preferences.diets?.join(', ') || 'None'}
- Avoid allergies: ${preferences.allergies?.join(', ') || 'None'}
- Must be completely different from other meals${avoidDuplicates}

Generate ONLY the basic recipe info - name, description, timing, difficulty, estimated cost per serving ($6-12 range).`

  try {
    console.log(`Calling OpenAI for ${request.mealType} recipe...`)
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Generate basic recipe info only - title, description, timing. Keep it concise and focused.'
        },
        { role: 'user', content: prompt }
      ],
      functions: [BASIC_RECIPE_FUNCTION],
      function_call: { name: 'generate_basic_recipe' },
      temperature: 0.9,
      max_tokens: 500,
    })

    console.log('OpenAI response received')
    const functionCall = completion.choices[0]?.message?.function_call
    if (functionCall?.name === 'generate_basic_recipe') {
      const result = JSON.parse(functionCall.arguments || '{}')
      if (!result.recipe) {
        throw new Error('Recipe object not found in response')
      }
      return result.recipe
    }
    throw new Error('No recipe function call in response')
  } catch (error) {
    console.error('Error generating basic recipe:', error)
    console.error('Error details:', {
      message: error.message,
      type: error.constructor.name,
      stack: error.stack
    })
    throw error
  }
}

async function generateIngredients(
  recipe: any,
  preferences: UserPreferences
): Promise<any[]> {
  const prompt = `Generate detailed ingredients for "${recipe.title}".
Recipe: ${recipe.description}
Servings: ${recipe.servings}
Dietary restrictions: ${preferences.diets?.join(', ') || 'None'}
Allergies: ${preferences.allergies?.join(', ') || 'None'}

Create 8-15 specific ingredients with exact amounts, units, and categories (Meat, Vegetables, Dairy, Pantry, Spices, etc.).`

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Generate detailed ingredient lists with exact measurements and proper categories.'
        },
        { role: 'user', content: prompt }
      ],
      functions: [INGREDIENTS_FUNCTION],
      function_call: { name: 'generate_ingredients' },
      temperature: 0.7,
      max_tokens: 1000,
    })

    const functionCall = completion.choices[0]?.message?.function_call
    if (functionCall?.name === 'generate_ingredients') {
      const result = JSON.parse(functionCall.arguments || '{}')
      return result.ingredients || []
    }
    throw new Error('No ingredients generated')
  } catch (error) {
    console.error('Error generating ingredients:', error)
    return []
  }
}

async function generateInstructions(
  recipe: any,
  preferences: UserPreferences
): Promise<{ instructions: string[], nutrition: any }> {
  const prompt = `Generate cooking instructions for "${recipe.title}".
Recipe: ${recipe.description}
Cook time: ${recipe.cookTime} minutes
Difficulty: ${recipe.difficulty}

Create 4-8 detailed step-by-step cooking instructions and estimate nutrition per serving.`

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Generate detailed cooking instructions with timing and nutritional estimates.'
        },
        { role: 'user', content: prompt }
      ],
      functions: [INSTRUCTIONS_FUNCTION],
      function_call: { name: 'generate_instructions' },
      temperature: 0.7,
      max_tokens: 1500,
    })

    const functionCall = completion.choices[0]?.message?.function_call
    if (functionCall?.name === 'generate_instructions') {
      const result = JSON.parse(functionCall.arguments || '{}')
      return {
        instructions: result.instructions || [],
        nutrition: result.nutrition
      }
    }
    throw new Error('No instructions generated')
  } catch (error) {
    console.error('Error generating instructions:', error)
    return { instructions: [], nutrition: null }
  }
}

function getFlexibleSkillLevel(cookingSkillLevel: string): string {
  switch (cookingSkillLevel?.toLowerCase()) {
    case 'beginner':
      return 'beginner to intermediate (simple to moderate recipes)'
    case 'intermediate':
      return 'beginner to advanced (simple to complex recipes)'
    case 'advanced':
      return 'intermediate to advanced (moderate to complex recipes)'
    default:
      return 'any skill level'
  }
}

