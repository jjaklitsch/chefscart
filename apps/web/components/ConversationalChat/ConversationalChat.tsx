"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ChefHat, RotateCcw, Mic } from 'lucide-react'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import TypingIndicator from './TypingIndicator'
import FullScreenVoiceUI from '../FullScreenVoiceUI'
import ProgressTracker from '../ProgressTracker'
import { UserPreferences, MealType } from '../../types'
import { getVoiceRecordingService } from '../../lib/voice-recording'

interface ConversationalChatProps {
  onPreferencesComplete: (preferences: UserPreferences) => void
  onProgressUpdate?: (preferences: Partial<UserPreferences>) => void
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
}

// localStorage utilities
const STORAGE_KEY = 'chefscart_conversation_state_v2'
const CURRENT_SCHEMA_VERSION = 2

const saveToLocalStorage = (state: ConversationState): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stateToSave = {
        ...state,
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

export default function ConversationalChat({ onPreferencesComplete, onProgressUpdate }: ConversationalChatProps) {
  const [conversationState, setConversationState] = useState<ConversationState>({
    preferences: {},
    awaitingResponse: false,
    messages: [],
    conversationStarted: false
  })
  const [isTyping, setIsTyping] = useState(false)
  const [showVoiceUI, setShowVoiceUI] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [showProgressTracker, setShowProgressTracker] = useState(true)
  const [progressTrackerCollapsed, setProgressTrackerCollapsed] = useState(false)
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
    
    if (savedState) {
      setConversationState(savedState)
    } else {
      // Start fresh conversation
      startConversation()
    }
  }, [])

  // Save state whenever it changes
  useEffect(() => {
    if (conversationState.conversationStarted) {
      const timeoutId = setTimeout(() => {
        saveToLocalStorage(conversationState)
      }, 100)
      
      return () => clearTimeout(timeoutId)
    }
  }, [conversationState])

  const startConversation = useCallback(() => {
    const welcomeMessage: ConversationMessage = {
      id: 'assistant-welcome',
      role: 'assistant',
      content: "Hi! I'm your AI sous-chef 👨‍🍳 I'm here to create the perfect personalized meal plan just for you. You can either type or speak to tell me about your meal preferences. What types of meals would you like me to plan for you?",
      timestamp: new Date()
    }

    setConversationState({
      preferences: {},
      awaitingResponse: false,
      messages: [welcomeMessage],
      conversationStarted: true
    })
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
      // Call the conversation processing API
      const response = await fetch('/api/conversation/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          context: JSON.stringify({
            preferences: conversationState.preferences,
            conversationHistory: conversationState.messages.slice(-3) // Last 3 messages for context
          })
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to process message')
      }
      
      const data = await response.json()
      
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
        
        // Merge extracted data with current preferences
        if (data.extractedData && Object.keys(data.extractedData).length > 0) {
          Object.entries(data.extractedData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              // Handle arrays by merging with existing values
              if (Array.isArray(value) && Array.isArray(newPreferences[key as keyof typeof newPreferences])) {
                newPreferences[key as keyof typeof newPreferences] = Array.from(
                  new Set([...newPreferences[key as keyof typeof newPreferences] as any[], ...value])
                ) as any
              } else {
                (newPreferences as any)[key] = value
              }
            }
          })
        }
        
        return {
          ...prev,
          messages: [...prev.messages, aiMessage],
          preferences: newPreferences,
          awaitingResponse: false
        }
      })
      
      // Set for voice response
      if (isVoice) {
        setLastAIResponse(data.response)
      }
      
      // Notify parent of progress update
      if (onProgressUpdate && data.extractedData && Object.keys(data.extractedData).length > 0) {
        onProgressUpdate({ ...conversationState.preferences, ...data.extractedData })
      }
      
      // Check if we have enough information to complete
      const updatedPreferences = { ...conversationState.preferences, ...data.extractedData }
      if (checkIfReadyToComplete(updatedPreferences)) {
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

  const checkIfReadyToComplete = (preferences: Partial<UserPreferences>): boolean => {
    // Basic requirements: meal types and at least some other preferences
    const hasMealTypes = preferences.selectedMealTypes && preferences.selectedMealTypes.length > 0
    const hasOtherInfo = preferences.diets || preferences.allergies || preferences.organicPreference || preferences.maxCookTime
    
    return Boolean(hasMealTypes && hasOtherInfo)
  }

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

  const resetConversation = useCallback(() => {
    clearLocalStorage()
    setConversationState({
      preferences: {},
      awaitingResponse: false,
      messages: [],
      conversationStarted: false
    })
    setShowVoiceUI(false)
    setIsListening(false)
    setLastAIResponse('')
    startConversation()
  }, [startConversation])

  const handleEditProgressItem = useCallback((itemKey: string) => {
    // TODO: Implement editing specific preference items
    console.log('Edit item:', itemKey)
  }, [])

  return (
    <div className="min-h-screen bg-health-gradient flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-brand-200 px-4 py-3 shadow-sm relative z-10">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-fresh-500 rounded-full flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">ChefsCart Assistant</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Voice Mode Button */}
            <button
              onClick={() => setShowVoiceUI(true)}
              className="btn-ghost p-2 min-h-[32px]"
              aria-label="Switch to voice mode"
              title="Switch to voice mode"
            >
              <Mic className="w-4 h-4" />
            </button>
            
            {/* Reset Button */}
            <button
              onClick={resetConversation}
              className="btn-ghost p-2 min-h-[32px]"
              aria-label="Reset conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content with Progress Tracker */}
      <div className="flex-1 flex relative">
        {/* Messages Area */}
        <div className={`flex-1 overflow-y-auto px-4 py-6 ${showProgressTracker && !progressTrackerCollapsed ? 'mr-80' : ''}`}>
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
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Progress Tracker */}
        {showProgressTracker && (
          <ProgressTracker
            preferences={conversationState.preferences}
            onEditItem={handleEditProgressItem}
            isCollapsed={progressTrackerCollapsed}
            onToggleCollapse={() => setProgressTrackerCollapsed(!progressTrackerCollapsed)}
          />
        )}
      </div>

      {/* Chat Input */}
      {!isTyping && (
        <div className={`${showProgressTracker && !progressTrackerCollapsed ? 'mr-80' : ''}`}>
          <ChatInput
            onSendMessage={handleTextInput}
            disabled={conversationState.awaitingResponse}
            placeholder="Tell me about your meal preferences..."
            isLoading={conversationState.awaitingResponse}
            maxLength={1000}
          />
        </div>
      )}

      {/* Full Screen Voice UI */}
      <FullScreenVoiceUI
        isVisible={showVoiceUI}
        onClose={() => {
          setShowVoiceUI(false)
          setIsListening(false)
        }}
        onVoiceInput={handleVoiceInput}
        aiResponseText={lastAIResponse}
        isListening={isListening}
        onStartListening={handleStartListening}
        onStopListening={handleStopListening}
      />
    </div>
  )
}