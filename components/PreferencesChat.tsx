"use client"

import { useState } from 'react'
import { ChefHat, Send, Upload, Image as ImageIcon } from 'lucide-react'
import { UserPreferences, MealType } from '../types'

interface PreferencesChatProps {
  onPreferencesComplete: (preferences: UserPreferences) => void
}

interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  options?: string[]
  multiSelect?: boolean
  inputType?: 'text' | 'number' | 'select' | 'multiselect' | 'file' | 'mealconfig'
}

export default function PreferencesChat({ onPreferencesComplete }: PreferencesChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI sous-chef 👨‍🍳 I'll help create the perfect meal plan for you. Let's start by selecting which meal types you'd like.",
      options: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Dessert'],
      inputType: 'multiselect'
    }
  ])
  
  const [currentStep, setCurrentStep] = useState(1)
  const [preferences, setPreferences] = useState<Partial<UserPreferences>>({})
  const [userInput, setUserInput] = useState('')
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [mealConfiguration, setMealConfiguration] = useState<Record<string, { days: number, adults: number, kids: number }>>({})

  const steps = [
    {
      question: "Which meal types would you like? (Select all that apply)",
      options: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Dessert'],
      inputType: 'multiselect' as const,
      key: 'mealTypes'
    },
    {
      question: "Now let's configure each meal type you selected...",
      inputType: 'mealconfig' as const,
      key: 'mealConfiguration'
    },
    {
      question: "Do you have any dietary restrictions or preferences? (Select all that apply)",
      options: ['Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'None'],
      inputType: 'multiselect' as const,
      key: 'diets'
    },
    {
      question: "Any food allergies we should know about?",
      inputType: 'text' as const,
      key: 'allergies'
    },
    {
      question: "What's your preference for organic ingredients?",
      options: ['Preferred', 'Only if within 10% of regular price', 'No preference'],
      inputType: 'select' as const,
      key: 'organicPreference'
    },
    {
      question: "What's the maximum cooking time you'd prefer?",
      options: ['15 minutes', '30 minutes', '45 minutes', '60+ minutes'],
      inputType: 'select' as const,
      key: 'maxCookTime'
    },
    {
      question: "How would you rate your cooking skill level?",
      options: ['Beginner', 'Intermediate', 'Advanced'],
      inputType: 'select' as const,
      key: 'cookingSkillLevel'
    },
    {
      question: "Any preferred cuisines? (Select all that apply)",
      options: ['Italian', 'Mexican', 'Asian', 'Mediterranean', 'American', 'Indian', 'French', 'Thai', 'No preference'],
      inputType: 'multiselect' as const,
      key: 'preferredCuisines'
    },
    {
      question: "Would you like to upload a photo of your pantry? This helps us avoid duplicate purchases!",
      inputType: 'file' as const,
      key: 'pantryPhoto'
    }
  ]

  const handleOptionSelect = (option: string) => {
    const step = steps[currentStep - 1]
    
    if (step.inputType === 'multiselect') {
      setSelectedOptions(prev => 
        prev.includes(option) 
          ? prev.filter(o => o !== option)
          : [...prev, option]
      )
    } else {
      setSelectedOptions([option])
    }
  }

  const handleSubmit = () => {
    const step = steps[currentStep - 1]
    let value: any = selectedOptions

    // Process the response based on input type
    if (step.inputType === 'text') {
      value = userInput.split(',').map(s => s.trim()).filter(s => s)
    } else if (step.inputType === 'select') {
      value = selectedOptions[0]
      if (step.key === 'maxCookTime') value = parseInt(value.split(' ')[0])
      if (step.key === 'cookingSkillLevel') value = value.toLowerCase()
      if (step.key === 'organicPreference') {
        const mapping: Record<string, string> = {
          'Preferred': 'preferred',
          'Only if within 10% of regular price': 'only_if_within_10_percent',
          'No preference': 'no_preference'
        }
        value = mapping[value] || 'no_preference'
      }
    } else if (step.inputType === 'multiselect') {
      if (step.key === 'mealTypes') {
        value = selectedOptions
      }
    } else if (step.inputType === 'mealconfig') {
      // Convert meal configuration to the expected format
      const mealTypes = Object.entries(mealConfiguration).map(([type, config]) => ({
        type: type.toLowerCase() as 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'dessert',
        days: Array.from({length: config.days}, (_, i) => 
          ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][i]
        ).filter(Boolean),
        adults: config.adults,
        kids: config.kids
      }))
      value = mealTypes
      
      // Calculate total meals per week
      const totalMeals = Object.values(mealConfiguration).reduce((sum, config) => sum + config.days, 0)
      setPreferences(prev => ({ ...prev, mealsPerWeek: totalMeals }))
    }

    // Update preferences
    const newPreferences = { ...preferences, [step.key]: value }
    setPreferences(newPreferences)

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${currentStep}`,
      role: 'user',
      content: step.inputType === 'multiselect' || step.inputType === 'text' 
        ? Array.isArray(value) 
          ? step.key === 'mealTypes' 
            ? value.join(', ')
            : value.join(', ')
          : String(value)
        : step.inputType === 'mealconfig'
          ? Object.entries(mealConfiguration).map(([type, config]) => 
              `${type}: ${config.days} days/week for ${config.adults} adults${config.kids > 0 ? ` + ${config.kids} kids` : ''}`
            ).join(', ')
          : selectedOptions[0] || userInput
    }

    setMessages(prev => [...prev, userMessage])

    // Check if we're done
    if (currentStep >= steps.length) {
      const assistantMessage: ChatMessage = {
        id: 'complete',
        role: 'assistant',
        content: "Perfect! I have everything I need to create your personalized meal plan. Let me generate some delicious recipes for you! 🎉"
      }
      setMessages(prev => [...prev, assistantMessage])
      
      // Complete preferences with defaults
      const completePreferences: UserPreferences = {
        mealsPerWeek: newPreferences.mealsPerWeek || 5,
        peoplePerMeal: newPreferences.peoplePerMeal || 2, // Calculate total people from meal configurations
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
      
      setTimeout(() => onPreferencesComplete(completePreferences), 2000)
      return
    }

    // Move to next step
    const nextStep = currentStep + 1
    const nextStepData = steps[nextStep - 1]
    
    const assistantMessage: ChatMessage = {
      id: `assistant-${nextStep}`,
      role: 'assistant',
      content: nextStepData.question,
      options: nextStepData.options,
      inputType: nextStepData.inputType,
      multiSelect: nextStepData.inputType === 'multiselect'
    }

    setMessages(prev => [...prev, assistantMessage])
    setCurrentStep(nextStep)
    setSelectedOptions([])
    setUserInput('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-orange-600 text-white p-6">
            <div className="flex items-center">
              <ChefHat className="h-8 w-8 mr-3" />
              <div>
                <h1 className="text-xl font-bold">ChefsCart Assistant</h1>
                <p className="text-orange-100">Step {currentStep} of {steps.length}</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-orange-100 h-2">
            <div 
              className="bg-orange-600 h-full transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>

          {/* Messages */}
          <div className="p-6 space-y-6 max-h-80 overflow-y-auto">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-lg px-4 py-3 rounded-xl shadow-sm ${
                  message.role === 'user' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          {currentStep <= steps.length && (
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              {(() => {
                const currentStepData = steps[currentStep - 1]
                
                if (currentStepData.inputType === 'select' || currentStepData.inputType === 'multiselect') {
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {currentStepData.options?.map((option) => (
                          <button
                            key={option}
                            onClick={() => handleOptionSelect(option)}
                            className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors border text-center ${
                              selectedOptions.includes(option)
                                ? 'bg-orange-600 text-white border-orange-600 shadow-md'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-orange-300 hover:bg-orange-50 hover:shadow-sm'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleSubmit}
                        disabled={selectedOptions.length === 0}
                        className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                      >
                        Continue <Send className="ml-2 h-4 w-4" />
                      </button>
                    </div>
                  )
                }

                if (currentStepData.inputType === 'text') {
                  return (
                    <div className="space-y-4">
                      <input
                        type={currentStepData.inputType}
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Type your answer..."
                        className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-base"
                        onKeyDown={(e) => e.key === 'Enter' && userInput.trim() && handleSubmit()}
                      />
                      <button
                        onClick={handleSubmit}
                        disabled={!userInput.trim()}
                        className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                      >
                        Continue <Send className="ml-2 h-4 w-4" />
                      </button>
                    </div>
                  )
                }

                if (currentStepData.inputType === 'file') {
                  return (
                    <div className="space-y-6">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-300 transition-colors bg-gray-50">
                        <ImageIcon className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-700 font-medium mb-2">Upload a photo of your pantry</p>
                        <p className="text-gray-500 text-sm mb-4">This helps us avoid suggesting ingredients you already have</p>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="pantry-upload"
                        />
                        <label htmlFor="pantry-upload" className="cursor-pointer">
                          <span className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 inline-flex items-center transition-colors text-sm">
                            <Upload className="mr-2 h-4 w-4" />
                            Choose Photo
                          </span>
                        </label>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={handleSubmit}
                          className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          Skip for now
                        </button>
                        <button
                          onClick={handleSubmit}
                          className="flex-1 bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          Continue with photo
                        </button>
                      </div>
                    </div>
                  )
                }

                if (currentStepData.inputType === 'mealconfig') {
                  const selectedMealTypes = selectedOptions.length > 0 ? selectedOptions : (preferences.mealTypes?.map(m => typeof m === 'string' ? m : m.type) || [])
                  
                  return (
                    <div className="space-y-6">
                      <div className="text-sm text-gray-600 mb-4">
                        Configure how many times per week you want each meal type, and for how many people:
                      </div>
                      
                      {selectedMealTypes.map((mealType: string) => {
                        const config = mealConfiguration[mealType] || { days: 1, adults: 2, kids: 0 }
                        
                        return (
                          <div key={mealType} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                            <h4 className="font-semibold text-lg text-gray-900 mb-4 capitalize">{mealType}</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Days per week
                                </label>
                                <select
                                  value={config.days}
                                  onChange={(e) => setMealConfiguration(prev => ({
                                    ...prev,
                                    [mealType]: { ...config, days: parseInt(e.target.value) }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
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
                                  onChange={(e) => setMealConfiguration(prev => ({
                                    ...prev,
                                    [mealType]: { ...config, adults: parseInt(e.target.value) }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
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
                                  onChange={(e) => setMealConfiguration(prev => ({
                                    ...prev,
                                    [mealType]: { ...config, kids: parseInt(e.target.value) }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
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
                        onClick={handleSubmit}
                        disabled={selectedMealTypes.length === 0}
                        className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                      >
                        Continue <Send className="ml-2 h-4 w-4" />
                      </button>
                    </div>
                  )
                }

                return null
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}