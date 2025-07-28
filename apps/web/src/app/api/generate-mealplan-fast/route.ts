import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { UserPreferences } from '../../../../types'

export const dynamic = 'force-dynamic'

let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 10000, // Short timeout for speed
    })
  }
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }
  return openai
}

// Single call to generate complete recipes
const COMPLETE_RECIPES_FUNCTION = {
  name: 'generate_complete_recipes',
  description: 'Generate complete recipes with all details',
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
            servings: { type: 'number' },
            estimatedCost: { type: 'number' },
            cookTime: { type: 'number' },
            prepTime: { type: 'number' },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
            cuisine: { type: 'string' },
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
          required: ['id', 'title', 'description', 'mealType', 'servings', 'estimatedCost', 'ingredients', 'instructions']
        }
      }
    },
    required: ['recipes']
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

    console.log('Generating complete meal plan with single OpenAI call...')
    const startTime = Date.now()

    // Create meal requests from preferences
    const mealRequests: string[] = []
    preferences.mealTypes?.forEach((mealType: any) => {
      mealType.days.forEach(() => {
        mealRequests.push(mealType.type)
      })
    })

    const totalMeals = mealRequests.length
    console.log(`Generating ${totalMeals} complete recipes`)

    if (totalMeals === 0) {
      throw new Error('No meals requested - check meal plan configuration')
    }

    // Create comprehensive prompt for complete generation
    const completePrompt = createCompleteRecipePrompt(preferences, mealRequests)
    
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert meal planner and chef. Generate complete, detailed recipes with all ingredients, instructions, and nutrition information. Focus on variety, quality, and user preferences.'
        },
        {
          role: 'user',
          content: completePrompt
        }
      ],
      functions: [COMPLETE_RECIPES_FUNCTION],
      function_call: { name: 'generate_complete_recipes' },
      temperature: 0.9,
      max_tokens: 12000, // Increased for complete recipes
    })

    const functionCall = completion.choices[0]?.message?.function_call
    if (!functionCall || functionCall.name !== 'generate_complete_recipes') {
      throw new Error('No function call in response')
    }

    let parsedRecipes: { recipes: any[] }
    try {
      parsedRecipes = JSON.parse(functionCall.arguments)
    } catch (parseError) {
      throw new Error('Invalid JSON in function response')
    }

    const recipes = parsedRecipes.recipes || []
    if (recipes.length === 0) {
      throw new Error('No recipes generated')
    }

    const generationTime = Date.now() - startTime
    console.log(`Complete recipe generation: ${recipes.length} recipes in ${generationTime}ms`)

    // Add progressive loading properties (no images initially)
    const recipesWithLoadingState = recipes.map(recipe => ({
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

function createCompleteRecipePrompt(preferences: UserPreferences, mealRequests: string[]): string {
  const skillLevel = getFlexibleSkillLevel(preferences.cookingSkillLevel)
  const mealCounts = mealRequests.reduce((counts: Record<string, number>, meal: string) => {
    counts[meal] = (counts[meal] || 0) + 1
    return counts
  }, {})

  const mealDistribution = Object.entries(mealCounts)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ')

  return `CRITICAL: You must generate exactly ${mealRequests.length} complete recipes. No more, no less.

MEAL PLAN REQUEST:
Generate ${mealRequests.length} diverse, high-quality complete recipes for meal planning.

EXACT DISTRIBUTION REQUIRED: ${mealDistribution}

REQUIREMENTS:
- Servings: ${preferences.peoplePerMeal || 2} per recipe
- Max cooking time: ${preferences.maxCookTime || 30} minutes total (prep + cook combined)
- Skill level: ${skillLevel}
- Dietary restrictions: ${preferences.diets?.join(', ') || 'None'}
- Allergies: ${preferences.allergies?.join(', ') || 'None'}
- Preferred cuisines: ${preferences.preferredCuisines?.join(', ') || 'Any'}
- Organic preference: ${preferences.organicPreference || 'no_preference'}

QUALITY STANDARDS:
- Each recipe must be complete with detailed ingredients (specific amounts/units)
- Step-by-step cooking instructions (at least 4-8 steps per recipe)
- Realistic nutrition information and cost estimates
- Maximum variety in proteins, cuisines, cooking methods
- Balanced nutrition (400-600 calories per serving)
- Cost-effective ingredients ($6-12 per serving)
- Restaurant-quality, practical recipes
- Proper ingredient categories (Meat, Vegetables, Pantry, Dairy, Spices, etc.)

CRITICAL: Return exactly ${mealRequests.length} recipes in the recipes array. Each recipe must include:
1. Unique, descriptive title
2. Detailed description (2-3 sentences)
3. Complete ingredient list with specific amounts (8-15 ingredients)
4. Step-by-step instructions (minimum 4-8 detailed steps)
5. Accurate nutrition and cost data

Generate exactly ${mealRequests.length} complete, high-quality recipes now.`
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

