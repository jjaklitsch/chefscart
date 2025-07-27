export interface User {
  id: string
  email?: string
  zip: string
  prefs: UserPreferences
  pantryItems: string[]
  createdAt: Date
}

export interface UserPreferences {
  mealsPerWeek: number
  peoplePerMeal: number
  mealTypes: MealType[]
  diets: string[]
  allergies: string[]
  avoidIngredients: string[]
  organicPreference: 'preferred' | 'only_if_within_10_percent' | 'no_preference'
  maxCookTime: number
  cookingSkillLevel: 'beginner' | 'intermediate' | 'advanced'
  preferredCuisines: string[]
  preferredRetailers: string[]
  selectedMealTypes?: string[] // Temporary field used during conversation flow
}

export interface MealType {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'dessert' | 'coffee'
  days: string[]
  adults?: number
  kids?: number
}

export interface Recipe {
  id: string
  title: string
  description: string
  ingredients: Ingredient[]
  instructions: string[]
  nutrition: NutritionInfo
  estimatedCost: number
  cookTime: number
  prepTime: number
  servings: number
  difficulty: 'easy' | 'medium' | 'hard'
  cuisine: string
  tags: string[]
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

export interface MealPlan {
  id: string
  userId: string
  recipes: Recipe[]
  backupRecipes: Recipe[]
  subtotalEstimate: number
  ingredientMatchPct: number
  status: 'draft' | 'reviewed' | 'cart_linked'
  createdAt: Date
  updatedAt: Date
}

export interface InstacartList {
  id: string
  planId: string
  shoppingListURL: string
  oosItems: string[]
  createdAt: Date
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ZipCodeValidation {
  isValid: boolean
  hasInstacartCoverage: boolean
  city?: string
  state?: string
  message?: string
}

export interface GeoIPLocation {
  zipCode: string | null
  city: string | null
  state: string | null
}

export interface WaitlistEntry {
  id?: string
  email: string
  zipCode: string
  firstName?: string
  lastName?: string
  city?: string
  state?: string
  createdAt: Date
  source: 'zip_validation' | 'manual'
  notified?: boolean
  notes?: string
}

export interface WaitlistRequest {
  email: string
  zipCode: string
  firstName?: string
  lastName?: string
}

export interface WaitlistResponse {
  success: boolean
  message: string
  entryId?: string
  error?: string
  details?: string
}

export interface USPSCityStateResponse {
  zip5: string
  city: string
  state: string
}

export interface IPAPIResponse {
  status: string
  zip?: string
  city?: string
  region?: string
  country?: string
  message?: string
}

export interface InstacartProduct {
  id: string
  name: string
  price: number
  unit: string
  store: string
  availability: boolean
}