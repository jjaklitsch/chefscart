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

// Fast recipe generation function schema
const FAST_RECIPE_FUNCTION = {
  name: 'generate_fast_recipes',
  description: 'Generate recipes quickly without images',
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

    console.log('Generating fast meal plan (text only)...')
    const startTime = Date.now()

    // Create meal requests from preferences
    const mealRequests: string[] = []
    preferences.mealTypes?.forEach((mealType: any) => {
      mealType.days.forEach(() => {
        mealRequests.push(mealType.type)
      })
    })

    const totalMeals = mealRequests.length
    console.log(`Generating ${totalMeals} meals`)

    // Create optimized prompt for fast generation
    const prompt = createFastMealPrompt(preferences, mealRequests)

    // Single OpenAI call with aggressive timeout - using fastest model
    const completion = await Promise.race([
      getOpenAIClient().chat.completions.create({
        model: 'gpt-4o-mini', // Fastest available model
        messages: [
          {
            role: 'system',
            content: 'You are a fast recipe generator. Create diverse, practical recipes quickly. Focus on variety and user preferences.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        functions: [FAST_RECIPE_FUNCTION],
        function_call: { name: 'generate_fast_recipes' },
        temperature: 0.9, // High creativity for variety
        max_tokens: 3500, // Optimized for speed
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Fast generation timeout')), 6000) // 6 second max for speed
      )
    ])

    const functionCall = completion.choices[0]?.message?.function_call
    if (!functionCall || functionCall.name !== 'generate_fast_recipes') {
      throw new Error('No function call in response')
    }

    const generationTime = Date.now() - startTime
    console.log(`Fast recipes generated in ${generationTime}ms`)

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

    console.log(`Fast meal plan complete: ${recipes.length} recipes in ${generationTime}ms`)

    return NextResponse.json({
      success: true,
      planId: mealPlan.id,
      mealPlan,
      generationTime
    })

  } catch (error) {
    console.error('Fast meal generation error:', error)
    
    // Return simple fallback if OpenAI fails
    const fallbackRecipes = createFallbackRecipes(request)
    
    return NextResponse.json({
      success: true,
      planId: `fallback_${Date.now()}`,
      mealPlan: {
        id: `fallback_${Date.now()}`,
        recipes: fallbackRecipes,
        subtotalEstimate: fallbackRecipes.reduce((sum, r) => sum + r.estimatedCost, 0),
        status: 'draft'
      },
      fallback: true
    })
  }
}

function createFastMealPrompt(preferences: UserPreferences, mealRequests: string[]): string {
  const skillLevel = getFlexibleSkillLevel(preferences.cookingSkillLevel)
  const mealCounts = mealRequests.reduce((counts: Record<string, number>, meal: string) => {
    counts[meal] = (counts[meal] || 0) + 1
    return counts
  }, {})

  const mealDistribution = Object.entries(mealCounts)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ')

  return `Generate ${mealRequests.length} diverse recipes for meal planning.

DISTRIBUTION: ${mealDistribution}

REQUIREMENTS:
- Servings: ${preferences.peoplePerMeal || 2} per recipe
- Max cooking time: ${preferences.maxCookTime || 30} minutes total  
- Skill level: ${skillLevel}
- Dietary restrictions: ${preferences.diets?.join(', ') || 'None'}
- Allergies: ${preferences.allergies?.join(', ') || 'None'}
- Preferred cuisines: ${preferences.preferredCuisines?.join(', ') || 'Any'}

GOALS:
- Maximum variety in proteins, cuisines, cooking methods
- Balanced nutrition (400-600 calories per serving)
- Cost-effective ingredients ($6-12 per serving)
- Practical recipes for busy schedules

Generate exactly ${mealRequests.length} complete recipes with ingredients and step-by-step instructions.`
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

function createFallbackRecipes(request: any): any[] {
  return [
    {
      id: 'fallback-1',
      title: 'Quick Chicken Stir Fry',
      description: 'Fast and healthy chicken with vegetables',
      mealType: 'dinner',
      servings: 2,
      estimatedCost: 8,
      cookTime: 15,
      prepTime: 10,
      difficulty: 'easy',
      cuisine: 'Asian',
      tags: ['dinner', 'Asian'],
      ingredients: [
        { name: 'chicken breast', amount: 1, unit: 'lb', category: 'Meat' },
        { name: 'mixed vegetables', amount: 2, unit: 'cups', category: 'Vegetables' }
      ],
      instructions: ['Cook chicken', 'Add vegetables', 'Stir fry until done'],
      nutrition: { calories: 350, protein: 30, carbs: 15, fat: 18, fiber: 4, sugar: 8 },
      imageUrl: null,
      imageLoading: true
    },
    {
      id: 'fallback-2',
      title: 'Simple Pasta Bowl',
      description: 'Classic pasta with fresh ingredients',
      mealType: 'lunch',
      servings: 2,
      estimatedCost: 6,
      cookTime: 12,
      prepTime: 5,
      difficulty: 'easy',
      cuisine: 'Italian',
      tags: ['lunch', 'Italian'],
      ingredients: [
        { name: 'pasta', amount: 8, unit: 'oz', category: 'Grains' },
        { name: 'marinara sauce', amount: 1, unit: 'cup', category: 'Pantry' }
      ],
      instructions: ['Boil pasta', 'Heat sauce', 'Combine and serve'],
      nutrition: { calories: 420, protein: 15, carbs: 65, fat: 12, fiber: 6, sugar: 10 },
      imageUrl: null,
      imageLoading: true
    }
  ]
}