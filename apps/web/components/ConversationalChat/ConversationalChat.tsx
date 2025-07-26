"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ChefHat, RotateCcw } from 'lucide-react'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import QuickReplies from './QuickReplies'
import TypingIndicator from './TypingIndicator'
import { UserPreferences, MealType } from '../../types'

interface ConversationalChatProps {
  onPreferencesComplete: (preferences: UserPreferences) => void
}

interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  quickReplies?: QuickReply[]
  waitingForInput?: boolean
  inputType?: 'text' | 'selection' | 'multiselect' | 'mealconfig'
}

interface QuickReply {
  id: string
  text: string
  value: string
  selected?: boolean
}

interface ConversationState {
  step: number
  preferences: Partial<UserPreferences>
  selectedReplies: string[]
  mealConfiguration: Record<string, { days: number, adults: number, kids: number }>
  awaitingResponse: boolean
}

// Natural language conversation flow
const conversationSteps = [
  {
    id: 'welcome',
    message: "Hi! I'm your AI sous-chef 👨‍🍳 I'm here to create the perfect personalized meal plan just for you. Let's start by figuring out what types of meals you'd like me to plan. What sounds good to you?",
    quickReplies: [
      { id: 'breakfast', text: 'Breakfast', value: 'breakfast' },
      { id: 'lunch', text: 'Lunch', value: 'lunch' },
      { id: 'dinner', text: 'Dinner', value: 'dinner' },
      { id: 'snacks', text: 'Snacks', value: 'snacks' },
      { id: 'dessert', text: 'Dessert', value: 'dessert' }
    ],
    inputType: 'multiselect' as const,
    key: 'mealTypes'
  },
  {
    id: 'meal-config',
    message: "Perfect! Now let's configure each meal type. For each meal type you selected, I need to know how many days per week and for how many people.",
    inputType: 'mealconfig' as const,
    key: 'mealConfiguration'
  },
  {
    id: 'dietary-restrictions',
    message: "Great! Now, do you have any dietary preferences or restrictions I should know about? Select all that apply to you:",
    quickReplies: [
      { id: 'vegetarian', text: 'Vegetarian', value: 'vegetarian' },
      { id: 'vegan', text: 'Vegan', value: 'vegan' },
      { id: 'keto', text: 'Keto', value: 'keto' },
      { id: 'paleo', text: 'Paleo', value: 'paleo' },
      { id: 'gluten-free', text: 'Gluten-Free', value: 'gluten-free' },
      { id: 'dairy-free', text: 'Dairy-Free', value: 'dairy-free' },
      { id: 'nut-free', text: 'Nut-Free', value: 'nut-free' },
      { id: 'none', text: 'None', value: 'none' }
    ],
    inputType: 'multiselect' as const,
    key: 'diets'
  },
  {
    id: 'allergies',
    message: "Any food allergies I should be aware of? Please type them out, or just say 'none' if you don't have any allergies.",
    inputType: 'text' as const,
    key: 'allergies'
  },
  {
    id: 'organic-preference',
    message: "How do you feel about organic ingredients?",
    quickReplies: [
      { id: 'preferred', text: 'I prefer organic', value: 'preferred' },
      { id: 'budget', text: 'Only if within 10% of regular price', value: 'only_if_within_10_percent' },
      { id: 'no-preference', text: 'No preference', value: 'no_preference' }
    ],
    inputType: 'selection' as const,
    key: 'organicPreference'
  },
  {
    id: 'cooking-time',
    message: "What's the maximum cooking time you'd prefer for your meals?",
    quickReplies: [
      { id: '15min', text: '15 minutes', value: '15' },
      { id: '30min', text: '30 minutes', value: '30' },
      { id: '45min', text: '45 minutes', value: '45' },
      { id: '60min', text: '60+ minutes', value: '60' }
    ],
    inputType: 'selection' as const,
    key: 'maxCookTime'
  },
  {
    id: 'cooking-skill',
    message: "How would you describe your cooking skill level?",
    quickReplies: [
      { id: 'beginner', text: 'Beginner', value: 'beginner' },
      { id: 'intermediate', text: 'Intermediate', value: 'intermediate' },
      { id: 'advanced', text: 'Advanced', value: 'advanced' }
    ],
    inputType: 'selection' as const,
    key: 'cookingSkillLevel'
  },
  {
    id: 'cuisines',
    message: "What cuisines do you enjoy? Feel free to select multiple options:",
    quickReplies: [
      { id: 'italian', text: 'Italian', value: 'italian' },
      { id: 'mexican', text: 'Mexican', value: 'mexican' },
      { id: 'asian', text: 'Asian', value: 'asian' },
      { id: 'mediterranean', text: 'Mediterranean', value: 'mediterranean' },
      { id: 'american', text: 'American', value: 'american' },
      { id: 'indian', text: 'Indian', value: 'indian' },
      { id: 'french', text: 'French', value: 'french' },
      { id: 'thai', text: 'Thai', value: 'thai' },
      { id: 'no-preference', text: 'No preference', value: 'no_preference' }
    ],
    inputType: 'multiselect' as const,
    key: 'preferredCuisines'
  }
]

// localStorage utilities
const STORAGE_KEY = 'chefscart_conversation_state'

const saveToLocalStorage = (state: ConversationState): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  } catch (error) {
    console.warn('Failed to save conversation state:', error)
  }
}

const loadFromLocalStorage = (): ConversationState | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    }
  } catch (error) {
    console.warn('Failed to load conversation state:', error)
  }
  return null
}

const clearLocalStorage = (): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch (error) {
    console.warn('Failed to clear conversation state:', error)
  }
}

export default function ConversationalChat({ onPreferencesComplete }: ConversationalChatProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [conversationState, setConversationState] = useState<ConversationState>({
    step: 0,
    preferences: {},
    selectedReplies: [],
    mealConfiguration: {},
    awaitingResponse: false
  })
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  // Load saved state on mount
  useEffect(() => {
    const savedState = loadFromLocalStorage()
    if (savedState) {
      setConversationState(savedState)
      // Reconstruct messages from saved state
      const reconstructedMessages: ConversationMessage[] = []
      
      for (let i = 0; i <= savedState.step && i < conversationSteps.length; i++) {
        const step = conversationSteps[i]
        
        // Add assistant message
        reconstructedMessages.push({
          id: `assistant-${i}`,
          role: 'assistant',
          content: step.message,
          timestamp: new Date(),
          quickReplies: step.quickReplies?.map(qr => ({ ...qr, selected: savedState.selectedReplies.includes(qr.value) })),
          waitingForInput: i === savedState.step,
          inputType: step.inputType
        })

        // Add user response if we've moved past this step
        if (i < savedState.step) {
          const userResponse = generateUserResponse(step, savedState.preferences, savedState.selectedReplies, savedState.mealConfiguration)
          if (userResponse) {
            reconstructedMessages.push({
              id: `user-${i}`,
              role: 'user',
              content: userResponse,
              timestamp: new Date()
            })
          }
        }
      }
      
      setMessages(reconstructedMessages)
    } else {
      // Start fresh conversation
      startConversation()
    }
  }, [])

  const startConversation = useCallback(() => {
    const firstStep = conversationSteps[0]
    const welcomeMessage: ConversationMessage = {
      id: 'assistant-0',
      role: 'assistant',
      content: firstStep.message,
      timestamp: new Date(),
      quickReplies: firstStep.quickReplies,
      waitingForInput: true,
      inputType: firstStep.inputType
    }

    setMessages([welcomeMessage])
    setConversationState({
      step: 0,
      preferences: {},
      selectedReplies: [],
      mealConfiguration: {},
      awaitingResponse: false
    })
  }, [])

  // Save state whenever it changes
  useEffect(() => {
    saveToLocalStorage(conversationState)
  }, [conversationState])

  const generateUserResponse = (step: any, preferences: any, selectedReplies: string[], mealConfig: any): string => {
    switch (step.key) {
      case 'mealTypes':
        return selectedReplies.join(', ')
      case 'mealConfiguration':
        return Object.entries(mealConfig).map(([type, config]: [string, any]) => 
          `${type}: ${config.days} days/week for ${config.adults} adults${config.kids > 0 ? ` + ${config.kids} kids` : ''}`
        ).join(', ')
      case 'allergies':
        return preferences.allergies || 'None'
      default:
        return selectedReplies.join(', ') || 'None'
    }
  }

  const handleQuickReplySelect = useCallback((reply: QuickReply) => {
    const currentStep = conversationSteps[conversationState.step]
    if (!currentStep) return

    let newSelectedReplies = [...conversationState.selectedReplies]

    if (currentStep.inputType === 'multiselect') {
      if (newSelectedReplies.includes(reply.value)) {
        newSelectedReplies = newSelectedReplies.filter(r => r !== reply.value)
      } else {
        newSelectedReplies.push(reply.value)
      }
    } else {
      newSelectedReplies = [reply.value]
    }

    setConversationState(prev => ({
      ...prev,
      selectedReplies: newSelectedReplies
    }))

    // Update the current message's quick replies to show selection state
    setMessages(prev => prev.map(msg => {
      if (msg.id === `assistant-${conversationState.step}` && msg.quickReplies) {
        return {
          ...msg,
          quickReplies: msg.quickReplies.map(qr => ({
            ...qr,
            selected: newSelectedReplies.includes(qr.value)
          }))
        }
      }
      return msg
    }))

    // Auto-proceed for single selection
    if (currentStep.inputType === 'selection') {
      setTimeout(() => processResponse(newSelectedReplies), 500)
    }
  }, [conversationState])

  const handleTextInput = useCallback((text: string) => {
    processResponse([], text)
  }, [])

  const processResponse = useCallback((selectedReplies: string[] = conversationState.selectedReplies, textInput?: string) => {
    const currentStep = conversationSteps[conversationState.step]
    if (!currentStep) return

    // Prevent processing if no input provided
    if (selectedReplies.length === 0 && !textInput && currentStep.inputType !== 'mealconfig') {
      return
    }

    setIsTyping(true)

    // Process the user's response
    let value: any
    let responseText: string

    switch (currentStep.inputType) {
      case 'text':
        value = textInput?.split(',').map(s => s.trim()).filter(s => s) || []
        responseText = textInput || 'None'
        break
      case 'selection':
        value = selectedReplies[0]
        if (currentStep.key === 'maxCookTime') value = parseInt(value)
        if (currentStep.key === 'organicPreference' && value === 'budget') value = 'only_if_within_10_percent'
        if (currentStep.key === 'organicPreference' && value === 'no-preference') value = 'no_preference'
        responseText = currentStep.quickReplies?.find(qr => qr.value === selectedReplies[0])?.text || selectedReplies[0]
        break
      case 'multiselect':
        value = selectedReplies
        responseText = selectedReplies.map(val => 
          currentStep.quickReplies?.find(qr => qr.value === val)?.text || val
        ).join(', ')
        break
      case 'mealconfig':
        const mealTypes = selectedReplies.length > 0 ? selectedReplies : Object.keys(conversationState.mealConfiguration)
        value = mealTypes.map(type => ({
          type: type.toLowerCase() as 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'dessert',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].slice(0, conversationState.mealConfiguration[type]?.days || 5),
          adults: conversationState.mealConfiguration[type]?.adults || 2,
          kids: conversationState.mealConfiguration[type]?.kids || 0
        }))
        responseText = generateUserResponse(currentStep, {}, [], conversationState.mealConfiguration)
        break
      default:
        value = selectedReplies
        responseText = selectedReplies.join(', ')
    }

    // Add user message
    const userMessage: ConversationMessage = {
      id: `user-${conversationState.step}`,
      role: 'user',
      content: responseText,
      timestamp: new Date()
    }

    setTimeout(() => {
      setMessages(prev => [...prev, userMessage])
      setIsTyping(false)

      // Update preferences
      const newPreferences = { 
        ...conversationState.preferences, 
        [currentStep.key]: value 
      }

      // Calculate total meals per week for meal configuration
      if (currentStep.key === 'mealConfiguration') {
        const totalMeals = Object.values(conversationState.mealConfiguration).reduce((sum, config: any) => sum + config.days, 0)
        newPreferences.mealsPerWeek = totalMeals
      }

      const newState = {
        ...conversationState,
        preferences: newPreferences,
        selectedReplies: [],
        step: conversationState.step + 1
      }

      setConversationState(newState)

      // Check if conversation is complete
      if (newState.step >= conversationSteps.length) {
        setTimeout(() => {
          const completionMessage: ConversationMessage = {
            id: 'completion',
            role: 'assistant',
            content: "Perfect! I have everything I need to create your personalized meal plan. Let me generate some delicious recipes for you! 🎉",
            timestamp: new Date()
          }
          
          setMessages(prev => [...prev, completionMessage])

          // Complete preferences with defaults
          const completePreferences: UserPreferences = {
            mealsPerWeek: newPreferences.mealsPerWeek || 5,
            peoplePerMeal: newPreferences.peoplePerMeal || 2,
            mealTypes: newPreferences.mealTypes || [{ type: 'dinner', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] }],
            diets: newPreferences.diets || [],
            allergies: newPreferences.allergies || [],
            avoidIngredients: [],
            organicPreference: newPreferences.organicPreference || 'no_preference',
            maxCookTime: newPreferences.maxCookTime || 30,
            cookingSkillLevel: newPreferences.cookingSkillLevel || 'intermediate',
            preferredCuisines: newPreferences.preferredCuisines || [],
            preferredRetailers: []
          }

          clearLocalStorage()
          setTimeout(() => onPreferencesComplete(completePreferences), 2000)
        }, 1000)
        return
      }

      // Add next assistant message
      setTimeout(() => {
        const nextStep = conversationSteps[newState.step]
        if (nextStep) {
          const assistantMessage: ConversationMessage = {
            id: `assistant-${newState.step}`,
            role: 'assistant',
            content: nextStep.message,
            timestamp: new Date(),
            quickReplies: nextStep.quickReplies,
            waitingForInput: true,
            inputType: nextStep.inputType
          }

          setMessages(prev => [...prev, assistantMessage])
        }
      }, 800)

    }, 1000)
  }, [conversationState, onPreferencesComplete])

  const handleContinueMultiSelect = useCallback(() => {
    processResponse()
  }, [processResponse])

  const resetConversation = useCallback(() => {
    clearLocalStorage()
    setMessages([])
    setConversationState({
      step: 0,
      preferences: {},
      selectedReplies: [],
      mealConfiguration: {},
      awaitingResponse: false
    })
    startConversation()
  }, [startConversation])

  const currentStep = conversationSteps[conversationState.step]
  const currentMessage = messages.find(m => m.waitingForInput)
  const canContinue = conversationState.selectedReplies.length > 0 || 
    (currentStep?.inputType === 'mealconfig' && Object.keys(conversationState.mealConfiguration).length > 0)

  return (
    <div className="min-h-screen bg-health-gradient flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-brand-200 px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-fresh-500 rounded-full flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">ChefsCart Assistant</h1>
              <p className="text-sm text-gray-600">
                Step {conversationState.step + 1} of {conversationSteps.length}
              </p>
            </div>
          </div>
          
          <button
            onClick={resetConversation}
            className="btn-ghost p-2 min-h-[40px]"
            aria-label="Reset conversation"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto mt-3">
          <div className="bg-brand-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-brand-600 to-fresh-500 h-full transition-all duration-500 ease-out"
              style={{ width: `${((conversationState.step + 1) / conversationSteps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div role="log" aria-live="polite" aria-label="Conversation messages">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                id={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
              />
            ))}
            
            {isTyping && <TypingIndicator />}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Quick Replies */}
      {currentMessage?.quickReplies && !isTyping && (
        <QuickReplies
          replies={currentMessage.quickReplies}
          onReplySelect={handleQuickReplySelect}
          multiSelect={currentMessage.inputType === 'multiselect'}
          disabled={conversationState.awaitingResponse}
        />
      )}

      {/* Continue Button for Multi-Select */}
      {currentMessage?.inputType === 'multiselect' && canContinue && !isTyping && (
        <div className="px-4 py-3 bg-white border-t border-brand-100">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={handleContinueMultiSelect}
              className="btn-primary w-full"
              disabled={conversationState.awaitingResponse}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Text Input */}
      {currentMessage?.inputType === 'text' && !isTyping && (
        <ChatInput
          onSendMessage={handleTextInput}
          disabled={conversationState.awaitingResponse}
          placeholder="Type your answer..."
          isLoading={conversationState.awaitingResponse}
        />
      )}

      {/* Meal Configuration (handled separately) */}
      {currentMessage?.inputType === 'mealconfig' && !isTyping && (
        <div className="px-4 py-6 bg-white border-t border-brand-100">
          <div className="max-w-4xl mx-auto space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Configure how many times per week you want each meal type, and for how many people:
            </p>
            
            {conversationState.selectedReplies.map((mealType) => {
              const config = conversationState.mealConfiguration[mealType] || { days: 1, adults: 2, kids: 0 }
              
              return (
                <div key={mealType} className="card-primary">
                  <h4 className="font-semibold text-lg text-gray-900 mb-4 capitalize">{mealType}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Days per week
                      </label>
                      <select
                        value={config.days}
                        onChange={(e) => setConversationState(prev => ({
                          ...prev,
                          mealConfiguration: {
                            ...prev.mealConfiguration,
                            [mealType]: { ...config, days: parseInt(e.target.value) }
                          }
                        }))}
                        className="input-primary"
                      >
                        {[1,2,3,4,5,6,7].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Adults
                      </label>
                      <select
                        value={config.adults}
                        onChange={(e) => setConversationState(prev => ({
                          ...prev,
                          mealConfiguration: {
                            ...prev.mealConfiguration,
                            [mealType]: { ...config, adults: parseInt(e.target.value) }
                          }
                        }))}
                        className="input-primary"
                      >
                        {[1,2,3,4,5,6].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kids
                      </label>
                      <select
                        value={config.kids}
                        onChange={(e) => setConversationState(prev => ({
                          ...prev,
                          mealConfiguration: {
                            ...prev.mealConfiguration,
                            [mealType]: { ...config, kids: parseInt(e.target.value) }
                          }
                        }))}
                        className="input-primary"
                      >
                        {[0,1,2,3,4,5,6].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )
            })}
            
            <button
              onClick={() => processResponse()}
              disabled={Object.keys(conversationState.mealConfiguration).length === 0}
              className="btn-primary w-full"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  )
}