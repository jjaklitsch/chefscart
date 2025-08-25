import { createClient } from '@supabase/supabase-js'

// Lazy initialization to prevent build-time issues
let supabaseInstance: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey)
  }

  return supabaseInstance
}

// Database interfaces
export interface Meal {
  id: string
  name: string
  description: string
  cuisine: string
  dietary_tags: string[]
  cook_time_minutes: number
  prep_time_minutes: number
  total_time_minutes: number
  servings: number
  difficulty_level: 'easy' | 'medium' | 'hard'
  ingredients: Ingredient[]
  instructions: string[]
  nutrition: NutritionInfo
  image_url?: string
  created_at: string
  updated_at: string
}

export interface Ingredient {
  name: string
  amount: number
  unit: string
  category?: string
}

export interface NutritionInfo {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
}

// Meal recommendation request interface
export interface MealRecommendationRequest {
  dietary_restrictions?: string[]
  allergies?: string[]
  avoidIngredients?: string[]
  maxCookTime?: number
  preferredCuisines?: string[]
  spiceTolerance?: string
  cookingSkillLevel?: 'beginner' | 'intermediate' | 'advanced'
  healthGoal?: 'weight_loss' | 'muscle_gain' | 'maintain' | 'family_balanced' | 'athletic'
  limit?: number
}

// Meal recommendation response interface
export interface MealRecommendationResponse {
  success: boolean
  meals: Meal[]
  total_count: number
  message?: string
  error?: string
}