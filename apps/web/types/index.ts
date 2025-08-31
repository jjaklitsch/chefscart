export interface User {
  id: string
  email?: string
  zip: string
  prefs: UserPreferences
  pantryItems: string[]
  createdAt: Date
}

export interface UserPreferences {
  // Core meal planning (from planSelector step)
  peoplePerMeal: number
  mealsPerWeek: number // calculated: breakfasts + lunches + dinners
  breakfastsPerWeek?: number
  lunchesPerWeek?: number
  dinnersPerWeek?: number
  
  // Dietary preferences (from dietaryStyle step)
  dietaryStyle?: string[]
  
  // Cuisine preferences (from cuisinePreferences step)
  preferredCuisines: string[]
  
  // Foods to avoid (from foodsToAvoid step)
  foodsToAvoid?: string[]
  
  // Favorite foods (from favoriteFoods step)
  favoriteFoods?: string[]
  
  // Organic preference (from organicPreference step)
  organicPreference: 'yes' | 'no'
  
  // Spice tolerance (from spiceTolerance step)
  spiceTolerance?: string // 1-5 scale as string
  
  // Pantry/fridge items (from fridgePantryPhotos step)
  identifiedIngredients?: Array<{ name: string; quantity: number; unit: string }>
  manuallyAddedIngredients?: string[]
  skipPhotoUpload?: boolean
  
  // Location data
  zipCode?: string
  
  // Legacy/compatibility fields (can be removed later)
  pantryItems?: string[]
  maxCookingTime?: number // Only used in API, not collected
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
  ingredients_canonical?: CanonicalIngredientsData
  // Favorite-related fields
  isFavorited?: boolean
  favoriteId?: string
  favoritedAt?: string
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
  // Reordering fields
  originalPlanId?: string
  reorderCount?: number
  lastReorderedAt?: Date
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

export interface InstacartRetailer {
  retailer_key: string
  name: string
  retailer_logo_url: string
}

export interface RetailersResponse {
  success: boolean
  retailers: InstacartRetailer[]
  message: string
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

// Meal recommendation types
export interface MealRecommendationRequest {
  preferences: UserPreferences
  limit?: number
}

export interface MealRecommendationResponse {
  success: boolean
  meals: Recipe[]
  total_count: number
  message?: string
  error?: string
  details?: string
}

// Canonical Ingredients System Types
export interface CanonicalIngredient {
  id: number
  spoonacular_id?: number
  canonical_name: string
  category?: string
  common_units?: string[]
  shopping_units?: string[]
  default_shopping_unit?: string
  typical_package_size?: string
  is_perishable?: boolean
  storage_type?: string
  created_at?: string
  updated_at?: string
}

export interface IngredientAlias {
  id: number
  canonical_ingredient_id: number
  alias_name: string
  alias_type: string
  confidence_score: number
  created_at?: string
}

export interface CanonicalIngredientMatch {
  ingredient: CanonicalIngredient
  confidence: number
  matchType: 'exact' | 'fuzzy' | 'alias' | 'ai_classification'
  source?: string
}

export interface EnhancedIngredient {
  canonical_id: number | null
  canonical_name: string | null
  display_name: string
  quantity: number
  unit: string
  category: string
  preparation?: string | null
  shopping_equivalent: {
    quantity: number
    unit: string
    size_guide?: string | null
  }
  match_confidence: number
  match_type: string
}

export interface CanonicalIngredientsData {
  servings: number
  ingredients: EnhancedIngredient[]
  generation_date: string
  total_ingredient_count: number
  matched_ingredient_count: number
}

// Favorites-related types
export interface UserFavoriteMeal {
  id: string
  userId: string
  mealId: number
  createdAt: Date
}

export interface FavoritesResponse {
  success: boolean
  favorites: Recipe[]
  count: number
  error?: string
}

export interface FavoriteCheckResponse {
  success: boolean
  favorites: Record<string, boolean>
  error?: string
}

export interface ReorderResponse {
  success: boolean
  mealPlan: MealPlan
  message: string
  error?: string
}

// Social Cooking Platform Types

// Extended user profile for social features
export interface SocialUserProfile {
  id: string
  created_at: string
  updated_at: string
  
  // Basic profile info
  username: string
  display_name: string
  bio?: string
  avatar_url?: string
  cover_image_url?: string
  location?: string
  website_url?: string
  
  // Social stats
  follower_count: number
  following_count: number
  recipe_count: number
  total_likes_received: number
  
  // Profile settings
  is_public: boolean
  is_verified: boolean
  
  // Existing ChefCart compatibility
  zip_code?: string
  preferences?: UserPreferences
  completed_onboarding: boolean
}

// User-generated recipe interface
export interface UserRecipe {
  id: string
  created_at: string
  updated_at: string
  
  // Author info
  author_id: string
  author?: SocialUserProfile
  
  // Recipe content
  slug: string
  title: string
  description: string
  story?: string
  
  // Media (images only)
  image_urls: string[]
  
  // Recipe classification (same as existing meals)
  cuisines: string[]
  courses: string[]
  diets_supported: string[]
  allergens_present: string[]
  ingredient_tags: string[]
  
  // Cooking info
  prep_time?: number
  cook_time?: number
  total_time?: number
  servings_default: number
  difficulty: 'easy' | 'medium' | 'challenging'
  spice_level: number
  cost_estimate: '$' | '$$' | '$$$'
  
  // Recipe content (same format as existing meals)
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
  tips_json?: {
    tips: string[]
    variations?: string[]
  }
  nutrition_json?: NutritionInfo
  
  // Social metrics
  like_count: number
  save_count: number
  comment_count: number
  view_count: number
  share_count: number
  
  // User interaction state (populated when fetched for specific user)
  is_liked?: boolean
  is_saved?: boolean
  
  // Moderation
  status: 'draft' | 'published' | 'archived' | 'flagged'
  featured_at?: string
}

// Recipe interactions (likes, saves, views)
export interface RecipeInteraction {
  id: string
  user_id: string
  recipe_id: string
  interaction_type: 'like' | 'save' | 'view'
  created_at: string
}

// Comments and reviews
export interface RecipeComment {
  id: string
  created_at: string
  updated_at: string
  
  recipe_id: string
  author_id: string
  author?: SocialUserProfile
  parent_comment_id?: string
  
  content: string
  rating?: number // 1-5 stars
  images: string[]
  
  like_count: number
  reply_count: number
  replies?: RecipeComment[] // Populated when fetching with nested replies
  
  status: 'published' | 'flagged' | 'deleted'
}

// Recipe collections/cookbooks
export interface RecipeCollection {
  id: string
  created_at: string
  updated_at: string
  
  owner_id: string
  owner?: SocialUserProfile
  name: string
  description?: string
  cover_image_url?: string
  is_public: boolean
  recipe_count: number
  
  recipes?: UserRecipe[] // Populated when fetching collection with recipes
}

// Join table for recipes in collections
export interface CollectionRecipe {
  collection_id: string
  recipe_id: string
  added_at: string
  notes?: string
}

// User following relationships
export interface UserFollow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
  
  follower?: SocialUserProfile
  following?: SocialUserProfile
}

// API Response Types

export interface UserRecipesResponse {
  success: boolean
  recipes: UserRecipe[]
  total_count: number
  has_more: boolean
  error?: string
}

export interface RecipeCommentsResponse {
  success: boolean
  comments: RecipeComment[]
  total_count: number
  has_more: boolean
  error?: string
}

export interface UserProfileResponse {
  success: boolean
  profile: SocialUserProfile
  error?: string
}

export interface FollowersResponse {
  success: boolean
  users: SocialUserProfile[]
  total_count: number
  has_more: boolean
  error?: string
}

export interface RecipeCollectionsResponse {
  success: boolean
  collections: RecipeCollection[]
  total_count: number
  error?: string
}

// Recipe submission form types
export interface RecipeSubmissionData {
  title: string
  description: string
  story?: string
  courses: string[]
  cuisines: string[]
  prep_time?: number
  cook_time?: number
  servings_default: number
  difficulty: 'easy' | 'medium' | 'challenging'
  spice_level: number
  cost_estimate: '$' | '$$' | '$$$'
  ingredients: Array<{
    display_name: string
    quantity: number
    unit: string
    optional?: boolean
  }>
  instructions: Array<{
    step_no: number
    text: string
    time_min?: number
  }>
  tips?: string[]
  image_files?: File[]
}

// Social feed types
export interface FeedItem {
  type: 'recipe' | 'follow' | 'comment' | 'collection'
  id: string
  created_at: string
  user: SocialUserProfile
  recipe?: UserRecipe
  comment?: RecipeComment
  collection?: RecipeCollection
  follow?: UserFollow
}

export interface SocialFeedResponse {
  success: boolean
  items: FeedItem[]
  has_more: boolean
  next_cursor?: string
  error?: string
}