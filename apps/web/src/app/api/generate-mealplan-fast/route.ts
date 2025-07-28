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

// Phase 1: Generate basic meal ideas only
const MEAL_IDEAS_FUNCTION = {
  name: 'generate_meal_ideas',
  description: 'Generate basic meal ideas with core information',
  parameters: {
    type: 'object',
    properties: {
      meals: {
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
            cuisine: { type: 'string' }
          },
          required: ['id', 'title', 'description', 'mealType', 'servings', 'estimatedCost', 'cookTime', 'prepTime', 'difficulty', 'cuisine']
        }
      }
    },
    required: ['meals']
  }
}

// Phase 2: Generate detailed ingredients and instructions
const RECIPE_DETAILS_FUNCTION = {
  name: 'generate_recipe_details',
  description: 'Generate detailed ingredients and instructions for a specific recipe',
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
    required: ['ingredients', 'instructions', 'nutrition']
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

    console.log('Generating meal plan using 2-phase approach...')
    console.log('Received preferences:', JSON.stringify(preferences, null, 2))
    const startTime = Date.now()

    // Create meal requests from preferences
    const mealRequests: string[] = []
    
    // Debug: Check the structure of mealTypes
    console.log('preferences.mealTypes:', preferences.mealTypes)
    
    preferences.mealTypes?.forEach((mealType: any) => {
      console.log('Processing mealType:', mealType)
      mealType.days.forEach(() => {
        mealRequests.push(mealType.type)
      })
    })

    const totalMeals = mealRequests.length
    console.log(`Meal requests array:`, mealRequests)
    console.log(`Phase 1: Generating ${totalMeals} meal ideas`)

    // Phase 1: Generate basic meal ideas only
    const ideasPrompt = createMealIdeasPrompt(preferences, mealRequests)
    console.log('Generated prompt:', ideasPrompt)
    
    console.log('About to make OpenAI API call for meal ideas...')
    
    const ideasCompletion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a meal planning expert. Generate diverse, appealing meal ideas with basic information. Focus on variety and user preferences.'
        },
        {
          role: 'user',
          content: ideasPrompt
        }
      ],
      functions: [MEAL_IDEAS_FUNCTION],
      function_call: { name: 'generate_meal_ideas' },
      temperature: 0.9,
      max_tokens: 3000,
    })

    console.log('OpenAI API call completed successfully')

    const ideasFunctionCall = ideasCompletion.choices[0]?.message?.function_call
    if (!ideasFunctionCall || ideasFunctionCall.name !== 'generate_meal_ideas') {
      throw new Error('No function call in meal ideas response')
    }

    let parsedIdeas: { meals: any[] }
    try {
      parsedIdeas = JSON.parse(ideasFunctionCall.arguments)
    } catch (parseError) {
      throw new Error('Invalid JSON in meal ideas response')
    }

    const mealIdeas = parsedIdeas.meals || []
    if (mealIdeas.length === 0) {
      throw new Error('No meal ideas generated')
    }

    console.log(`Phase 1 complete: Generated ${mealIdeas.length} meal ideas`)
    console.log('Meal ideas:', JSON.stringify(mealIdeas, null, 2))
    
    // Phase 2: Generate detailed ingredients and instructions in parallel
    console.log(`Phase 2: Generating details for ${mealIdeas.length} recipes in parallel`)
    
    const detailPromises = mealIdeas.map(async (meal: any) => {
      try {
        const detailPrompt = createRecipeDetailPrompt(meal, preferences)
        
        const detailCompletion = await getOpenAIClient().chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a professional chef. Generate detailed, accurate ingredients and step-by-step cooking instructions.'
            },
            {
              role: 'user',
              content: detailPrompt
            }
          ],
          functions: [RECIPE_DETAILS_FUNCTION],
          function_call: { name: 'generate_recipe_details' },
          temperature: 0.7,
          max_tokens: 1500,
        })

        const detailFunctionCall = detailCompletion.choices[0]?.message?.function_call
        if (!detailFunctionCall || detailFunctionCall.name !== 'generate_recipe_details') {
          throw new Error(`No function call in recipe details response for ${meal.title}`)
        }

        const parsedDetails = JSON.parse(detailFunctionCall.arguments)
        
        return {
          ...meal,
          ingredients: parsedDetails.ingredients || [],
          instructions: parsedDetails.instructions || [],
          nutrition: parsedDetails.nutrition || getDefaultNutrition()
        }
      } catch (error) {
        console.warn(`Failed to generate details for ${meal.title}:`, error)
        return {
          ...meal,
          ingredients: getDefaultIngredients(),
          instructions: getDefaultInstructions(),
          nutrition: getDefaultNutrition()
        }
      }
    })

    // Wait for all detail generation to complete
    const recipesWithDetails = await Promise.all(detailPromises)
    
    const generationTime = Date.now() - startTime
    console.log(`2-phase generation complete: ${recipesWithDetails.length} recipes in ${generationTime}ms`)

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

function createMealIdeasPrompt(preferences: UserPreferences, mealRequests: string[]): string {
  const skillLevel = getFlexibleSkillLevel(preferences.cookingSkillLevel)
  const mealCounts = mealRequests.reduce((counts: Record<string, number>, meal: string) => {
    counts[meal] = (counts[meal] || 0) + 1
    return counts
  }, {})

  const mealDistribution = Object.entries(mealCounts)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ')

  return `CRITICAL: You must generate exactly ${mealRequests.length} meal ideas. No more, no less.

MEAL PLAN REQUEST:
Generate ${mealRequests.length} diverse, appealing meal ideas with basic information only.

EXACT DISTRIBUTION REQUIRED: ${mealDistribution}

REQUIREMENTS:
- Servings: ${preferences.peoplePerMeal || 2} per recipe
- Max cooking time: ${preferences.maxCookTime || 30} minutes total (prep + cook combined)
- Skill level: ${skillLevel}
- Dietary restrictions: ${preferences.diets?.join(', ') || 'None'}
- Allergies: ${preferences.allergies?.join(', ') || 'None'}
- Preferred cuisines: ${preferences.preferredCuisines?.join(', ') || 'Any'}
- Organic preference: ${preferences.organicPreference || 'no_preference'}

FOCUS ON:
- Creative, unique meal titles
- Appetizing 2-3 sentence descriptions
- Diverse cuisines and cooking methods
- Realistic timing and cost estimates
- Appropriate difficulty levels

Generate exactly ${mealRequests.length} meal ideas with basic info only (no ingredients or instructions).`
}

function createRecipeDetailPrompt(meal: any, preferences: UserPreferences): string {
  return `Generate detailed ingredients and cooking instructions for this meal:

MEAL: ${meal.title}
DESCRIPTION: ${meal.description}
CUISINE: ${meal.cuisine}
SERVINGS: ${meal.servings}
COOKING TIME: ${meal.prepTime + meal.cookTime} minutes total
DIFFICULTY: ${meal.difficulty}

USER REQUIREMENTS:
- Dietary restrictions: ${preferences.diets?.join(', ') || 'None'}
- Allergies: ${preferences.allergies?.join(', ') || 'None'}
- Organic preference: ${preferences.organicPreference || 'no_preference'}

REQUIREMENTS:
1. Generate 8-15 specific ingredients with exact amounts and units
2. Create 4-8 detailed cooking steps
3. Include realistic nutrition information for ${meal.servings} servings
4. Use proper ingredient categories (Meat, Vegetables, Pantry, Dairy, etc.)
5. Make instructions clear and professional

Generate complete ingredients list, step-by-step instructions, and nutrition data.`
}

function getDefaultIngredients() {
  return [
    { name: 'main protein', amount: 1, unit: 'lb', category: 'Meat' },
    { name: 'vegetables', amount: 2, unit: 'cups', category: 'Vegetables' },
    { name: 'seasoning', amount: 1, unit: 'tsp', category: 'Spices' }
  ]
}

function getDefaultInstructions() {
  return [
    'Prepare all ingredients according to recipe requirements.',
    'Cook the main components following proper techniques.',
    'Combine ingredients and finish cooking.',
    'Serve hot and enjoy!'
  ]
}

function getDefaultNutrition() {
  return {
    calories: 500,
    protein: 25,
    carbs: 45,
    fat: 20,
    fiber: 5,
    sugar: 8
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