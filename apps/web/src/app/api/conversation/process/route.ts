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

    // Build system prompt with context about meal planning assistant
    const systemPrompt = `You are ChefsCart's AI sous-chef assistant. Your role is to help users create personalized meal plans by understanding their preferences through natural conversation.

Key guidelines:
- Be friendly, conversational, and helpful
- Extract specific meal planning preferences when mentioned
- Ask clarifying questions when preferences are unclear
- Use the extract_preferences function to capture structured data
- If a user provides partial information, extract what you can and ask for missing details
- Always acknowledge what the user has told you before asking for more information

${context ? `Previous conversation context: ${context}` : ''}

Respond naturally while extracting any meal planning preferences mentioned.`

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

    let extractedData = {}
    
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

    return NextResponse.json({
      response: assistantMessage.content || "I'd be happy to help you with meal planning!",
      extractedData,
      conversationContext: {
        lastMessage: message,
        timestamp: new Date().toISOString()
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