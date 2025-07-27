import OpenAI from 'openai'
import { UserPreferences, Recipe, MealType } from '../types'
import { 
  AssistantError, 
  AssistantErrorCode, 
  ConversationProgress,
  AssistantConfig,
  AssistantServiceOptions 
} from '../types/assistant'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Validation and error handling utilities
const validateApiKey = (): void => {
  if (!process.env.OPENAI_API_KEY) {
    throw new AssistantError(
      'OpenAI API key is not configured',
      AssistantErrorCode.AUTHENTICATION_FAILED,
      { missingKey: 'OPENAI_API_KEY' }
    )
  }
}

const handleOpenAIError = (error: any): AssistantError => {
  if (error instanceof OpenAI.APIError) {
    switch (error.status) {
      case 401:
        return new AssistantError(
          'Invalid OpenAI API key',
          AssistantErrorCode.AUTHENTICATION_FAILED,
          error,
          false
        )
      case 429:
        return new AssistantError(
          'OpenAI rate limit exceeded',
          AssistantErrorCode.RATE_LIMIT_EXCEEDED,
          error,
          true
        )
      case 404:
        return new AssistantError(
          'Assistant or thread not found',
          AssistantErrorCode.ASSISTANT_NOT_FOUND,
          error,
          false
        )
      case 500:
      case 502:
      case 503:
        return new AssistantError(
          'OpenAI service temporarily unavailable',
          AssistantErrorCode.NETWORK_ERROR,
          error,
          true
        )
      default:
        return new AssistantError(
          `OpenAI API error: ${error.message}`,
          AssistantErrorCode.UNKNOWN_ERROR,
          error,
          false
        )
    }
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return new AssistantError(
      'Network connection failed',
      AssistantErrorCode.NETWORK_ERROR,
      error,
      true
    )
  }

  return new AssistantError(
    `Unexpected error: ${error.message || 'Unknown error'}`,
    AssistantErrorCode.UNKNOWN_ERROR,
    error,
    false
  )
}

const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      const assistantError = handleOpenAIError(error)
      
      // Don't retry if the error is not retryable
      if (!assistantError.retryable || attempt === maxRetries) {
        throw assistantError
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)))
    }
  }

  throw handleOpenAIError(lastError!)
}

// Assistant configuration
const ASSISTANT_CONFIG = {
  name: "Carter - ChefsCart Sous Chef",
  model: "gpt-4o",
  description: "A friendly AI sous-chef that helps users create personalized meal plans through natural conversation",
  instructions: `You are Carter, ChefsCart's friendly AI sous-chef assistant. You help users create personalized meal plans through a natural, engaging conversation.

PERSONALITY & TONE:
- Be warm, enthusiastic, and encouraging
- Use friendly, conversational language with occasional food emojis
- Show excitement about food and cooking
- Be patient and understanding of different dietary needs
- Keep responses concise (1-2 sentences) unless more detail is needed

CONVERSATION OBJECTIVES:
Your goal is to gather user preferences to create personalized meal plans. Focus on these key areas:

1. MEAL TYPES & CONFIGURATION
   - What meals they want planned (breakfast, lunch, dinner, snacks)
   - How many days per week for each meal type
   - Number of adults and kids for each meal

2. DIETARY REQUIREMENTS
   - Any dietary restrictions (vegetarian, vegan, keto, gluten-free, etc.)
   - Food allergies and intolerances
   - Ingredients they want to avoid

3. COOKING PREFERENCES
   - Maximum cooking time they're comfortable with
   - Cooking skill level (beginner, intermediate, advanced)
   - Preferred cuisines and flavors

4. PRACTICAL CONSIDERATIONS
   - Organic preference (preferred, only if within 10%, no preference)
   - Number of people per meal
   - Special requests or considerations

CONVERSATION FLOW:
- Start with a warm welcome and ask about meal types
- Progress naturally through gathering preferences
- Use the extract_preferences tool to structure collected information
- Use generate_meal_options when you have sufficient preferences
- Use finalize_meal_plan when user selects their preferred meals
- Use update_progress to track conversation state

TOOL USAGE GUIDELINES:
- extract_preferences: Use when user provides any preference information
- generate_meal_options: Use when you have meal types, basic dietary info, and cooking preferences
- finalize_meal_plan: Use when user has selected specific meals from options
- update_progress: Use to track conversation milestones and current step

RESPONSE STRATEGY:
- Ask one focused question at a time
- Acknowledge user responses enthusiastically
- Extract preferences as they're shared
- Guide conversation toward completion naturally
- Don't overwhelm with too many options at once
- Make meal planning feel exciting and personal

Remember: You're not just collecting data - you're helping someone plan delicious meals they'll love!`,
  
  tools: [
    {
      type: "function",
      function: {
        name: "extract_preferences",
        description: "Extract and structure user meal planning preferences from conversation",
        parameters: {
          type: "object",
          properties: {
            selectedMealTypes: {
              type: "array",
              items: {
                type: "string",
                enum: ["breakfast", "lunch", "dinner", "snacks", "dessert", "coffee"]
              },
              description: "Types of meals the user wants planned"
            },
            mealConfiguration: {
              type: "object",
              description: "Specific configuration for each meal type",
              properties: {
                breakfast: {
                  type: "object",
                  properties: {
                    days: { type: "number", minimum: 0, maximum: 7 },
                    adults: { type: "number", minimum: 1 },
                    kids: { type: "number", minimum: 0 }
                  }
                },
                lunch: {
                  type: "object", 
                  properties: {
                    days: { type: "number", minimum: 0, maximum: 7 },
                    adults: { type: "number", minimum: 1 },
                    kids: { type: "number", minimum: 0 }
                  }
                },
                dinner: {
                  type: "object",
                  properties: {
                    days: { type: "number", minimum: 0, maximum: 7 },
                    adults: { type: "number", minimum: 1 },
                    kids: { type: "number", minimum: 0 }
                  }
                },
                snacks: {
                  type: "object",
                  properties: {
                    days: { type: "number", minimum: 0, maximum: 7 },
                    adults: { type: "number", minimum: 1 },
                    kids: { type: "number", minimum: 0 }
                  }
                }
              }
            },
            diets: {
              type: "array",
              items: {
                type: "string", 
                enum: ["vegetarian", "vegan", "keto", "paleo", "gluten-free", "dairy-free", "nut-free"]
              },
              description: "Dietary restrictions or preferences"
            },
            allergies: {
              type: "array",
              items: { type: "string" },
              description: "Food allergies mentioned by the user"
            },
            avoidIngredients: {
              type: "array",
              items: { type: "string" },
              description: "Ingredients the user wants to avoid"
            },
            organicPreference: {
              type: "string",
              enum: ["preferred", "only_if_within_10_percent", "no_preference"],
              description: "User preference for organic ingredients"
            },
            maxCookTime: {
              type: "number",
              description: "Maximum cooking time in minutes"
            },
            cookingSkillLevel: {
              type: "string",
              enum: ["beginner", "intermediate", "advanced"],
              description: "User cooking skill level"
            },
            preferredCuisines: {
              type: "array",
              items: {
                type: "string",
                enum: ["italian", "mexican", "asian", "mediterranean", "american", "indian", "french", "thai"]
              },
              description: "Cuisines the user enjoys"
            },
            mealsPerWeek: {
              type: "number",
              description: "Total number of meals to plan per week"
            },
            peoplePerMeal: {
              type: "number", 
              description: "Number of people each meal should serve"
            }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "generate_meal_options",
        description: "Generate personalized meal options based on collected preferences",
        parameters: {
          type: "object",
          properties: {
            preferences: {
              type: "object",
              description: "User preferences to use for meal generation"
            },
            requestedCount: {
              type: "number",
              description: "Number of meal options to generate",
              default: 8
            }
          },
          required: ["preferences"]
        }
      }
    },
    {
      type: "function", 
      function: {
        name: "finalize_meal_plan",
        description: "Create final meal plan and shopping cart from selected meals",
        parameters: {
          type: "object",
          properties: {
            selectedMeals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" }
                }
              },
              description: "Meals selected by the user"
            },
            preferences: {
              type: "object",
              description: "Complete user preferences"
            }
          },
          required: ["selectedMeals", "preferences"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "update_progress",
        description: "Update conversation progress and current step",
        parameters: {
          type: "object",
          properties: {
            currentStep: {
              type: "string",
              enum: ["greeting", "meal_types", "dietary_restrictions", "cooking_preferences", "meal_generation", "meal_selection", "finalization"],
              description: "Current step in the conversation flow"
            },
            completedSteps: {
              type: "array",
              items: { type: "string" },
              description: "Steps that have been completed"
            },
            readyForMealGeneration: {
              type: "boolean",
              description: "Whether enough preferences have been collected to generate meals"
            },
            conversationComplete: {
              type: "boolean",
              description: "Whether the conversation is complete"
            }
          },
          required: ["currentStep"]
        }
      }
    }
  ]
}

// Assistant management
export class AssistantService {
  private assistantId: string | null = null
  public readonly openai = openai

  async getOrCreateAssistant(): Promise<string> {
    validateApiKey()
    
    if (this.assistantId) {
      return this.assistantId
    }

    return withRetry(async () => {
      try {
        // Check if assistant already exists
        const assistants = await openai.beta.assistants.list()
        const existingAssistant = assistants.data.find(
          assistant => assistant.name === ASSISTANT_CONFIG.name
        )

        if (existingAssistant) {
          this.assistantId = existingAssistant.id
          return this.assistantId
        }

        // Create new assistant
        const assistant = await openai.beta.assistants.create({
          ...ASSISTANT_CONFIG,
          tools: ASSISTANT_CONFIG.tools as any
        })
        this.assistantId = assistant.id
        return this.assistantId
      } catch (error) {
        throw handleOpenAIError(error)
      }
    })
  }

  async createThread(): Promise<string> {
    validateApiKey()
    
    return withRetry(async () => {
      try {
        const thread = await openai.beta.threads.create()
        return thread.id
      } catch (error) {
        throw handleOpenAIError(error)
      }
    })
  }

  async addMessage(threadId: string, content: string): Promise<void> {
    validateApiKey()
    
    if (!threadId || !content.trim()) {
      throw new AssistantError(
        'Thread ID and content are required',
        AssistantErrorCode.INVALID_REQUEST,
        { threadId, content }
      )
    }

    return withRetry(async () => {
      try {
        await openai.beta.threads.messages.create(threadId, {
          role: "user",
          content: content
        })
      } catch (error) {
        throw handleOpenAIError(error)
      }
    })
  }

  async runAssistant(threadId: string): Promise<OpenAI.Beta.Threads.Run> {
    validateApiKey()
    
    if (!threadId) {
      throw new AssistantError(
        'Thread ID is required',
        AssistantErrorCode.INVALID_REQUEST,
        { threadId }
      )
    }

    const assistantId = await this.getOrCreateAssistant()
    
    return withRetry(async () => {
      try {
        return await openai.beta.threads.runs.create(threadId, {
          assistant_id: assistantId
        })
      } catch (error) {
        throw handleOpenAIError(error)
      }
    })
  }

  async waitForRunCompletion(threadId: string, runId: string, timeoutMs: number = 300000): Promise<OpenAI.Beta.Threads.Run> {
    validateApiKey()
    
    if (!threadId || !runId) {
      throw new AssistantError(
        'Thread ID and Run ID are required',
        AssistantErrorCode.INVALID_REQUEST,
        { threadId, runId }
      )
    }

    const startTime = Date.now()
    
    return withRetry(async () => {
      try {
        let run = await openai.beta.threads.runs.retrieve(threadId, runId as any)
        
        while (run.status === 'queued' || run.status === 'in_progress') {
          // Check for timeout
          if (Date.now() - startTime > timeoutMs) {
            throw new AssistantError(
              'Run completion timeout',
              AssistantErrorCode.TIMEOUT_ERROR,
              { threadId, runId, timeoutMs }
            )
          }

          await new Promise(resolve => setTimeout(resolve, 1000))
          run = await openai.beta.threads.runs.retrieve(threadId, runId as any)
        }
        
        if (run.status === 'failed') {
          throw new AssistantError(
            `Run failed: ${run.last_error?.message || 'Unknown error'}`,
            AssistantErrorCode.RUN_FAILED,
            { threadId, runId, lastError: run.last_error }
          )
        }
        
        return run
      } catch (error) {
        if (error instanceof AssistantError) {
          throw error
        }
        throw handleOpenAIError(error)
      }
    })
  }

  async handleToolCalls(threadId: string, runId: string, toolCalls: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall[]): Promise<void> {
    validateApiKey()
    
    if (!threadId || !runId || !toolCalls || toolCalls.length === 0) {
      throw new AssistantError(
        'Thread ID, Run ID, and tool calls are required',
        AssistantErrorCode.INVALID_REQUEST,
        { threadId, runId, toolCallsCount: toolCalls?.length }
      )
    }

    const toolOutputs: OpenAI.Beta.Threads.Runs.RunSubmitToolOutputsParams.ToolOutput[] = []

    for (const toolCall of toolCalls) {
      const { function: func } = toolCall
      let output = ''

      try {
        const args = JSON.parse(func.arguments)
        
        switch (func.name) {
          case 'extract_preferences':
            output = JSON.stringify({ 
              success: true, 
              extracted: args,
              message: "Preferences extracted successfully"
            })
            break
            
          case 'generate_meal_options':
            output = await this.handleMealGeneration(args)
            break
            
          case 'finalize_meal_plan':
            output = await this.handleMealPlanFinalization(args)
            break
            
          case 'update_progress':
            output = JSON.stringify({
              success: true,
              progress: args,
              message: "Progress updated successfully"
            })
            break
            
          default:
            output = JSON.stringify({ 
              success: false, 
              error: `Unknown function: ${func.name}`,
              availableFunctions: ['extract_preferences', 'generate_meal_options', 'finalize_meal_plan', 'update_progress']
            })
        }
      } catch (error) {
        console.error(`Tool function ${func.name} failed:`, error)
        output = JSON.stringify({ 
          success: false, 
          error: `Function execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          functionName: func.name,
          arguments: func.arguments
        })
      }

      toolOutputs.push({
        tool_call_id: toolCall.id,
        output: output
      })
    }

    return withRetry(async () => {
      try {
        await openai.beta.threads.runs.submitToolOutputs(threadId, runId as any, {
          tool_outputs: toolOutputs
        } as any)
      } catch (error) {
        throw new AssistantError(
          'Failed to submit tool outputs',
          AssistantErrorCode.TOOL_EXECUTION_FAILED,
          { error: handleOpenAIError(error), toolOutputs }
        )
      }
    })
  }

  private async handleMealGeneration(args: { preferences: any, requestedCount?: number }): Promise<string> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate-mealplan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          preferences: this.formatPreferencesForMealGeneration(args.preferences)
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate meals')
      }

      const data = await response.json()
      return JSON.stringify({
        success: true,
        meals: data.mealPlan?.recipes || [],
        message: `Generated ${data.mealPlan?.recipes?.length || 0} meal options`
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Meal generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        meals: []
      })
    }
  }

  private async handleMealPlanFinalization(args: { selectedMeals: any[], preferences: any }): Promise<string> {
    try {
      // Here you would integrate with your cart creation API
      // For now, return success to indicate the process is complete
      return JSON.stringify({
        success: true,
        cartCreated: true,
        message: "Meal plan finalized and shopping cart created",
        selectedMeals: args.selectedMeals
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Meal plan finalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  private formatPreferencesForMealGeneration(preferences: any): UserPreferences {
    // Convert assistant preferences format to meal generation API format
    const mealTypes: MealType[] = []
    
    if (preferences.selectedMealTypes && preferences.mealConfiguration) {
      preferences.selectedMealTypes.forEach((mealType: string) => {
        const config = preferences.mealConfiguration[mealType]
        if (config) {
          mealTypes.push({
            type: mealType as MealType['type'],
            days: this.generateDaysArray(config.days || 5),
            adults: config.adults || 2,
            kids: config.kids || 0
          })
        }
      })
    } else if (preferences.selectedMealTypes) {
      // Fallback to default configuration
      preferences.selectedMealTypes.forEach((mealType: string) => {
        mealTypes.push({
          type: mealType as MealType['type'],
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
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

  private generateDaysArray(numDays: number): string[] {
    const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    return allDays.slice(0, Math.min(numDays, 7))
  }

  async getMessages(threadId: string): Promise<any[]> {
    const response = await openai.beta.threads.messages.list(threadId)
    return response.data
  }

  async deleteThread(threadId: string): Promise<void> {
    await (openai.beta.threads as any).del(threadId)
  }
}

// Singleton instance
export const assistantService = new AssistantService()

// Types for assistant integration
export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  toolCalls?: any[]
}

export interface AssistantResponse {
  messages: AssistantMessage[]
  extractedPreferences?: Partial<UserPreferences>
  generatedMeals?: Recipe[]
  conversationProgress?: ConversationProgress
  isComplete?: boolean
}


