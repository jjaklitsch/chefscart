import { NextRequest, NextResponse } from 'next/server'
import { UserPreferences, Recipe, MealType } from '../../../../../types'

interface ToolCallRequest {
  function_name: string
  arguments: any
  call_id?: string
}

interface MealGenerationArgs {
  preferences: Partial<UserPreferences>
  requestedCount?: number
}

interface FinalizationArgs {
  selectedMeals: Array<{ id: string; title: string }>
  preferences: Partial<UserPreferences>
}

export async function POST(request: NextRequest) {
  try {
    const body: ToolCallRequest = await request.json()
    const { function_name, arguments: args, call_id } = body

    let result

    switch (function_name) {
      case 'extract_preferences':
        result = await handleExtractPreferences(args)
        break

      case 'generate_meal_options':
        result = await handleGenerateMealOptions(args as MealGenerationArgs)
        break

      case 'finalize_meal_plan':
        result = await handleFinalizeMealPlan(args as FinalizationArgs)
        break

      case 'update_progress':
        result = await handleUpdateProgress(args)
        break

      default:
        result = {
          success: false,
          error: `Unknown function: ${function_name}`
        }
    }

    return NextResponse.json({
      success: true,
      call_id,
      function_name,
      result
    })

  } catch (error) {
    console.error('Tool function error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to execute tool function',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function handleExtractPreferences(args: any) {
  try {
    // Validate and structure the extracted preferences
    const extractedPreferences: Partial<UserPreferences> = {}

    // Map selectedMealTypes to both selectedMealTypes and mealTypes format
    if (args.selectedMealTypes && Array.isArray(args.selectedMealTypes)) {
      extractedPreferences.selectedMealTypes = args.selectedMealTypes
      
      // Convert to mealTypes format if mealConfiguration is provided
      if (args.mealConfiguration) {
        extractedPreferences.mealTypes = args.selectedMealTypes.map((mealType: string) => {
          const config = args.mealConfiguration[mealType]
          return {
            type: mealType as MealType['type'],
            days: generateDaysArray(config?.days || 5),
            adults: config?.adults || 2,
            kids: config?.kids || 0
          }
        })
      }
    }

    // Extract other preferences
    if (args.diets) extractedPreferences.diets = args.diets
    if (args.allergies) extractedPreferences.allergies = args.allergies
    if (args.avoidIngredients) extractedPreferences.avoidIngredients = args.avoidIngredients
    if (args.organicPreference) extractedPreferences.organicPreference = args.organicPreference
    if (args.maxCookTime) extractedPreferences.maxCookTime = args.maxCookTime
    if (args.cookingSkillLevel) extractedPreferences.cookingSkillLevel = args.cookingSkillLevel
    if (args.preferredCuisines) extractedPreferences.preferredCuisines = args.preferredCuisines
    if (args.mealsPerWeek) extractedPreferences.mealsPerWeek = args.mealsPerWeek
    if (args.peoplePerMeal) extractedPreferences.peoplePerMeal = args.peoplePerMeal

    return {
      success: true,
      extracted: extractedPreferences,
      message: 'Preferences extracted successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to extract preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

async function handleGenerateMealOptions(args: MealGenerationArgs) {
  try {
    const { preferences, requestedCount = 8 } = args

    // Format preferences for the meal generation API
    const formattedPreferences = formatPreferencesForMealGeneration(preferences)

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate-mealplan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        preferences: formattedPreferences
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    const meals = data.mealPlan?.recipes || []

    return {
      success: true,
      meals: meals.slice(0, requestedCount), // Limit to requested count
      count: meals.length,
      message: `Generated ${meals.length} meal options`
    }
  } catch (error) {
    console.error('Meal generation error:', error)
    return {
      success: false,
      error: `Meal generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      meals: []
    }
  }
}

async function handleFinalizeMealPlan(args: FinalizationArgs) {
  try {
    const { selectedMeals, preferences } = args

    // Here you would integrate with your cart creation API
    // For now, we'll simulate the process
    
    // Format selected meals for cart creation
    const formattedMeals = selectedMeals.map(meal => ({
      id: meal.id,
      title: meal.title,
      selected: true
    }))

    // Create shopping cart (this would call your Instacart integration)
    const cartResult = await createShoppingCart(formattedMeals, preferences)

    return {
      success: true,
      cartCreated: cartResult.success,
      cartUrl: cartResult.cartUrl,
      selectedMeals: formattedMeals,
      message: cartResult.success 
        ? 'Meal plan finalized and shopping cart created successfully!'
        : 'Meal plan saved but cart creation encountered issues'
    }
  } catch (error) {
    return {
      success: false,
      error: `Meal plan finalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

async function handleUpdateProgress(args: any) {
  try {
    // Validate progress data
    const validSteps = ['greeting', 'meal_types', 'dietary_restrictions', 'cooking_preferences', 'meal_generation', 'meal_selection', 'finalization']
    
    if (args.currentStep && !validSteps.includes(args.currentStep)) {
      throw new Error(`Invalid step: ${args.currentStep}`)
    }

    const progress = {
      currentStep: args.currentStep || 'greeting',
      completedSteps: Array.isArray(args.completedSteps) ? args.completedSteps : [],
      readyForMealGeneration: Boolean(args.readyForMealGeneration),
      conversationComplete: Boolean(args.conversationComplete)
    }

    return {
      success: true,
      progress,
      message: 'Progress updated successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: `Progress update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Helper functions
function formatPreferencesForMealGeneration(preferences: Partial<UserPreferences>): UserPreferences {
  // Convert assistant preferences format to meal generation API format
  const mealTypes: MealType[] = []
  
  if (preferences.selectedMealTypes && preferences.mealTypes) {
    // Use mealTypes if already formatted
    mealTypes.push(...preferences.mealTypes)
  } else if (preferences.selectedMealTypes) {
    // Convert selectedMealTypes to mealTypes format
    preferences.selectedMealTypes.forEach((mealType: string) => {
      mealTypes.push({
        type: mealType as MealType['type'],
        days: generateDaysArray(5), // Default to 5 days
        adults: 2,
        kids: 0
      })
    })
  }

  return {
    mealsPerWeek: preferences.mealsPerWeek || 7,
    peoplePerMeal: preferences.peoplePerMeal || 2,
    mealTypes: mealTypes.length > 0 ? mealTypes : [
      { type: 'dinner', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], adults: 2, kids: 0 }
    ],
    diets: preferences.diets || [],
    allergies: preferences.allergies || [],
    avoidIngredients: preferences.avoidIngredients || [],
    organicPreference: preferences.organicPreference || 'no_preference',
    maxCookTime: preferences.maxCookTime || 30,
    cookingSkillLevel: preferences.cookingSkillLevel || 'intermediate',
    preferredCuisines: preferences.preferredCuisines || [],
    preferredRetailers: []
  }
}

function generateDaysArray(numDays: number): string[] {
  const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  return allDays.slice(0, Math.min(numDays, 7))
}

async function createShoppingCart(meals: any[], preferences: Partial<UserPreferences>) {
  try {
    // This would call your existing cart creation API
    // For now, simulate success
    return {
      success: true,
      cartUrl: '#shopping-cart-created',
      message: 'Shopping cart created successfully'
    }
  } catch (error) {
    console.error('Cart creation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// GET method for testing tool functions
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const test = searchParams.get('test')

  if (test === 'functions') {
    return NextResponse.json({
      success: true,
      available_functions: [
        'extract_preferences',
        'generate_meal_options', 
        'finalize_meal_plan',
        'update_progress'
      ],
      message: 'Tool functions are available'
    })
  }

  return NextResponse.json({
    success: false,
    error: 'GET method requires ?test=functions parameter'
  }, { status: 400 })
}