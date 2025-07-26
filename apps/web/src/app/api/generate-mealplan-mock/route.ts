import { NextRequest, NextResponse } from 'next/server'
import { generateMealPlanWithFunctionCalling } from '../../../../lib/openai-function-calling'
import type { UserPreferences } from '../../../../types'

export const dynamic = 'force-dynamic'

function validatePreferences(preferences: any): string | null {
  if (!preferences) return 'Preferences object is required'
  
  // Validate mealsPerWeek
  if (!preferences.mealsPerWeek || preferences.mealsPerWeek < 1 || preferences.mealsPerWeek > 21) {
    return 'mealsPerWeek must be between 1 and 21'
  }
  
  // Validate peoplePerMeal
  if (!preferences.peoplePerMeal || preferences.peoplePerMeal < 1 || preferences.peoplePerMeal > 12) {
    return 'peoplePerMeal must be between 1 and 12'
  }
  
  // Validate mealTypes
  if (!preferences.mealTypes || !Array.isArray(preferences.mealTypes) || preferences.mealTypes.length === 0) {
    return 'meal types must be a non-empty array'
  }
  
  // Validate cookingSkillLevel
  if (!['beginner', 'intermediate', 'advanced'].includes(preferences.cookingSkillLevel)) {
    return 'cookingSkillLevel must be one of: beginner, intermediate, advanced'
  }
  
  // Validate organicPreference
  if (!['preferred', 'only_if_within_10_percent', 'no_preference'].includes(preferences.organicPreference)) {
    return 'organicPreference must be one of: preferred, only_if_within_10_percent, no_preference'
  }
  
  // Validate maxCookTime
  if (!preferences.maxCookTime || preferences.maxCookTime < 5 || preferences.maxCookTime > 240) {
    return 'maxCookTime must be between 5 and 240 minutes'
  }
  
  return null
}

export async function POST(request: NextRequest) {
  let userId: string | undefined
  let preferences: UserPreferences
  let zipCode: string | undefined
  
  try {
    console.log('API endpoint hit - parsing request...')
    const body = await request.json()
    userId = body.userId
    preferences = body.preferences
    zipCode = body.zipCode

    console.log('Request body:', { userId, preferences: !!preferences, zipCode })

    // Update validation - userId is not required based on tests
    if (!preferences || !zipCode) {
      console.log('Missing required fields')
      return NextResponse.json({
        error: 'Missing required fields: preferences and zipCode are required'
      }, { status: 400 })
    }

    // Validate preferences structure
    const validationError = validatePreferences(preferences)
    if (validationError) {
      return NextResponse.json({
        error: validationError
      }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      console.log('Missing OpenAI API key')
      return NextResponse.json({
        error: 'OpenAI API key not configured'
      }, { status: 500 })
    }

    console.log('Generating meal plan with OpenAI function calling...')

    // Use function calling for structured output with 4.5s timeout for <5s total response
    const startTime = Date.now()
    const result = await generateMealPlanWithFunctionCalling({
      preferences,
      pantryItems: [], // TODO: Extract from pantry photo if provided
      timeoutMs: 4500
    })

    const generationTime = Date.now() - startTime
    console.log(`Meal plan generated successfully in ${generationTime}ms`)

    // Calculate estimated cost
    const subtotalEstimate = result.recipes.reduce((sum, recipe) => 
      sum + (recipe.estimatedCost || 0), 0)

    // Create meal plan document
    const mealPlan = {
      id: `plan_${Date.now()}`,
      userId: userId || `anonymous_${Date.now()}`,
      recipes: result.recipes,
      backupRecipes: result.backupRecipes,
      subtotalEstimate,
      ingredientMatchPct: 95,
      status: 'draft' as const,
      preferences,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    return NextResponse.json({
      success: true,
      planId: mealPlan.id,
      mealPlan,
      generationTime
    })

  } catch (error) {
    console.error('Error generating meal plan:', error)
    
    // If it's a timeout or OpenAI error, return a fallback response
    if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('OpenAI')) && preferences) {
      console.log('Returning fallback meal plan due to OpenAI error')
      return getFallbackMealPlan(userId || `fallback_${Date.now()}`, preferences)
    }
    
    return NextResponse.json({
      error: 'Failed to generate meal plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Fallback meal plan if OpenAI fails
function getFallbackMealPlan(userId: string, preferences: UserPreferences) {
  try {
    const fallbackRecipes = [
      {
        id: 'recipe-1',
        title: 'Simple Chicken Stir Fry',
        description: 'Quick and healthy chicken stir fry with vegetables',
        ingredients: [
          { name: 'chicken breast', amount: 1, unit: 'lb', category: 'meat' },
          { name: 'mixed vegetables', amount: 2, unit: 'cups', category: 'produce' },
          { name: 'soy sauce', amount: 2, unit: 'tbsp', category: 'pantry' },
          { name: 'olive oil', amount: 1, unit: 'tbsp', category: 'pantry' }
        ],
        instructions: ['Heat oil in pan', 'Cook chicken until done', 'Add vegetables and stir fry', 'Season with soy sauce'],
        nutrition: { calories: 350, protein: 30, carbs: 15, fat: 18, fiber: 4, sugar: 8 },
        estimatedCost: 12.50,
        cookTime: 20,
        prepTime: 10,
        servings: preferences.peoplePerMeal || 2,
        difficulty: 'easy',
        cuisine: 'Asian',
        tags: ['healthy', 'quick']
      },
      {
        id: 'recipe-2', 
        title: 'Pasta with Marinara',
        description: 'Classic pasta with homemade marinara sauce',
        ingredients: [
          { name: 'pasta', amount: 1, unit: 'lb', category: 'pantry' },
          { name: 'marinara sauce', amount: 1, unit: 'jar', category: 'pantry' },
          { name: 'parmesan cheese', amount: 0.5, unit: 'cup', category: 'dairy' }
        ],
        instructions: ['Boil pasta according to package directions', 'Heat marinara sauce', 'Combine and serve with cheese'],
        nutrition: { calories: 420, protein: 15, carbs: 65, fat: 12, fiber: 6, sugar: 10 },
        estimatedCost: 8.00,
        cookTime: 15,
        prepTime: 5,
        servings: preferences.peoplePerMeal || 2,
        difficulty: 'easy',
        cuisine: 'Italian',
        tags: ['quick', 'vegetarian']
      },
      {
        id: 'recipe-3',
        title: 'Baked Salmon with Vegetables',
        description: 'Healthy baked salmon with roasted vegetables',
        ingredients: [
          { name: 'salmon fillets', amount: 2, unit: 'pieces', category: 'seafood' },
          { name: 'broccoli', amount: 1, unit: 'head', category: 'produce' },
          { name: 'olive oil', amount: 2, unit: 'tbsp', category: 'pantry' },
          { name: 'lemon', amount: 1, unit: 'piece', category: 'produce' }
        ],
        instructions: ['Preheat oven to 400F', 'Season salmon and vegetables', 'Bake for 20 minutes', 'Serve with lemon'],
        nutrition: { calories: 380, protein: 35, carbs: 10, fat: 22, fiber: 5, sugar: 4 },
        estimatedCost: 18.00,
        cookTime: 25,
        prepTime: 10,
        servings: preferences.peoplePerMeal || 2,
        difficulty: 'intermediate',
        cuisine: 'American',
        tags: ['healthy', 'omega-3']
      },
      {
        id: 'recipe-4',
        title: 'Turkey and Vegetable Soup',
        description: 'Hearty and nutritious turkey soup with mixed vegetables',
        ingredients: [
          { name: 'ground turkey', amount: 1, unit: 'lb', category: 'meat' },
          { name: 'mixed soup vegetables', amount: 3, unit: 'cups', category: 'produce' },
          { name: 'chicken broth', amount: 4, unit: 'cups', category: 'pantry' },
          { name: 'herbs and spices', amount: 1, unit: 'tsp', category: 'pantry' }
        ],
        instructions: ['Brown turkey in pot', 'Add vegetables and broth', 'Simmer for 30 minutes', 'Season to taste'],
        nutrition: { calories: 280, protein: 25, carbs: 20, fat: 12, fiber: 6, sugar: 8 },
        estimatedCost: 11.00,
        cookTime: 35,
        prepTime: 10,
        servings: preferences.peoplePerMeal || 2,
        difficulty: 'easy',
        cuisine: 'American',
        tags: ['healthy', 'comfort-food']
      },
      {
        id: 'recipe-5',
        title: 'Mediterranean Quinoa Bowl',
        description: 'Fresh and healthy quinoa bowl with Mediterranean flavors',
        ingredients: [
          { name: 'quinoa', amount: 1, unit: 'cup', category: 'pantry' },
          { name: 'cherry tomatoes', amount: 2, unit: 'cups', category: 'produce' },
          { name: 'cucumber', amount: 1, unit: 'piece', category: 'produce' },
          { name: 'feta cheese', amount: 0.5, unit: 'cup', category: 'dairy' },
          { name: 'olive oil', amount: 2, unit: 'tbsp', category: 'pantry' }
        ],
        instructions: ['Cook quinoa according to package', 'Chop vegetables', 'Combine all ingredients', 'Drizzle with olive oil'],
        nutrition: { calories: 320, protein: 12, carbs: 45, fat: 14, fiber: 8, sugar: 6 },
        estimatedCost: 9.50,
        cookTime: 20,
        prepTime: 15,
        servings: preferences.peoplePerMeal || 2,
        difficulty: 'easy',
        cuisine: 'Mediterranean',
        tags: ['healthy', 'vegetarian']
      },
      {
        id: 'recipe-6',
        title: 'Beef and Broccoli',
        description: 'Classic beef and broccoli stir fry with savory sauce',
        ingredients: [
          { name: 'beef strips', amount: 1, unit: 'lb', category: 'meat' },
          { name: 'broccoli florets', amount: 3, unit: 'cups', category: 'produce' },
          { name: 'teriyaki sauce', amount: 3, unit: 'tbsp', category: 'pantry' },
          { name: 'garlic', amount: 2, unit: 'cloves', category: 'produce' }
        ],
        instructions: ['Cook beef in hot pan', 'Add broccoli and garlic', 'Stir in sauce', 'Cook until tender'],
        nutrition: { calories: 390, protein: 32, carbs: 18, fat: 20, fiber: 5, sugar: 10 },
        estimatedCost: 15.00,
        cookTime: 18,
        prepTime: 12,
        servings: preferences.peoplePerMeal || 2,
        difficulty: 'easy',
        cuisine: 'Asian',
        tags: ['healthy', 'quick']
      },
      {
        id: 'recipe-7',
        title: 'Vegetarian Chili',
        description: 'Hearty vegetarian chili with beans and vegetables',
        ingredients: [
          { name: 'mixed beans', amount: 2, unit: 'cans', category: 'pantry' },
          { name: 'diced tomatoes', amount: 1, unit: 'can', category: 'pantry' },
          { name: 'bell peppers', amount: 2, unit: 'pieces', category: 'produce' },
          { name: 'onion', amount: 1, unit: 'piece', category: 'produce' },
          { name: 'chili spices', amount: 2, unit: 'tbsp', category: 'pantry' }
        ],
        instructions: ['Sauté vegetables', 'Add beans and tomatoes', 'Season with spices', 'Simmer for 25 minutes'],
        nutrition: { calories: 310, protein: 18, carbs: 55, fat: 6, fiber: 15, sugar: 12 },
        estimatedCost: 7.50,
        cookTime: 30,
        prepTime: 15,
        servings: preferences.peoplePerMeal || 2,
        difficulty: 'easy',
        cuisine: 'American',
        tags: ['healthy', 'vegetarian', 'high-fiber']
      }
    ]

    const targetRecipes = preferences.mealsPerWeek || 3
    const selectedRecipes = targetRecipes <= fallbackRecipes.length 
      ? fallbackRecipes.slice(0, targetRecipes)
      : [...fallbackRecipes, ...fallbackRecipes.slice(0, targetRecipes - fallbackRecipes.length)]
    
    const mealPlan = {
      id: `plan_${Date.now()}`,
      userId,
      recipes: selectedRecipes,
      backupRecipes: [],
      subtotalEstimate: selectedRecipes.reduce((sum, recipe) => sum + recipe.estimatedCost, 0),
      ingredientMatchPct: 90,
      status: 'draft',
      preferences,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    return NextResponse.json({
      success: true,
      planId: mealPlan.id,
      mealPlan,
      fallback: true
    })
  } catch (fallbackError) {
    console.error('Fallback meal plan failed:', fallbackError)
    return NextResponse.json({
      error: 'Service temporarily unavailable'
    }, { status: 503 })
  }
}

