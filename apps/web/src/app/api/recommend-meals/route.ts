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
  courses: string[]  // Added missing courses field for meal categorization
  time_total_min: number
  servings_default: number
  cost_per_serving: string
  allergens_present: string[]
  spice_level: number
  prep_time?: number
  cook_time?: number
  cooking_difficulty?: 'easy' | 'medium' | 'challenging'
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
    const mealTags = (meal.diets_supported || []).map(normalizeDietaryTag)
    
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
    const hasCuisineMatch = (meal.cuisines || []).some(cuisine => 
      normalizedUserCuisines.includes(cuisine.toLowerCase())
    )
    if (hasCuisineMatch) {
      score += 15
    }
  }

  // Spice level matching - strict filtering for low tolerance
  const userSpiceTolerance = preferences.spiceTolerance ? parseInt(preferences.spiceTolerance) : 3
  
  // If user selected mild only (1), exclude anything spicy
  if (userSpiceTolerance === 1) {
    // Check for spicy keywords in title or description
    const spicyKeywords = ['buffalo', 'spicy', 'hot', 'chili', 'jalapeño', 'sriracha', 'harissa', 'gochujang', 'szechuan', 'sichuan', 'nashville hot', 'diablo', 'fire', 'habanero', 'ghost pepper', 'cayenne']
    const titleLower = meal.title.toLowerCase()
    const descLower = (meal.description || '').toLowerCase()
    
    const hasSpicyKeyword = spicyKeywords.some(keyword => 
      titleLower.includes(keyword) || descLower.includes(keyword)
    )
    
    if (hasSpicyKeyword || meal.spice_level > 1) {
      return -100 // Effectively exclude from results
    }
  } else if (userSpiceTolerance <= 2 && meal.spice_level > 2) {
    score -= 10 // Penalty for too spicy
  } else if (userSpiceTolerance <= 3 && meal.spice_level > 3) {
    score -= 5 // Small penalty for very spicy
  }
  
  // Extra penalty for beginners with spicy food
  if (preferences.cookingSkillLevel === 'beginner' && meal.spice_level > 2) {
    score -= 5 // Additional penalty for too spicy for beginners
  }

  // Note: Allergen/avoidance filtering is now done BEFORE scoring
  // This function should only be called on pre-filtered safe meals

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

  // Sort meals by score, but add randomization for variety
  const sortedMeals = [...meals].sort((a, b) => {
    // Group meals into score tiers for randomization
    const aTier = Math.floor(a.score / 10) // Group scores into 10-point bands
    const bTier = Math.floor(b.score / 10)
    
    // If meals are in the same score tier, randomize their order
    if (aTier === bTier) {
      return Math.random() - 0.5 // Random ordering within same tier
    }
    
    // Otherwise, sort by score (higher first)
    return b.score - a.score
  })

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

    // Enhanced diversity logic
    const isDiverseEnough = 
      cuisineFrequency < 2 || // Prefer max 2 of same cuisine initially
      (hasNewProtein && cuisineFrequency < 3) || // Allow 3rd if it's new protein
      diversifiedMeals.length < 10 // Always fill first 10 slots for variety
      
    if (isDiverseEnough) {
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
    const courseMealCounts = body.courseMealCounts || {}
    const includeBackups = body.includeBackups || false
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

    // Filter by cooking difficulty based on user's skill level
    if (preferences.cookingSkillLevel) {
      const allowedDifficulties = {
        'beginner': ['easy'],
        'intermediate': ['easy', 'medium'], 
        'advanced': ['easy', 'medium', 'challenging']
      }
      const userAllowed = allowedDifficulties[preferences.cookingSkillLevel]
      
      // Only filter if cooking_difficulty column exists (gradual migration)
      if (userAllowed) {
        query = query.in('cooking_difficulty', userAllowed)
      }
    }

    // Filter by course types based on mealTypes selection
    if (preferences.mealTypes && preferences.mealTypes.length > 0) {
      const requestedCourses = preferences.mealTypes.map((mt: any) => mt.type)
      // Use overlap operator to find meals that have any of the requested courses
      query = query.overlaps('courses', requestedCourses)
    }

    // Skip servings filter for now - all meals can be scaled
    // TODO: Re-implement servings filter with proper Supabase syntax

    // Execute query with a higher limit for filtering
    const { data: meals, error } = await query.limit(200)

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

    // HARD FILTER: Remove meals with allergens/avoided ingredients BEFORE scoring
    const avoidList = [
      ...(preferences.allergies || []),
      ...(preferences.avoidIngredients || []),
      ...(preferences.foodsToAvoid || [])
    ].map(item => item.toLowerCase())

    const saferMeals = avoidList.length > 0 
      ? meals.filter(meal => {
          // Check allergens present
          const hasAllergen = meal.allergens_present?.some(allergen =>
            avoidList.some(avoid => allergen.toLowerCase().includes(avoid))
          )
          
          // Check ingredient tags  
          const hasAvoidedIngredient = meal.ingredient_tags?.some(ingredient =>
            avoidList.some(avoid => ingredient.toLowerCase().includes(avoid))
          )
          
          // EXCLUDE meals with any allergens or avoided ingredients
          return !hasAllergen && !hasAvoidedIngredient
        })
      : meals

    console.log(`🔍 Allergen filtering: ${meals.length} → ${saferMeals.length} meals (removed ${meals.length - saferMeals.length} with allergens/avoided ingredients)`)
    
    // Score and filter meals
    const scoredMeals = saferMeals
      .map(meal => ({
        ...(meal as SupabaseMeal),
        score: calculateMealScore(meal as SupabaseMeal, preferences)
      }))
      .filter(meal => meal.score > 0) // Only include meals with positive scores
    
    
    // Log score distribution for debugging
    const scoreRanges = { '0-10': 0, '11-20': 0, '21-30': 0, '31-40': 0, '41+': 0 }
    scoredMeals.forEach(meal => {
      if (meal.score <= 10) scoreRanges['0-10']++
      else if (meal.score <= 20) scoreRanges['11-20']++
      else if (meal.score <= 30) scoreRanges['21-30']++
      else if (meal.score <= 40) scoreRanges['31-40']++
      else scoreRanges['41+']++
    })

    // Apply diversity algorithm
    const diversifiedMeals = diversifyMeals(scoredMeals)

    // If course-specific counts are provided, organize meals by course
    if (Object.keys(courseMealCounts).length > 0) {
      const mealsByType: Record<string, any[]> = {
        breakfast: [],
        lunch: [],
        dinner: []
      }
      
      const backupMealsByType: Record<string, any[]> = {
        breakfast: [],
        lunch: [],
        dinner: []
      }

      // Distribute meals to courses based on their course tags and user needs
      for (const meal of diversifiedMeals) {
        const courses = meal.courses || []
        
        // Try to assign meal to courses that need it, checking all possible courses
        let assigned = false
        
        // Check each course this meal can serve
        for (const courseType of ['breakfast', 'lunch', 'dinner']) {
          if (courses.includes(courseType)) {
            const neededForCourse = courseMealCounts[courseType] || 0
            
            // Add to primary meals if we need more for this course
            if (mealsByType[courseType].length < neededForCourse) {
              mealsByType[courseType].push(meal)
              assigned = true
              break
            }
          }
        }
        
        // Add to backups for ALL applicable courses (not just first match)
        if (includeBackups) {
          for (const courseType of ['breakfast', 'lunch', 'dinner']) {
            if (courses.includes(courseType) && backupMealsByType[courseType].length < 50) {
              // Only add if not already in primary meals for this course
              if (!mealsByType[courseType].some(m => m.id === meal.id)) {
                backupMealsByType[courseType].push(meal)
              }
            }
          }
        }
      }

      // Debug: Log meal counts by type
      console.log(`  Breakfast: ${mealsByType.breakfast.length} (needed: ${courseMealCounts.breakfast || 0})`)
      console.log(`  Lunch: ${mealsByType.lunch.length} (needed: ${courseMealCounts.lunch || 0})`)
      console.log(`  Dinner: ${mealsByType.dinner.length} (needed: ${courseMealCounts.dinner || 0})`)
      

      // Collect all selected meals for compatibility
      const finalMeals = [
        ...mealsByType.breakfast,
        ...mealsByType.lunch,
        ...mealsByType.dinner
      ]


      return NextResponse.json({
        success: true,
        meals: finalMeals,
        mealsByType,
        backupMealsByType: includeBackups ? backupMealsByType : {},
        total_count: finalMeals.length,
        message: finalMeals.length > 0 ? 'Meals recommended successfully' : 'No suitable meals found'
      })
    } else {
      // Legacy behavior - return all meals without course organization
      const finalMeals = diversifiedMeals.slice(0, limit)

      return NextResponse.json({
        success: true,
        meals: finalMeals,
        total_count: finalMeals.length,
        message: finalMeals.length > 0 ? 'Meals recommended successfully' : 'No suitable meals found'
      })
    }

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