"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ChefHat, RotateCcw, Mic, ArrowLeft, MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import TypingIndicator from './TypingIndicator'
import SimpleVoiceUI from '../SimpleVoiceUI'
import ContinuousVoiceUI from '../ContinuousVoiceUI'
import NewRealtimeVoiceUI from '../NewRealtimeVoiceUI'
import ProgressTracker from '../ProgressTracker/ProgressTracker'
import QuickReplyGrid from './QuickReplyGrid'
import MealSelectionMessage from './MealSelectionMessage'
import WelcomeScreen from './WelcomeScreen'
import GuidedOnboarding from '../GuidedOnboarding'
import { UserPreferences, MealType, ConversationFlow, QuickReply, Recipe } from '../../types'
import { getVoiceRecordingService } from '../../lib/voice-recording'
import { getStepById } from './conversationFlow'

interface ConversationalChatProps {
  onPreferencesComplete: (preferences: UserPreferences) => void
  onProgressUpdate?: (preferences: Partial<UserPreferences>) => void
  onBackToHome?: () => void
}

interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isVoiceResponse?: boolean
}

interface ConversationState {
  preferences: Partial<UserPreferences>
  awaitingResponse: boolean
  messages: ConversationMessage[]
  conversationStarted: boolean
  conversationFlow: ConversationFlow
  generatedMeals?: Recipe[]
  selectedMeals?: Recipe[]
  isMealGenerationLoading?: boolean
  threadId?: string // For OpenAI Assistant API
  initialChoiceMade?: boolean // Track if user has chosen voice, chat, or guided
  showGuidedOnboarding?: boolean // Track if user chose guided onboarding
}

// localStorage utilities
const STORAGE_KEY = 'chefscart_conversation_state_v2'
const CURRENT_SCHEMA_VERSION = 2

const saveToLocalStorage = (state: ConversationState): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stateToSave = {
        ...state,
        conversationFlow: {
          ...state.conversationFlow,
          completedSteps: Array.from(state.conversationFlow.completedSteps)
        },
        version: CURRENT_SCHEMA_VERSION,
        timestamp: Date.now()
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
    }
  } catch (error) {
    console.warn('Failed to save conversation state:', error)
  }
}

const loadFromLocalStorage = (): ConversationState | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null
      
      const parsed = JSON.parse(stored)
      
      // Check version compatibility
      if (parsed.version !== CURRENT_SCHEMA_VERSION) {
        console.info('Conversation state version mismatch, starting fresh')
        clearLocalStorage()
        return null
      }
      
      // Convert timestamp strings back to Date objects
      if (parsed.messages && Array.isArray(parsed.messages)) {
        parsed.messages = parsed.messages.map((message: any) => ({
          ...message,
          timestamp: message.timestamp ? new Date(message.timestamp) : new Date()
        }))
      }
      
      // Convert completedSteps array back to Set
      if (parsed.conversationFlow && parsed.conversationFlow.completedSteps) {
        parsed.conversationFlow.completedSteps = new Set(parsed.conversationFlow.completedSteps)
      } else {
        parsed.conversationFlow = {
          currentStepId: null,
          completedSteps: new Set<string>(),
          stepData: {},
          isComplete: false
        }
      }
      
      return parsed as ConversationState
    }
  } catch (error) {
    console.warn('Failed to load conversation state:', error)
    clearLocalStorage()
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

// Helper function to generate meals based on preferences
const generateMealsFromPreferences = async (preferences: Partial<UserPreferences>): Promise<Recipe[]> => {
  try {
    const response = await fetch('/api/generate-mealplan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        preferences: {
          mealsPerWeek: 7,
          peoplePerMeal: 2,
          mealTypes: preferences.selectedMealTypes?.map(type => ({
            type: type as MealType['type'],
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            adults: 2,
            kids: 0
          })) || [{ type: 'dinner', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], adults: 2, kids: 0 }],
          diets: preferences.diets || [],
          allergies: preferences.allergies || [],
          avoidIngredients: [],
          organicPreference: preferences.organicPreference || 'no_preference',
          maxCookTime: preferences.maxCookTime || 30,
          cookingSkillLevel: preferences.cookingSkillLevel || 'intermediate',
          preferredCuisines: preferences.preferredCuisines || [],
          preferredRetailers: []
        }
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate meals')
    }

    const data = await response.json()
    return data.mealPlan?.recipes || []
  } catch (error) {
    console.error('Error generating meals:', error)
    return []
  }
}

export default function ConversationalChat({ onPreferencesComplete, onProgressUpdate, onBackToHome }: ConversationalChatProps) {
  const router = useRouter()
  const [conversationState, setConversationState] = useState<ConversationState>({
    preferences: {},
    awaitingResponse: false,
    messages: [],
    conversationStarted: false,
    conversationFlow: {
      currentStepId: null,
      completedSteps: new Set<string>(),
      stepData: {},
      isComplete: false
    },
    generatedMeals: [],
    selectedMeals: [],
    isMealGenerationLoading: false,
    threadId: undefined,
    initialChoiceMade: false
  })
  const [isTyping, setIsTyping] = useState(false)
  const [showVoiceUI, setShowVoiceUI] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [progressTrackerCollapsed, setProgressTrackerCollapsed] = useState(false)
  const [desktopProgressTrackerCollapsed, setDesktopProgressTrackerCollapsed] = useState(false)
  const [lastAIResponse, setLastAIResponse] = useState<string>('')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const voiceService = getVoiceRecordingService()

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [conversationState.messages, isTyping, scrollToBottom])

  // Load saved state on mount
  useEffect(() => {
    const savedState = loadFromLocalStorage()
    
    if (savedState && savedState.initialChoiceMade) {
      console.log('Loading saved state:', savedState)
      setConversationState(savedState)
    } else {
      console.log('No valid saved state found or choice not made, showing welcome screen')
      // Clear any incomplete state
      clearLocalStorage()
    }
    // Don't auto-start conversation - let user choose voice or chat
  }, [])

  // Save state whenever it changes
  useEffect(() => {
    if (conversationState.conversationStarted) {
      const timeoutId = setTimeout(() => {
        saveToLocalStorage(conversationState)
      }, 100)
      
      return () => clearTimeout(timeoutId)
    }
    
    // Return empty cleanup function for else case
    return () => {}
  }, [conversationState])

  const startConversation = useCallback(() => {
    const welcomeMessage: ConversationMessage = {
      id: 'assistant-welcome',
      role: 'assistant',
      content: "Hi! I'm Carter, your AI sous-chef here to help you plan your meals and create a shopping list in just a few minutes. How many meals are you looking to cook this week?",
      timestamp: new Date()
    }

    setConversationState(prev => ({
      ...prev,
      preferences: {},
      awaitingResponse: false,
      messages: [welcomeMessage],
      conversationStarted: true,
      conversationFlow: {
        currentStepId: 'meal_types',
        completedSteps: new Set<string>(),
        stepData: {},
        isComplete: false
      },
      generatedMeals: [],
      selectedMeals: [],
      isMealGenerationLoading: false
    }))
  }, [])

  const processTextInput = useCallback(async (text: string, isVoice: boolean = false) => {
    if (!text.trim()) return
    
    setIsTyping(true)
    
    // Add user message
    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date()
    }
    
    setConversationState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      awaitingResponse: true
    }))

    try {
      // Use feature flag to switch between Assistant API and legacy API
      const useAssistantAPI = process.env.NEXT_PUBLIC_USE_ASSISTANT_API === 'true'
      
      let data: any
      
      if (useAssistantAPI) {
        // Call the new Assistant API
        const response = await fetch('/api/assistant/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: text,
            threadId: conversationState.threadId,
            context: {
              preferences: conversationState.preferences,
              conversationHistory: conversationState.messages.slice(-3),
              currentStep: conversationState.conversationFlow.currentStepId,
              completedSteps: Array.from(conversationState.conversationFlow.completedSteps)
            }
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to process message with Assistant API')
        }
        
        data = await response.json()
      } else {
        // Call the legacy conversation processing API
        const response = await fetch('/api/conversation/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: text,
            context: JSON.stringify({
              preferences: conversationState.preferences,
              conversationHistory: conversationState.messages.slice(-3),
              currentStep: conversationState.conversationFlow.currentStepId,
              completedSteps: Array.from(conversationState.conversationFlow.completedSteps)
            })
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to process message')
        }
        
        data = await response.json()
      }
      
      // Add AI response
      const aiMessage: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        isVoiceResponse: isVoice
      }
      
      setConversationState(prev => {
        const newPreferences = { ...prev.preferences }
        let updatedConversationFlow = { ...prev.conversationFlow }
        
        // Merge extracted data with current preferences
        if (data.extractedData && Object.keys(data.extractedData).length > 0) {
          Object.entries(data.extractedData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              // Handle arrays by merging with existing values
              if (Array.isArray(value)) {
                const existingValue = (newPreferences as Record<string, unknown>)[key]
                if (Array.isArray(existingValue)) {
                  (newPreferences as Record<string, unknown>)[key] = Array.from(
                    new Set([...existingValue, ...value])
                  )
                } else {
                  (newPreferences as Record<string, unknown>)[key] = value
                }
              } else {
                (newPreferences as Record<string, unknown>)[key] = value
              }
            }
          })
        }
        
        // Update conversation flow based on API response
        if (data.conversationFlow) {
          updatedConversationFlow = {
            ...updatedConversationFlow,
            currentStepId: data.conversationFlow.currentStep,
            completedSteps: new Set(data.conversationFlow.completedSteps),
            isComplete: data.conversationFlow.isComplete || false
          }
        }

        // Handle generated meals from Assistant API
        if (data.generatedMeals && data.generatedMeals.length > 0) {
          return {
            ...prev,
            messages: [...prev.messages, aiMessage],
            preferences: newPreferences,
            conversationFlow: updatedConversationFlow,
            awaitingResponse: false,
            generatedMeals: data.generatedMeals,
            isMealGenerationLoading: false,
            threadId: data.threadId || prev.threadId
          }
        }

        // Check if we need to generate meals for the meal selection step
        const shouldGenerateMeals = updatedConversationFlow.currentStepId === 'meal_selection' && 
                                  !prev.generatedMeals?.length &&
                                  !prev.isMealGenerationLoading

        let updatedState = {
          ...prev,
          messages: [...prev.messages, aiMessage],
          preferences: newPreferences,
          conversationFlow: updatedConversationFlow,
          awaitingResponse: false,
          threadId: data.threadId || prev.threadId
        }

        if (shouldGenerateMeals) {
          updatedState = {
            ...updatedState,
            isMealGenerationLoading: true
          }
        }
        
        return updatedState
      })
      
      // Set for voice response
      if (isVoice) {
        setLastAIResponse(data.response)
      }
      
      // Notify parent of progress update
      if (onProgressUpdate && data.extractedData && Object.keys(data.extractedData).length > 0) {
        onProgressUpdate({ ...conversationState.preferences, ...data.extractedData })
      }
      
      // Generate meals if we've reached the meal selection step (legacy flow)
      if (!data.generatedMeals && data.conversationFlow && data.conversationFlow.currentStep === 'meal_selection') {
        const currentPreferences = { ...conversationState.preferences, ...data.extractedData }
        
        // Generate meals in the background
        generateMealsFromPreferences(currentPreferences).then((meals) => {
          setConversationState(prev => ({
            ...prev,
            generatedMeals: meals,
            isMealGenerationLoading: false
          }))
        }).catch((error) => {
          console.error('Failed to generate meals:', error)
          setConversationState(prev => ({
            ...prev,
            generatedMeals: [],
            isMealGenerationLoading: false
          }))
        })
      }

      // Check if conversation flow is complete
      if (data.conversationFlow && data.conversationFlow.isComplete) {
        const updatedPreferences = { ...conversationState.preferences, ...data.extractedData }
        setTimeout(() => {
          completeConversation(updatedPreferences)
        }, 2000)
      }
      
    } catch (error) {
      console.error('Error processing message:', error)
      
      // Add error message
      const errorMessage: ConversationMessage = {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I encountered an error processing your message. Could you please try again?",
        timestamp: new Date()
      }
      
      setConversationState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        awaitingResponse: false
      }))
    } finally {
      setIsTyping(false)
    }
  }, [conversationState, onProgressUpdate])

  // const checkIfReadyToComplete = (preferences: Partial<UserPreferences>): boolean => {
  //   // Basic requirements: meal types and at least some other preferences
  //   const hasMealTypes = preferences.selectedMealTypes && preferences.selectedMealTypes.length > 0
  //   const hasOtherInfo = preferences.diets || preferences.allergies || preferences.organicPreference || preferences.maxCookTime
    
  //   return Boolean(hasMealTypes && hasOtherInfo)
  // }

  const completeConversation = useCallback((preferences: Partial<UserPreferences>) => {
    const completionMessage: ConversationMessage = {
      id: 'completion',
      role: 'assistant',
      content: "Perfect! I have everything I need to create your personalized meal plan. Let me generate some delicious recipes for you! 🎉",
      timestamp: new Date()
    }
    
    setConversationState(prev => ({
      ...prev,
      messages: [...prev.messages, completionMessage]
    }))

    // Complete preferences with defaults
    const completePreferences: UserPreferences = {
      mealsPerWeek: preferences.mealsPerWeek || 5,
      peoplePerMeal: preferences.peoplePerMeal || 2,
      mealTypes: preferences.mealTypes || preferences.selectedMealTypes?.map(type => ({
        type: type as MealType['type'],
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        adults: 2,
        kids: 0
      })) || [{ type: 'dinner', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], adults: 2, kids: 0 }],
      diets: preferences.diets || [],
      allergies: preferences.allergies || [],
      avoidIngredients: [],
      organicPreference: preferences.organicPreference || 'no_preference',
      maxCookTime: preferences.maxCookTime || 30,
      cookingSkillLevel: preferences.cookingSkillLevel || 'intermediate',
      preferredCuisines: preferences.preferredCuisines || [],
      preferredRetailers: []
    }

    clearLocalStorage()
    setTimeout(() => onPreferencesComplete(completePreferences), 2000)
  }, [onPreferencesComplete])

  const handleTextInput = useCallback((text: string) => {
    processTextInput(text, false)
  }, [processTextInput])

  const handleVoiceInput = useCallback((text: string) => {
    processTextInput(text, true)
  }, [processTextInput])

  const handleStartListening = useCallback(async () => {
    try {
      setIsListening(true)
      const success = await voiceService.startRecording()
      if (!success) {
        setIsListening(false)
      }
    } catch (error) {
      console.error('Error starting voice recording:', error)
      setIsListening(false)
    }
  }, [voiceService])

  const handleStopListening = useCallback(async () => {
    try {
      setIsListening(false)
      const audioBlob = voiceService.stopRecording()
      
      if (audioBlob) {
        // Send to transcription API
        const formData = new FormData()
        formData.append('audio', audioBlob, 'recording.webm')

        const response = await fetch('/api/voice/transcribe', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const transcriptionData = await response.json()
          if (transcriptionData.text && transcriptionData.text.trim()) {
            handleVoiceInput(transcriptionData.text.trim())
          }
        }
      }
    } catch (error) {
      console.error('Error processing voice input:', error)
    }
  }, [voiceService, handleVoiceInput])

  const resetConversation = useCallback(async () => {
    // Clean up existing thread if using Assistant API
    const useAssistantAPI = process.env.NEXT_PUBLIC_USE_ASSISTANT_API === 'true'
    if (useAssistantAPI && conversationState.threadId) {
      try {
        await fetch('/api/assistant/thread', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'delete',
            threadId: conversationState.threadId
          })
        })
      } catch (error) {
        console.warn('Failed to delete thread:', error)
      }
    }

    clearLocalStorage()
    setConversationState({
      preferences: {},
      awaitingResponse: false,
      messages: [],
      conversationStarted: false,
      conversationFlow: {
        currentStepId: null,
        completedSteps: new Set<string>(),
        stepData: {},
        isComplete: false
      },
      generatedMeals: [],
      selectedMeals: [],
      isMealGenerationLoading: false,
      threadId: undefined,
      initialChoiceMade: false
    })
    setShowVoiceUI(false)
    setIsListening(false)
    setLastAIResponse('')
    // Don't auto-start - let user choose again
  }, [startConversation, conversationState.threadId])

  const handleQuickReply = useCallback((reply: QuickReply) => {
    // Handle multi-selection replies specially
    if (reply.allowMultiple && Array.isArray(reply.value)) {
      // For multi-selection meal types, update preferences directly
      if (conversationState.conversationFlow.currentStepId === 'meal_types') {
        const selectedMealTypes = reply.value.flat()
        setConversationState(prev => ({
          ...prev,
          preferences: {
            ...prev.preferences,
            selectedMealTypes: selectedMealTypes
          }
        }))
      }
    }
    
    // Convert the quick reply to a text message
    processTextInput(reply.text, false)
  }, [processTextInput, conversationState.conversationFlow.currentStepId])

  const handleMealSelection = useCallback((selectedMeals: Recipe[]) => {
    // Update the conversation state with selected meals
    setConversationState(prev => ({
      ...prev,
      selectedMeals,
      preferences: {
        ...prev.preferences,
        selectedRecipes: selectedMeals
      },
      conversationFlow: {
        ...prev.conversationFlow,
        currentStepId: 'final_confirmation',
        completedSteps: new Set([...Array.from(prev.conversationFlow.completedSteps), 'meal_selection'])
      }
    }))

    // Add a confirmation message
    const confirmationMessage: ConversationMessage = {
      id: `assistant-meal-confirm-${Date.now()}`,
      role: 'assistant',
      content: `Perfect! I've got your ${selectedMeals.length} selected meals. Let me create your Instacart shopping cart now!`,
      timestamp: new Date()
    }

    setTimeout(() => {
      setConversationState(prev => {
        const updatedState = {
          ...prev,
          messages: [...prev.messages, confirmationMessage]
        }

        // Complete the conversation after a short delay
        setTimeout(() => {
          const finalPreferences = {
            ...updatedState.preferences,
            selectedRecipes: selectedMeals
          }
          
          // Complete preferences with defaults and selected meals
          const completePreferences: UserPreferences = {
            mealsPerWeek: finalPreferences.mealsPerWeek || 5,
            peoplePerMeal: finalPreferences.peoplePerMeal || 2,
            mealTypes: finalPreferences.mealTypes || finalPreferences.selectedMealTypes?.map(type => ({
              type: type as MealType['type'],
              days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
              adults: 2,
              kids: 0
            })) || [{ type: 'dinner', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], adults: 2, kids: 0 }],
            diets: finalPreferences.diets || [],
            allergies: finalPreferences.allergies || [],
            avoidIngredients: [],
            organicPreference: finalPreferences.organicPreference || 'no_preference',
            maxCookTime: finalPreferences.maxCookTime || 30,
            cookingSkillLevel: finalPreferences.cookingSkillLevel || 'intermediate',
            preferredCuisines: finalPreferences.preferredCuisines || [],
            preferredRetailers: [],
            selectedRecipes: selectedMeals
          }

          clearLocalStorage()
          setTimeout(() => onPreferencesComplete(completePreferences), 1000)
        }, 2000)

        return updatedState
      })
    }, 500)
  }, [onPreferencesComplete])

  const handleEditProgressItem = useCallback((itemKey: string) => {
    // TODO: Implement editing specific preference items
    console.log('Edit item:', itemKey)
  }, [])

  const handleChooseVoice = useCallback(() => {
    setConversationState(prev => ({
      ...prev,
      initialChoiceMade: true,
      conversationStarted: true,
      messages: [{
        id: 'welcome-voice',
        role: 'assistant',
        content: "Perfect! I'll open the voice chat now. You can speak naturally with me - no need to press any buttons!",
        timestamp: new Date()
      }]
    }))
    setTimeout(() => setShowVoiceUI(true), 500)
  }, [])

  const handleChooseGuided = useCallback(() => {
    setConversationState(prev => ({
      ...prev,
      initialChoiceMade: true,
      showGuidedOnboarding: true
    }))
  }, [])

  const handleChooseChat = useCallback(() => {
    console.log('=== handleChooseChat called in ConversationalChat ===')
    console.log('Current conversationState:', conversationState)
    
    setConversationState(prev => {
      console.log('Previous state:', prev)
      const newState = {
        ...prev,
        initialChoiceMade: true,
        conversationStarted: true
      }
      console.log('New state:', newState)
      return newState
    })
    
    console.log('About to call startConversation, function:', startConversation)
    try {
      startConversation()
      console.log('startConversation called successfully')
    } catch (error) {
      console.error('Error calling startConversation:', error)
    }
    console.log('=== handleChooseChat complete ===')
  }, [startConversation])

  const handleGuidedOnboardingComplete = useCallback((preferences: UserPreferences) => {
    // Complete the onboarding and trigger meal generation
    onPreferencesComplete(preferences)
  }, [onPreferencesComplete])

  const handleBackFromGuided = useCallback(() => {
    if (onBackToHome) {
      onBackToHome()
    } else {
      setConversationState(prev => ({
        ...prev,
        initialChoiceMade: false,
        showGuidedOnboarding: false
      }))
    }
  }, [onBackToHome])

  // Show welcome screen if no initial choice has been made
  console.log('ConversationalChat render - initialChoiceMade:', conversationState.initialChoiceMade)
  if (!conversationState.initialChoiceMade) {
    console.log('Rendering WelcomeScreen')
    // Skip welcome screen and go directly to guided onboarding
    handleChooseGuided()
    return null
  }

  // Show guided onboarding if selected
  if (conversationState.showGuidedOnboarding) {
    return <GuidedOnboarding onComplete={handleGuidedOnboardingComplete} onBack={handleBackFromGuided} />
  }

  return (
    <div className="h-screen bg-health-gradient flex flex-col overflow-hidden">
      {/* Header - Fixed height */}
      <header className="flex-shrink-0 bg-gradient-to-r from-sage-50 to-cream-50 border-b border-sage-200 px-4 py-3 shadow-soft backdrop-blur-md bg-opacity-95 z-50">
        <div className="flex items-center justify-between max-w-none w-full">
          {/* Left side - Back button and title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 min-h-[32px] text-neutral-600 hover:text-brand-600 hover:bg-sage-100 rounded-lg transition-all duration-200"
              aria-label="Go back to homepage"
              title="Back to homepage"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-brand-700 rounded-full flex items-center justify-center shadow-brand">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-display font-bold text-neutral-800">Meet Carter, Your AI Sous-Chef</h1>
          </div>
          
          {/* Right side - Action buttons */}
          <div className="flex items-center gap-2">
            {/* Hide voice and reset buttons during guided onboarding */}
            {!conversationState.showGuidedOnboarding && (
              <>
                {/* Voice Mode Button */}
                <button
                  onClick={() => setShowVoiceUI(true)}
                  className="btn-accent-new inline-flex items-center gap-2 px-3 py-2 text-sm"
                  aria-label="Try voice mode"
                >
                  <Mic className="w-4 h-4" />
                  Voice Mode
                </button>
                
                {/* Reset Button */}
                <button
                  onClick={resetConversation}
                  className="p-2 min-h-[32px] text-neutral-600 hover:text-brand-600 hover:bg-sage-100 rounded-lg transition-all duration-200"
                  aria-label="Reset conversation"
                  title="Start over"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_auto] xl:grid-cols-[1fr_auto] overflow-hidden">
        {/* Messages Area */}
        <div className="flex flex-col h-full relative min-w-0">
          {/* Messages Container - Scrollable */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 pb-0">
            <div className="max-w-4xl mx-auto">
              <div role="log" aria-live="polite" aria-label="Conversation messages">
                {conversationState.messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    id={message.id}
                    role={message.role}
                    content={message.content}
                    timestamp={message.timestamp}
                  />
                ))}
                
                {isTyping && <TypingIndicator />}
                
                {/* Quick Reply Grid - Show for current conversation step */}
                {(() => {
                  // Don't show quick replies if we haven't made the initial choice yet
                  if (!conversationState.initialChoiceMade) return null
                  
                  // Don't show quick replies if only welcome message exists (no user interaction yet)
                  const hasUserMessages = conversationState.messages.some(msg => msg.role === 'user')
                  
                  // Don't show quick replies if step is already completed
                  const currentStepCompleted = conversationState.conversationFlow.currentStepId && 
                    conversationState.conversationFlow.completedSteps.has(conversationState.conversationFlow.currentStepId)
                  
                  // For meal_types step, also check if selectedMealTypes is already set
                  const mealTypesAlreadySet = conversationState.conversationFlow.currentStepId === 'meal_types' && 
                    conversationState.preferences.selectedMealTypes && 
                    conversationState.preferences.selectedMealTypes.length > 0
                  
                  const shouldShow = !isTyping && 
                   !conversationState.awaitingResponse && 
                   conversationState.conversationFlow.currentStepId &&
                   conversationState.conversationStarted &&
                   conversationState.messages.length > 0 &&
                   hasUserMessages &&
                   !currentStepCompleted &&
                   !mealTypesAlreadySet
                  
                  console.log('Quick replies should show?', shouldShow, {
                    isTyping,
                    awaitingResponse: conversationState.awaitingResponse,
                    currentStepId: conversationState.conversationFlow.currentStepId,
                    conversationStarted: conversationState.conversationStarted,
                    messageCount: conversationState.messages.length,
                    hasUserMessages,
                    initialChoiceMade: conversationState.initialChoiceMade
                  })
                  
                  if (!shouldShow) return null
                  
                  return (
                    <div className="mt-4">
                      {(() => {
                        const currentStep = getStepById(conversationState.conversationFlow.currentStepId)
                        if (currentStep && currentStep.quickReplies) {
                          return (
                            <QuickReplyGrid
                              quickReplies={currentStep.quickReplies}
                              onSelect={handleQuickReply}
                              disabled={conversationState.awaitingResponse}
                            />
                          )
                        }
                        return null
                      })()}
                    </div>
                  )
                })()}

                {/* Meal Selection Interface - Show when in meal selection step */}
                {conversationState.conversationFlow.currentStepId === 'meal_selection' && (
                  <MealSelectionMessage
                    id={`meal-selection-${Date.now()}`}
                    recipes={conversationState.generatedMeals || []}
                    onSelectionComplete={handleMealSelection}
                    isLoading={conversationState.isMealGenerationLoading || false}
                    timestamp={new Date()}
                    minSelections={3}
                    maxSelections={7}
                  />
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          {/* Fixed Bottom Section - Input Area */}
          <div className="flex-shrink-0">
            {/* Chat Input - Always Visible */}
            <div className="relative bg-white border-t border-sage-200">
              <ChatInput
                onSendMessage={handleTextInput}
                disabled={conversationState.awaitingResponse}
                placeholder="What's cookin?"
                isLoading={conversationState.awaitingResponse}
                maxLength={1000}
              />
            </div>
          </div>
        </div>

        {/* Progress Tracker - Desktop Sidebar */}
        <aside className={`hidden lg:block border-l border-sage-200 bg-white overflow-y-auto transition-all duration-300 ${
          desktopProgressTrackerCollapsed ? 'w-16' : 'w-80'
        }`}>
          <ProgressTracker
            preferences={conversationState.preferences}
            onEditItem={handleEditProgressItem}
            isCollapsed={desktopProgressTrackerCollapsed}
            onToggleCollapse={() => setDesktopProgressTrackerCollapsed(!desktopProgressTrackerCollapsed)}
          />
        </aside>
      </main>

      {/* Mobile Progress Tracker */}
      <div className="lg:hidden">
        <ProgressTracker
          preferences={conversationState.preferences}
          onEditItem={handleEditProgressItem}
          isCollapsed={progressTrackerCollapsed}
          onToggleCollapse={() => setProgressTrackerCollapsed(!progressTrackerCollapsed)}
          isMobile={true}
        />
      </div>

      {/* New Realtime Voice UI */}
      <NewRealtimeVoiceUI
        isVisible={showVoiceUI}
        onClose={() => {
          setShowVoiceUI(false)
          setIsListening(false)
        }}
        onTranscript={(text, isUser) => {
          // Add transcript messages to conversation
          if (text.trim()) {
            const message: ConversationMessage = {
              id: `voice-${isUser ? 'user' : 'ai'}-${Date.now()}`,
              role: isUser ? 'user' : 'assistant',
              content: text,
              timestamp: new Date(),
              isVoiceResponse: true
            }
            
            setConversationState(prev => ({
              ...prev,
              messages: [...prev.messages, message],
              conversationStarted: true
            }))
          }
        }}
      />
    </div>
  )
}