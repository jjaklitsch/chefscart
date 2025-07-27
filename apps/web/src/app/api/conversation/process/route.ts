import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Define the function schema for extracting user preferences
const extractPreferencesFunction = {
  name: 'extract_preferences',
  description: 'Extract structured meal planning preferences from natural language input',
  parameters: {
    type: 'object',
    properties: {
      mealTypes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['breakfast', 'lunch', 'dinner', 'snacks', 'dessert', 'coffee']
        },
        description: 'Types of meals the user wants planned'
      },
      diets: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['vegetarian', 'vegan', 'keto', 'paleo', 'gluten-free', 'dairy-free', 'nut-free']
        },
        description: 'Dietary restrictions or preferences'
      },
      allergies: {
        type: 'array',
        items: { type: 'string' },
        description: 'Food allergies mentioned by the user'
      },
      avoidIngredients: {
        type: 'array',
        items: { type: 'string' },
        description: 'Ingredients the user wants to avoid'
      },
      organicPreference: {
        type: 'string',
        enum: ['preferred', 'only_if_within_10_percent', 'no_preference'],
        description: 'User preference for organic ingredients'
      },
      maxCookTime: {
        type: 'number',
        description: 'Maximum cooking time in minutes'
      },
      cookingSkillLevel: {
        type: 'string',
        enum: ['beginner', 'intermediate', 'advanced'],
        description: 'User cooking skill level'
      },
      preferredCuisines: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['italian', 'mexican', 'asian', 'mediterranean', 'american', 'indian', 'french', 'thai']
        },
        description: 'Cuisines the user enjoys'
      },
      mealsPerWeek: {
        type: 'number',
        description: 'Number of meals to plan per week'
      },
      peoplePerMeal: {
        type: 'number',
        description: 'Number of people each meal should serve'
      },
      mealConfiguration: {
        type: 'object',
        description: 'Specific meal type configurations',
        properties: {
          breakfast: {
            type: 'object',
            properties: {
              days: { type: 'number', minimum: 0, maximum: 7 },
              adults: { type: 'number', minimum: 1 },
              kids: { type: 'number', minimum: 0 }
            }
          },
          lunch: {
            type: 'object',
            properties: {
              days: { type: 'number', minimum: 0, maximum: 7 },
              adults: { type: 'number', minimum: 1 },
              kids: { type: 'number', minimum: 0 }
            }
          },
          dinner: {
            type: 'object',
            properties: {
              days: { type: 'number', minimum: 0, maximum: 7 },
              adults: { type: 'number', minimum: 1 },
              kids: { type: 'number', minimum: 0 }
            }
          },
          snacks: {
            type: 'object',
            properties: {
              days: { type: 'number', minimum: 0, maximum: 7 },
              adults: { type: 'number', minimum: 1 },
              kids: { type: 'number', minimum: 0 }
            }
          },
          dessert: {
            type: 'object',
            properties: {
              days: { type: 'number', minimum: 0, maximum: 7 },
              adults: { type: 'number', minimum: 1 },
              kids: { type: 'number', minimum: 0 }
            }
          }
        }
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, context } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({
        error: 'Message is required'
      }, { status: 400 })
    }

    // Parse context to get conversation flow state
    let conversationContext: any = {}
    let currentStep: string | null = null
    let completedSteps: string[] = []
    
    try {
      if (context) {
        conversationContext = JSON.parse(context)
        currentStep = conversationContext.currentStep || null
        completedSteps = conversationContext.completedSteps || []
      }
    } catch (error) {
      console.warn('Failed to parse conversation context:', error)
    }

    // Build system prompt based on conversation flow state
    const systemPrompt = `You are Carter, ChefsCart's friendly AI sous-chef assistant. You help users create personalized meal plans through a guided conversation flow.

CONVERSATION FLOW CONTEXT:
- Current Step: ${currentStep || 'initial'}
- Completed Steps: ${completedSteps.join(', ') || 'none'}
- User Preferences So Far: ${conversationContext.preferences ? JSON.stringify(conversationContext.preferences) : 'none'}

IMPORTANT RULES:
- If the user has already selected meal types (check preferences.selectedMealTypes or preferences.mealTypes), do NOT ask about meal types again
- If a step has been completed (in completedSteps), do NOT ask that question again
- Always check the current preferences before asking any question to avoid repetition

CONVERSATION GUIDELINES:
1. Be warm, friendly, and encouraging
2. Ask ONE focused question at a time based on the current conversation step
3. When a user answers, acknowledge their response and smoothly transition to the next question
4. Extract preferences using the extract_preferences function
5. Keep responses concise (1-2 sentences max)
6. Use natural language that feels conversational, not robotic

CURRENT CONVERSATION STEPS:
1. meal_types: "What meals would you like me to plan for you?"
2. dietary_restrictions: "Do you have any dietary restrictions or preferences?"
3. cooking_time: "How much time do you typically like to spend cooking?"
4. cuisine_preferences: "What flavors and cuisines do you enjoy most?"
5. final_confirmation: Complete the conversation

RESPONSE STRATEGY:
- If no current step: Start with a warm welcome and ask about meal types
- If user answers current step: Acknowledge + extract preferences + ask next question
- If user asks questions: Answer helpfully while guiding back to current step
- Keep the conversation moving toward completion efficiently

${context ? `Previous conversation context: ${context}` : ''}

Respond as Mila with enthusiasm and focus on the current conversation step.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      tools: [
        {
          type: 'function',
          function: extractPreferencesFunction
        }
      ],
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 500
    })

    const assistantMessage = completion.choices[0]?.message
    if (!assistantMessage) {
      throw new Error('No response from OpenAI')
    }

    let extractedData: any = {}
    
    // Process function calls if any
    if (assistantMessage.tool_calls) {
      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.function.name === 'extract_preferences') {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            extractedData = { ...extractedData, ...args }
          } catch (parseError) {
            console.warn('Failed to parse function arguments:', parseError)
          }
        }
      }
    }

    // Determine next conversation step based on extracted data
    let nextStep = currentStep
    let updatedCompletedSteps = [...completedSteps]
    
    if (extractedData && Object.keys(extractedData).length > 0) {
      // Mark current step as completed if we extracted relevant data
      if (currentStep && !completedSteps.includes(currentStep)) {
        updatedCompletedSteps.push(currentStep)
      }
      
      // Determine next step based on conversation flow
      if (extractedData.mealTypes || extractedData.selectedMealTypes) {
        if (!completedSteps.includes('meal_types')) {
          updatedCompletedSteps.push('meal_types')
        }
        nextStep = 'dietary_restrictions'
      } else if (conversationContext.preferences?.selectedMealTypes && !completedSteps.includes('meal_types')) {
        // If meal types already exist in preferences, mark as completed and move to next step
        updatedCompletedSteps.push('meal_types')
        nextStep = 'dietary_restrictions'
      }
      
      if (extractedData.diets) {
        nextStep = completedSteps.includes('dietary_restrictions') ? nextStep : 'cooking_time'
        if (!completedSteps.includes('dietary_restrictions')) {
          updatedCompletedSteps.push('dietary_restrictions')
        }
      }
      
      if (extractedData.maxCookTime) {
        nextStep = completedSteps.includes('cooking_time') ? nextStep : 'cuisine_preferences'
        if (!completedSteps.includes('cooking_time')) {
          updatedCompletedSteps.push('cooking_time')
        }
      }
      
      if (extractedData.preferredCuisines) {
        nextStep = completedSteps.includes('cuisine_preferences') ? nextStep : 'final_confirmation'
        if (!completedSteps.includes('cuisine_preferences')) {
          updatedCompletedSteps.push('cuisine_preferences')
        }
      }
    }
    
    // If this is the first interaction, start with meal_types
    if (!currentStep && !extractedData.mealTypes && !extractedData.selectedMealTypes) {
      nextStep = 'meal_types'
    }

    return NextResponse.json({
      response: assistantMessage.content || "I'd be happy to help you with meal planning!",
      extractedData,
      conversationFlow: {
        currentStep: nextStep,
        completedSteps: updatedCompletedSteps,
        isComplete: updatedCompletedSteps.includes('final_confirmation')
      },
      conversationContext: {
        lastMessage: message,
        timestamp: new Date().toISOString(),
        currentStep: nextStep,
        completedSteps: updatedCompletedSteps
      }
    })

  } catch (error) {
    console.error('Error processing conversation:', error)
    return NextResponse.json({
      error: 'Failed to process conversation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}