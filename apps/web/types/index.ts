export interface User {
  id: string
  email?: string
  zip: string
  prefs: UserPreferences
  pantryItems: string[]
  createdAt: Date
}

export interface UserPreferences {
  // Legacy fields for compatibility
  mealsPerWeek: number
  peoplePerMeal: number
  mealTypes: MealType[]
  diets: string[]
  allergies: string[]
  avoidIngredients?: string[]
  organicPreference: 'preferred' | 'only_if_within_10_percent' | 'no_preference'
  maxCookTime: number
  cookingSkillLevel: 'beginner' | 'intermediate' | 'advanced'
  preferredCuisines: string[]
  preferredRetailers?: string[]
  selectedMealTypes?: string[] // Temporary field used during conversation flow
  selectedRecipes?: Recipe[] // Selected recipes from meal cards
  
  // New comprehensive onboarding fields
  adults?: number
  kids?: number
  breakfastsPerWeek?: number
  lunchesPerWeek?: number
  dinnersPerWeek?: number
  snacksPerWeek?: number
  dessertsPerWeek?: number
  dietaryStyle?: string[]
  foodsToAvoid?: string[]
  healthGoal?: 'weight_loss' | 'muscle_gain' | 'maintain' | 'family_balanced' | 'athletic'
  maxCookingTime?: number
  budgetSensitivity?: 'no_limit' | 'under_8' | 'under_12' | 'under_18' | 'custom'
  customBudgetAmount?: string
  cuisinePreferences?: string[]
  additionalConsiderations?: string
  dietaryStyleOther?: string
  cuisinePreferencesOther?: string
  favoriteFoods?: string[]
  favoriteFoodsCustom?: string
  mealParticipation?: 'yes' | 'no'
  breakfastAdults?: number
  breakfastKids?: number
  lunchAdults?: number
  lunchKids?: number
  dinnerAdults?: number
  dinnerKids?: number
  snacksAdults?: number
  snacksKids?: number
  dessertsAdults?: number
  dessertsKids?: number
  // Fridge/pantry photo upload fields
  fridgePantryPhotos?: File[]
  identifiedIngredients?: string[]
  manuallyAddedIngredients?: string[]
  skipPhotoUpload?: boolean
  pantryItems?: string[] // Legacy compatibility field
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
  mealType?: string
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
  imageUrl?: string
  imageLoading?: boolean
  imageError?: boolean
  selected?: boolean
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

// Voice-related types
export interface VoiceRecordingState {
  isRecording: boolean
  isInitialized: boolean
  audioLevel: number
  duration: number
  error?: string
}

export interface VoiceTranscriptionRequest {
  audioBlob: Blob
  language?: string
}

export interface VoiceTranscriptionResponse {
  text: string
  confidence?: number
  language?: string
  duration?: number
}

export interface VoiceSynthesisRequest {
  text: string
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed?: number
}

export interface VoiceSynthesisResponse {
  audioBuffer: ArrayBuffer
  contentType: string
}

export interface AudioPermissionState {
  hasPermission: boolean
  isRequesting: boolean
  error?: string
}

// Conversation Flow Types
export interface ConversationStep {
  id: string
  type: 'question' | 'confirmation' | 'completion'
  question: string
  preferenceKey: keyof UserPreferences
  quickReplies?: QuickReply[]
  required: boolean
  dependsOn?: string[]
  validator?: (value: any) => boolean
}

export interface QuickReply {
  id: string
  text: string
  value: any
  icon?: string
  allowMultiple?: boolean
  selected?: boolean
}

export interface ConversationFlow {
  currentStepId: string | null
  completedSteps: Set<string>
  stepData: Record<string, any>
  isComplete: boolean
}

export type ConversationStepId = 
  | 'meal_types' 
  | 'dietary_restrictions' 
  | 'cooking_time' 
  | 'cuisine_preferences' 
  | 'meal_selection'
  | 'final_confirmation'

// Meal Card Selection Types
export interface MealCardSelectionState {
  selectedMeals: Recipe[]
  availableMeals: Recipe[]
  minSelections: number
  maxSelections: number
  isLoading: boolean
}

export interface MealCardProps {
  recipe: Recipe
  isSelected: boolean
  onSelect: (recipe: Recipe) => void
  onDeselect: (recipe: Recipe) => void
  showNutrition?: boolean
  showIngredients?: boolean
}

export interface MealCardGridProps {
  recipes: Recipe[]
  selectedRecipes: Recipe[]
  onSelectionChange: (selectedRecipes: Recipe[]) => void
  minSelections?: number
  maxSelections?: number
  isLoading?: boolean
  onRequestMore?: () => void
}