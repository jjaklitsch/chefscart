import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '../../../../lib/supabase'
import { UserPreferences } from '../../../../types/index'

// Updated Meal interface to match Supabase schema
interface SupabaseMeal {
  id: string
  title: string
  description: string
  cuisines: string[]
  diets_supported: string[]
  time_total_min: number
  servings_default: number
  cost_per_serving: string
  allergens_present: string[]
  spice_level: number
  ingredient_tags: string[]
  ingredients_json: {
    servings: number
    ingredients: Array<{
      display_name: string
      quantity: number
      unit: string
      grams?: number
      optional?: boolean
    }>
  }
  instructions_json: {
    steps: Array<{
      step_no: number
      text: string
      time_min?: number
    }>
    time_total_min: number
  }
  image_url?: string
}

export const dynamic = 'force-dynamic'

// Helper function to normalize dietary restrictions for matching
function normalizeDietaryTag(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Helper function to calculate meal score based on user preferences
function calculateMealScore(meal: SupabaseMeal, preferences: UserPreferences): number {
  let score = 0

  // Base score
  score += 10

  // Dietary restrictions matching (high priority)
  if (preferences.diets && preferences.diets.length > 0) {
    const userDiets = preferences.diets.map(normalizeDietaryTag)
    const mealTags = meal.diets_supported.map(normalizeDietaryTag)
    
    const dietMatches = userDiets.filter(diet => mealTags.includes(diet)).length
    score += dietMatches * 20 // High weight for dietary matches
    
    // Penalty if meal doesn't match any dietary restrictions
    if (dietMatches === 0 && userDiets.length > 0) {
      score -= 15
    }
  }

  // Cook time preference (medium priority)
  if (preferences.maxCookTime || preferences.maxCookingTime) {
    const maxTime = preferences.maxCookTime || preferences.maxCookingTime || 60
    if (meal.time_total_min <= maxTime) {
      score += 15
    } else {
      // Penalty for exceeding preferred cook time
      const overtime = meal.time_total_min - maxTime
      score -= Math.min(overtime / 5, 10) // Max penalty of 10 points
    }
  }

  // Cuisine preferences (medium priority)
  if (preferences.preferredCuisines && preferences.preferredCuisines.length > 0) {
    const normalizedUserCuisines = preferences.preferredCuisines.map(c => c.toLowerCase())
    const hasCuisineMatch = meal.cuisines.some(cuisine => 
      normalizedUserCuisines.includes(cuisine.toLowerCase())
    )
    if (hasCuisineMatch) {
      score += 15
    }
  }

  // Spice level matching based on cooking skill (beginner = low spice)
  if (preferences.cookingSkillLevel === 'beginner' && meal.spice_level > 2) {
    score -= 5 // Penalty for too spicy for beginners
  }

  // Allergy and ingredient avoidance (highest priority - negative scoring)
  const avoidList = [
    ...(preferences.allergies || []),
    ...(preferences.avoidIngredients || []),
    ...(preferences.foodsToAvoid || [])
  ].map(item => item.toLowerCase())

  if (avoidList.length > 0) {
    // Check allergens present
    const hasAllergen = meal.allergens_present.some(allergen =>
      avoidList.some(avoid => allergen.toLowerCase().includes(avoid))
    )
    
    // Check ingredient tags
    const hasAvoidedIngredient = meal.ingredient_tags.some(ingredient =>
      avoidList.some(avoid => ingredient.toLowerCase().includes(avoid))
    )
    
    if (hasAllergen || hasAvoidedIngredient) {
      score -= 50 // Heavy penalty for avoided ingredients/allergens
    }
  }

  // Cost preference (basic scoring - lower cost per serving is better for families)
  if (preferences.peoplePerMeal > 2) {
    if (meal.cost_per_serving === '$') {
      score += 5 // Bonus for budget-friendly meals for larger groups
    } else if (meal.cost_per_serving === '$$$') {
      score -= 3 // Small penalty for expensive meals for larger groups
    }
  }

  return Math.max(0, score) // Ensure non-negative score
}

// Helper function to ensure meal variety in recommendations
function diversifyMeals(meals: (SupabaseMeal & { score: number })[]): SupabaseMeal[] {
  const diversifiedMeals: SupabaseMeal[] = []
  const cuisineCount: Record<string, number> = {}
  const proteinCount: Record<string, number> = {}

  // Sort meals by score first
  const sortedMeals = [...meals].sort((a, b) => b.score - a.score)

  for (const meal of sortedMeals) {
    // Use the first cuisine if multiple exist
    const cuisine = meal.cuisines[0]?.toLowerCase() || 'other'
    
    // Extract protein ingredients from ingredient_tags
    const proteins = meal.ingredient_tags.filter(tag => 
      ['chicken', 'beef', 'pork', 'fish', 'tuna', 'salmon', 'shrimp', 'turkey', 'lamb', 'tofu', 'beans', 'lentils'].some(protein => 
        tag.toLowerCase().includes(protein)
      )
    )

    // Check if we have too many of this cuisine type
    const cuisineFrequency = cuisineCount[cuisine] || 0
    
    // Check protein diversity
    const hasNewProtein = proteins.length === 0 || proteins.some(protein => 
      (proteinCount[protein.toLowerCase()] || 0) < 2
    )

    // Allow meal if:
    // - We don't have too many of this cuisine (max 3 per cuisine)
    // - Or it introduces new protein variety
    // - Or it's a top scoring meal and we need to fill quota
    if (cuisineFrequency < 3 || hasNewProtein || diversifiedMeals.length < 15) {
      diversifiedMeals.push(meal)
      
      // Update counters
      cuisineCount[cuisine] = cuisineFrequency + 1
      proteins.forEach(protein => {
        proteinCount[protein.toLowerCase()] = (proteinCount[protein.toLowerCase()] || 0) + 1
      })
    }

    // Stop when we have enough recommendations
    if (diversifiedMeals.length >= 30) break
  }

  return diversifiedMeals
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const preferences: UserPreferences = body.preferences
    const limit = body.limit || 25

    if (!preferences) {
      return NextResponse.json({
        success: false,
        error: 'User preferences are required'
      }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    // Build query with filters
    let query = supabase
      .from('meals')
      .select('*')

    // Filter by cook time if specified
    if (preferences.maxCookTime || preferences.maxCookingTime) {
      const maxTime = preferences.maxCookTime || preferences.maxCookingTime || 60
      query = query.lte('time_total_min', maxTime * 1.2) // Allow 20% buffer
    }

    // Execute query with a higher limit for filtering
    const { data: meals, error } = await query.limit(100)

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch meals from database'
      }, { status: 500 })
    }

    if (!meals || meals.length === 0) {
      return NextResponse.json({
        success: true,
        meals: [],
        total_count: 0,
        message: 'No meals found matching your preferences'
      })
    }

    // Score and filter meals based on preferences
    const scoredMeals = meals
      .map(meal => ({
        ...(meal as SupabaseMeal),
        score: calculateMealScore(meal as SupabaseMeal, preferences)
      }))
      .filter(meal => meal.score > 0) // Only include meals with positive scores

    // Apply diversity algorithm
    const diversifiedMeals = diversifyMeals(scoredMeals)

    // Sort by score and limit results  
    const finalMeals = diversifiedMeals.slice(0, limit)

    return NextResponse.json({
      success: true,
      meals: finalMeals,
      total_count: finalMeals.length,
      message: finalMeals.length > 0 ? 'Meals recommended successfully' : 'No suitable meals found'
    })

  } catch (error) {
    console.error('Meal recommendation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate meal recommendations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint for testing with query parameters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters into preferences
    const preferences: UserPreferences = {
      diets: searchParams.get('diets')?.split(',').filter(d => d.trim()) || [],
      allergies: searchParams.get('allergies')?.split(',').filter(a => a.trim()) || [],
      maxCookTime: (() => {
        const cookTimeParam = searchParams.get('maxCookTime')
        return cookTimeParam ? parseInt(cookTimeParam) : 60
      })(),
      preferredCuisines: searchParams.get('cuisines')?.split(',').filter(c => c.trim()) || [],
      cookingSkillLevel: searchParams.get('skillLevel') as 'beginner' | 'intermediate' | 'advanced' || undefined,
      healthGoal: searchParams.get('healthGoal') as any || undefined,
      // Default values for required fields
      mealsPerWeek: 7,
      peoplePerMeal: parseInt(searchParams.get('peoplePerMeal') || '2'),
      mealTypes: [],
      organicPreference: 'no_preference'
    }

    const limitParam = searchParams.get('limit')
    const limit: number = limitParam ? parseInt(limitParam) : 10

    // Create a request body and call the POST handler
    const mockRequest = {
      json: async () => ({ preferences, limit })
    } as NextRequest

    return await POST(mockRequest)

  } catch (error) {
    console.error('GET meal recommendation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process GET request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}