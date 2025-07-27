import { UserPreferences, Recipe } from './index'

// OpenAI Assistant API Types
export interface AssistantThread {
  id: string
  object: string
  created_at: number
  metadata?: Record<string, any>
}

export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: Record<string, any>
  toolCalls?: AssistantToolCall[]
}

export interface AssistantToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
    output?: string
  }
}

export interface AssistantRun {
  id: string
  status: 'queued' | 'in_progress' | 'requires_action' | 'cancelling' | 'cancelled' | 'failed' | 'completed' | 'expired'
  thread_id: string
  assistant_id: string
  created_at: number
  started_at?: number
  completed_at?: number
  failed_at?: number
  cancelled_at?: number
  expires_at?: number
  last_error?: {
    code: string
    message: string
  }
  required_action?: {
    type: 'submit_tool_outputs'
    submit_tool_outputs: {
      tool_calls: AssistantToolCall[]
    }
  }
}

// Conversation Progress Types
export interface ConversationProgress {
  currentStep: ConversationStep
  completedSteps: ConversationStep[]
  readyForMealGeneration: boolean
  conversationComplete: boolean
  totalSteps: number
  progressPercentage: number
}

export type ConversationStep = 
  | 'greeting'
  | 'meal_types' 
  | 'dietary_restrictions'
  | 'cooking_preferences'
  | 'meal_generation'
  | 'meal_selection'
  | 'finalization'

// Tool Function Types
export interface ExtractPreferencesArgs {
  selectedMealTypes?: string[]
  mealConfiguration?: {
    [key: string]: {
      days: number
      adults: number
      kids: number
    }
  }
  diets?: string[]
  allergies?: string[]
  avoidIngredients?: string[]
  organicPreference?: 'preferred' | 'only_if_within_10_percent' | 'no_preference'
  maxCookTime?: number
  cookingSkillLevel?: 'beginner' | 'intermediate' | 'advanced'
  preferredCuisines?: string[]
  mealsPerWeek?: number
  peoplePerMeal?: number
}

export interface GenerateMealOptionsArgs {
  preferences: Partial<UserPreferences>
  requestedCount?: number
}

export interface FinalizeMealPlanArgs {
  selectedMeals: Array<{ id: string; title: string }>
  preferences: Partial<UserPreferences>
}

export interface UpdateProgressArgs {
  currentStep: ConversationStep
  completedSteps?: ConversationStep[]
  readyForMealGeneration?: boolean
  conversationComplete?: boolean
}

// Tool Function Results
export interface ExtractPreferencesResult {
  success: boolean
  extracted?: Partial<UserPreferences>
  message: string
  error?: string
}

export interface GenerateMealOptionsResult {
  success: boolean
  meals?: Recipe[]
  count?: number
  message: string
  error?: string
}

export interface FinalizeMealPlanResult {
  success: boolean
  cartCreated?: boolean
  cartUrl?: string
  selectedMeals?: Array<{ id: string; title: string; selected: boolean }>
  message: string
  error?: string
}

export interface UpdateProgressResult {
  success: boolean
  progress?: ConversationProgress
  message: string
  error?: string
}

// API Response Types
export interface AssistantChatRequest {
  message: string
  threadId?: string
  context?: {
    preferences?: Partial<UserPreferences>
    conversationHistory?: any[]
    currentStep?: string
    completedSteps?: string[]
  }
}

export interface AssistantChatResponse {
  success: boolean
  threadId?: string
  response?: string
  extractedData?: Partial<UserPreferences>
  generatedMeals?: Recipe[]
  conversationProgress?: ConversationProgress
  conversationFlow?: {
    currentStep: string
    completedSteps: string[]
    isComplete: boolean
  }
  messages?: AssistantMessage[]
  isComplete?: boolean
  error?: string
  details?: string
}

export interface ThreadManagementRequest {
  action: 'create' | 'delete' | 'get_messages'
  threadId?: string
}

export interface ThreadManagementResponse {
  success: boolean
  threadId?: string
  messages?: AssistantMessage[]
  message?: string
  error?: string
}

// Service Layer Types
export interface AssistantConfig {
  name: string
  model: string
  description: string
  instructions: string
  tools: any[]
}

export interface AssistantServiceOptions {
  apiKey?: string
  baseUrl?: string
  timeout?: number
  retryAttempts?: number
}

// Error Types
export class AssistantError extends Error {
  constructor(
    message: string,
    public readonly code: AssistantErrorCode,
    public readonly details?: any,
    public readonly retryable: boolean = false
  ) {
    super(message)
    this.name = 'AssistantError'
  }
}

export enum AssistantErrorCode {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  ASSISTANT_NOT_FOUND = 'ASSISTANT_NOT_FOUND',
  THREAD_NOT_FOUND = 'THREAD_NOT_FOUND',
  RUN_FAILED = 'RUN_FAILED',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Integration Types
export interface MealGenerationIntegration {
  generateMeals(preferences: UserPreferences): Promise<Recipe[]>
}

export interface CartCreationIntegration {
  createCart(meals: Recipe[], preferences: UserPreferences): Promise<{
    success: boolean
    cartUrl?: string
    error?: string
  }>
}

// Validation Types
export interface PreferencesValidator {
  validateMealTypes(mealTypes: string[]): boolean
  validateDiets(diets: string[]): boolean
  validateCookingTime(time: number): boolean
  validateCuisines(cuisines: string[]): boolean
}

// Storage Types
export interface ConversationStorage {
  saveThread(threadId: string, metadata?: Record<string, any>): Promise<void>
  loadThread(): Promise<string | null>
  clearThread(): Promise<void>
  savePreferences(preferences: Partial<UserPreferences>): Promise<void>
  loadPreferences(): Promise<Partial<UserPreferences> | null>
}

// Metrics and Analytics Types
export interface ConversationMetrics {
  conversationId: string
  threadId: string
  startTime: Date
  endTime?: Date
  totalMessages: number
  toolCallsCount: number
  stepsCompleted: ConversationStep[]
  completionRate: number
  userSatisfaction?: number
  errors: AssistantError[]
}

export interface AnalyticsEvent {
  event: 'conversation_started' | 'step_completed' | 'preferences_extracted' | 'meals_generated' | 'conversation_completed' | 'error_occurred'
  timestamp: Date
  data: Record<string, any>
  userId?: string
  sessionId?: string
}