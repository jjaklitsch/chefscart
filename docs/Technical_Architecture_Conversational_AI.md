# Technical Architecture: Conversational AI Meal Planning Assistant

## Architecture Overview

The conversational AI system builds upon the existing ChefsCart infrastructure while introducing new components for natural language processing, conversation management, and intelligent data extraction.

## System Components

### Frontend Architecture

```
apps/web/
├── components/
│   ├── conversation/
│   │   ├── ConversationalChat.tsx          (NEW - Main chat interface)
│   │   ├── ChatMessage.tsx                 (NEW - Individual message component)
│   │   ├── QuickReplyButtons.tsx           (NEW - Contextual quick replies)
│   │   ├── ProgressTracker.tsx             (NEW - Sidebar progress indicator)
│   │   ├── VoiceInput.tsx                  (FUTURE - Voice input component)
│   │   └── ConversationHistory.tsx         (NEW - Message history management)
│   ├── PreferencesChat.tsx                 (DEPRECATED - Keep for fallback)
│   └── ZipCodeInput.tsx                    (EXISTING - Unchanged)
├── hooks/
│   ├── useConversation.ts                  (NEW - Conversation state management)
│   ├── useNLP.ts                           (NEW - Natural language processing)
│   └── useProgressTracking.ts              (NEW - Progress state management)
├── lib/
│   ├── conversationEngine.ts               (NEW - Core conversation logic)
│   ├── nlpProcessor.ts                     (NEW - Text processing utilities)
│   └── conversationStorage.ts              (NEW - Enhanced localStorage)
└── types/
    ├── conversation.ts                     (NEW - Conversation-specific types)
    └── index.ts                            (ENHANCED - Add conversation types)
```

### Backend Architecture

```
functions/src/
├── conversation/
│   ├── conversationEngine.ts               (NEW - Main conversation handler)
│   ├── nlpProcessor.ts                     (NEW - Natural language analysis)
│   ├── intentClassifier.ts                (NEW - Intent detection)
│   ├── dataExtractor.ts                   (NEW - Extract preferences from text)
│   └── responseGenerator.ts               (NEW - Generate AI responses)
├── gptPlan.ts                             (EXISTING - Enhanced for conversation)
├── emailSend.ts                           (EXISTING - Unchanged)
└── createList.ts                          (EXISTING - Unchanged)
```

### API Routes

```
apps/web/src/app/api/
├── conversation/
│   ├── message/route.ts                   (NEW - Process conversation messages)
│   ├── extract-data/route.ts              (NEW - Extract structured data)
│   └── validate-completeness/route.ts      (NEW - Check data completeness)
├── generate-mealplan-mock/route.ts        (EXISTING - Enhanced)
└── validate-zip/route.ts                  (EXISTING - Unchanged)
```

## Core Data Structures

### Conversation Types

```typescript
// types/conversation.ts

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    extractedData?: Partial<UserPreferences>
    confidence?: number
    intent?: ConversationIntent
    quickReplies?: string[]
  }
}

export interface ConversationContext {
  sessionId: string
  userId?: string
  gatheredData: Partial<UserPreferences>
  conversationHistory: ConversationMessage[]
  currentFocus: DataCategory[]
  completionStatus: CompletionStatus
  userPersonality?: PersonalityTraits
  conversationStage: ConversationStage
}

export interface ConversationState {
  context: ConversationContext
  isLoading: boolean
  isComplete: boolean
  error?: string
  progressPercentage: number
}

export type ConversationIntent = 
  | 'greeting'
  | 'meal_type_preference'
  | 'dietary_restriction'
  | 'cooking_skill'
  | 'time_constraint'
  | 'cuisine_preference'
  | 'clarification_request'
  | 'revision_request'
  | 'completion_signal'

export type ConversationStage = 
  | 'introduction'
  | 'discovery'
  | 'clarification'
  | 'confirmation'
  | 'completion'

export type DataCategory = 
  | 'meal_types'
  | 'meal_frequency'
  | 'people_count'
  | 'dietary_restrictions'
  | 'allergies'
  | 'cooking_skill'
  | 'time_constraints'
  | 'cuisine_preferences'
  | 'organic_preference'
  | 'pantry_items'

export interface CompletionStatus {
  required: Record<DataCategory, boolean>
  optional: Record<DataCategory, boolean>
  completionPercentage: number
  missingRequired: DataCategory[]
  suggestions: string[]
}

export interface PersonalityTraits {
  communicationStyle: 'brief' | 'detailed' | 'casual' | 'formal'
  enthusiasm: 'low' | 'medium' | 'high'
  experience: 'beginner' | 'intermediate' | 'expert'
  focus: 'health' | 'convenience' | 'creativity' | 'budget'
}
```

### Enhanced UserPreferences

```typescript
// types/index.ts (enhanced)

export interface UserPreferences {
  // Existing fields
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
  
  // New conversation-driven fields
  cookingMotivation?: string[]
  budgetPreference?: 'budget_friendly' | 'moderate' | 'premium' | 'no_preference'
  kitchenEquipment?: string[]
  pantryStaples?: string[]
  timeConstraints?: {
    weekdayTime: number
    weekendTime: number
    busyDays: string[]
  }
  specialOccasions?: {
    type: string
    frequency: string
    requirements: string[]
  }[]
  conversationMetadata?: {
    completedAt: Date
    sessionDuration: number
    messageCount: number
    personality: PersonalityTraits
  }
}
```

## Implementation Details

### 1. ConversationalChat Component

```typescript
// components/conversation/ConversationalChat.tsx

"use client"

import React from 'react'
import { useConversation } from '@/hooks/useConversation'
import { ChatMessage } from './ChatMessage'
import { QuickReplyButtons } from './QuickReplyButtons'
import { ProgressTracker } from './ProgressTracker'
import { UserPreferences } from '@/types'

interface ConversationalChatProps {
  onPreferencesComplete: (preferences: UserPreferences) => void
  initialContext?: Partial<ConversationContext>
}

export default function ConversationalChat({ 
  onPreferencesComplete,
  initialContext 
}: ConversationalChatProps) {
  const {
    state,
    sendMessage,
    handleQuickReply,
    editGatheredData,
    retryLastMessage
  } = useConversation({ onComplete: onPreferencesComplete, initialContext })

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 py-8">
      <div className="max-w-4xl mx-auto px-4 flex gap-6">
        
        {/* Main Chat Area */}
        <div className="flex-1 bg-white rounded-2xl shadow-lg overflow-hidden">
          <ChatHeader 
            progress={state.progressPercentage}
            stage={state.context.conversationStage}
          />
          
          <ChatMessages 
            messages={state.context.conversationHistory}
            isLoading={state.isLoading}
            error={state.error}
            onRetry={retryLastMessage}
          />
          
          <ChatInput 
            onSendMessage={sendMessage}
            quickReplies={getQuickReplies(state.context)}
            onQuickReply={handleQuickReply}
            disabled={state.isLoading || state.isComplete}
          />
        </div>

        {/* Progress Sidebar */}
        <ProgressTracker 
          completionStatus={state.context.completionStatus}
          gatheredData={state.context.gatheredData}
          onEditData={editGatheredData}
          className="w-80 hidden lg:block"
        />
      </div>
    </div>
  )
}
```

### 2. Conversation Engine Hook

```typescript
// hooks/useConversation.ts

import { useState, useCallback, useEffect } from 'react'
import { ConversationState, ConversationMessage } from '@/types/conversation'
import { conversationStorage } from '@/lib/conversationStorage'

interface UseConversationOptions {
  onComplete: (preferences: UserPreferences) => void
  initialContext?: Partial<ConversationContext>
}

export function useConversation({ onComplete, initialContext }: UseConversationOptions) {
  const [state, setState] = useState<ConversationState>(() => ({
    context: initializeContext(initialContext),
    isLoading: false,
    isComplete: false,
    progressPercentage: 0
  }))

  const sendMessage = useCallback(async (content: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }))
    
    try {
      // Add user message to history
      const userMessage: ConversationMessage = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: new Date()
      }

      // Call conversation API
      const response = await fetch('/api/conversation/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: state.context
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to process message')
      }

      // Update state with response
      setState(prev => ({
        ...prev,
        context: result.updatedContext,
        isLoading: false,
        progressPercentage: result.updatedContext.completionStatus.completionPercentage,
        isComplete: result.isComplete
      }))

      // Save to localStorage
      conversationStorage.save(result.updatedContext)

      // Check if conversation is complete
      if (result.isComplete) {
        setTimeout(() => onComplete(result.finalPreferences), 1000)
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }, [state.context, onComplete])

  return {
    state,
    sendMessage,
    handleQuickReply: (reply: string) => sendMessage(reply),
    editGatheredData: useCallback((category: DataCategory, newValue: any) => {
      // Implementation for editing gathered data
    }, []),
    retryLastMessage: useCallback(() => {
      // Implementation for retrying failed messages
    }, [])
  }
}
```

### 3. Backend Conversation Engine

```typescript
// functions/src/conversation/conversationEngine.ts

import { Request, Response } from 'firebase-functions'
import OpenAI from 'openai'
import { ConversationContext, ConversationMessage } from '../types/conversation'
import { extractDataFromMessage } from './dataExtractor'
import { generateResponse } from './responseGenerator'
import { validateCompleteness } from './validator'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function processConversationMessage(req: Request, res: Response) {
  try {
    const { message, context }: {
      message: ConversationMessage
      context: ConversationContext
    } = req.body

    console.log('Processing conversation message:', message.content)

    // Extract structured data from user message
    const extractedData = await extractDataFromMessage(message.content, context)
    
    // Update gathered data
    const updatedGatheredData = {
      ...context.gatheredData,
      ...extractedData
    }

    // Check completion status
    const completionStatus = validateCompleteness(updatedGatheredData)
    
    // Generate AI response
    const aiResponse = await generateResponse({
      userMessage: message,
      context: {
        ...context,
        gatheredData: updatedGatheredData,
        completionStatus
      }
    })

    // Update conversation history
    const updatedHistory = [
      ...context.conversationHistory,
      message,
      aiResponse
    ]

    // Create updated context
    const updatedContext: ConversationContext = {
      ...context,
      gatheredData: updatedGatheredData,
      conversationHistory: updatedHistory,
      completionStatus,
      conversationStage: determineConversationStage(completionStatus)
    }

    // Check if conversation is complete
    const isComplete = completionStatus.completionPercentage >= 100

    return res.status(200).json({
      success: true,
      updatedContext,
      isComplete,
      finalPreferences: isComplete ? buildFinalPreferences(updatedGatheredData) : undefined
    })

  } catch (error) {
    console.error('Error processing conversation message:', error)
    return res.status(500).json({
      error: 'Failed to process message',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// OpenAI function for structured data extraction
const DATA_EXTRACTION_FUNCTION = {
  name: 'extract_meal_preferences',
  description: 'Extract meal planning preferences from user message',
  parameters: {
    type: 'object',
    properties: {
      mealTypes: {
        type: 'array',
        items: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snacks', 'dessert'] },
        description: 'Meal types mentioned by user'
      },
      dietaryRestrictions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Dietary restrictions or preferences mentioned'
      },
      allergies: {
        type: 'array',
        items: { type: 'string' },
        description: 'Food allergies mentioned'
      },
      cookingSkill: {
        type: 'string',
        enum: ['beginner', 'intermediate', 'advanced'],
        description: 'Cooking skill level indicated'
      },
      timeConstraints: {
        type: 'object',
        properties: {
          maxCookTime: { type: 'number' },
          busyDays: { type: 'array', items: { type: 'string' } }
        }
      },
      cuisinePreferences: {
        type: 'array',
        items: { type: 'string' },
        description: 'Preferred cuisines mentioned'
      },
      peopleCount: {
        type: 'object',
        properties: {
          adults: { type: 'number' },
          children: { type: 'number' }
        }
      }
    }
  }
}
```

### 4. Response Generation System

```typescript
// functions/src/conversation/responseGenerator.ts

import OpenAI from 'openai'
import { ConversationContext, ConversationMessage } from '../types/conversation'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateResponse(params: {
  userMessage: ConversationMessage
  context: ConversationContext
}): Promise<ConversationMessage> {
  
  const { userMessage, context } = params
  const { gatheredData, completionStatus, conversationStage } = context

  // Create conversation prompt based on stage and gathered data
  const systemPrompt = createSystemPrompt(context)
  const conversationHistory = formatConversationHistory(context.conversationHistory)

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage.content }
      ],
      temperature: 0.7,
      max_tokens: 300
    })

    const responseContent = completion.choices[0]?.message?.content || 
      "I'm sorry, I didn't quite catch that. Could you tell me more about your meal planning needs?"

    // Generate quick replies based on context
    const quickReplies = generateQuickReplies(context)

    return {
      id: generateId(),
      role: 'assistant',
      content: responseContent,
      timestamp: new Date(),
      metadata: {
        quickReplies,
        intent: classifyIntent(userMessage.content),
        confidence: 0.9
      }
    }

  } catch (error) {
    console.error('Error generating AI response:', error)
    return createFallbackResponse(context)
  }
}

function createSystemPrompt(context: ConversationContext): string {
  const { gatheredData, completionStatus, conversationStage } = context
  
  const basePrompt = `You are Chef, a friendly and knowledgeable meal planning assistant. Your goal is to naturally gather meal planning preferences through conversation.

PERSONALITY:
- Warm, enthusiastic, and encouraging
- Professional but conversational
- Food-passionate and knowledgeable
- Adaptive to user's communication style

CURRENT CONVERSATION STAGE: ${conversationStage}
COMPLETION STATUS: ${completionStatus.completionPercentage}% complete

GATHERED INFORMATION SO FAR:
${formatGatheredData(gatheredData)}

STILL NEEDED:
${completionStatus.missingRequired.join(', ')}

CONVERSATION GUIDELINES:
1. Ask about ONE thing at a time naturally
2. Build on what the user just shared
3. Use follow-up questions to clarify
4. Show enthusiasm about their food preferences
5. Keep responses under 2 sentences when possible
6. Guide toward missing information naturally`

  // Add stage-specific instructions
  switch (conversationStage) {
    case 'introduction':
      return basePrompt + `\n\nFOCUS: Welcome the user warmly and discover what brings them to meal planning.`
    
    case 'discovery':
      return basePrompt + `\n\nFOCUS: Naturally uncover their meal planning needs and preferences.`
    
    case 'clarification':
      return basePrompt + `\n\nFOCUS: Ask follow-up questions to clarify or expand on their responses.`
    
    case 'confirmation':
      return basePrompt + `\n\nFOCUS: Confirm understanding and gather any final missing details.`
    
    default:
      return basePrompt
  }
}
```

## Integration Strategy

### Phase 1: Foundation Setup
1. Create new conversation types and interfaces
2. Build basic conversation components alongside existing system
3. Implement conversation storage and state management
4. Set up API routes for conversation processing

### Phase 2: Core AI Implementation
1. Implement OpenAI conversation engine with function calling
2. Build data extraction and validation systems
3. Create response generation with personality
4. Add progress tracking and completion detection

### Phase 3: Enhanced UX
1. Add progress sidebar with edit functionality
2. Implement quick reply suggestions
3. Build conversation history and replay
4. Add error handling and fallback mechanisms

### Phase 4: A/B Testing & Rollout
1. Feature flag implementation for gradual rollout
2. A/B testing between old and new experiences
3. Performance monitoring and optimization
4. User feedback collection and iteration

## Performance Considerations

### Response Time Optimization
- Stream AI responses for immediate feedback
- Implement request queuing for high load
- Cache common conversation patterns
- Use lightweight NLP for real-time processing

### Data Efficiency
- Minimize API calls through intelligent batching
- Use localStorage for conversation persistence
- Implement optimistic updates for better UX
- Compress conversation history for storage

### Error Handling
- Graceful degradation to quick-reply mode
- Automatic retry mechanisms for API failures
- Clear error messages with recovery options
- Fallback to structured input when needed

This architecture provides a robust foundation for implementing a conversational AI experience while maintaining all existing functionality and data requirements.