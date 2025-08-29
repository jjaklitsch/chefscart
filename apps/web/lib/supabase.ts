import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

// Single browser client instance to avoid multiple instances
let browserClientInstance: ReturnType<typeof createBrowserClient> | null = null

// Legacy client for API routes (server-side)
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

// Export createClient as an alias for compatibility with existing code
export { getSupabaseClient as createClient }

// Single auth client instance for browser usage - prevents multiple instances
export const createAuthClient = () => {
  if (!browserClientInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    browserClientInstance = createBrowserClient(supabaseUrl, supabaseKey)
  }
  
  return browserClientInstance
}

// User profile interface
export interface UserProfile {
  id: string
  email: string
  zipCode?: string
  preferences?: any
  completedOnboarding?: boolean
  createdAt: string
  updatedAt: string
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