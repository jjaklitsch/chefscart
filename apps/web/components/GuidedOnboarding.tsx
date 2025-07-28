"use client"

import React, { useState } from 'react'
import { ChefHat, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { UserPreferences } from '../types'

interface GuidedOnboardingProps {
  onComplete: (preferences: UserPreferences) => void
  onBack: () => void
}

interface OnboardingStep {
  id: string
  title: string
  question: string
  type: 'single' | 'multiple' | 'pills' | 'number' | 'text' | 'meal-frequency' | 'meal-servings'
  options?: Array<{ id: string; label: string; value: any; icon?: string }>
  required?: boolean
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'householdSize',
    title: 'Household Size',
    question: 'Tell us about your household',
    type: 'number',
    required: true
  },
  {
    id: 'mealFrequency',
    title: 'Meal Planning',
    question: 'How many meals per week would you like for each type?',
    type: 'meal-frequency',
    required: true
  },
  {
    id: 'mealParticipation',
    title: 'Meal Participation',
    question: 'Who will be eating each meal?',
    type: 'meal-servings',
    required: true
  },
  {
    id: 'dietaryStyle',
    title: 'Dietary Style',
    question: 'Choose any dietary styles that apply (optional)',
    type: 'pills',
    options: [
      { id: 'none', label: 'None', value: [], icon: '✅' },
      { id: 'vegan', label: 'Vegan', value: ['vegan'], icon: '🌱' },
      { id: 'vegetarian', label: 'Vegetarian', value: ['vegetarian'], icon: '🥬' },
      { id: 'keto', label: 'Keto', value: ['keto'], icon: '🥑' },
      { id: 'paleo', label: 'Paleo', value: ['paleo'], icon: '🥩' },
      { id: 'gluten_free', label: 'Gluten-Free', value: ['gluten-free'], icon: '🌾' },
      { id: 'low_carb', label: 'Low-Carb', value: ['low-carb'], icon: '🥒' },
      { id: 'pescatarian', label: 'Pescatarian', value: ['pescatarian'], icon: '🐟' },
      { id: 'mediterranean', label: 'Mediterranean', value: ['mediterranean'], icon: '🫒' },
      { id: 'whole30', label: 'Whole30', value: ['whole30'], icon: '🥗' },
      { id: 'dairy_free', label: 'Dairy-Free', value: ['dairy-free'], icon: '🥛' },
      { id: 'nut_free', label: 'Nut-Free', value: ['nut-free'], icon: '🥜' },
      { id: 'other', label: 'Other', value: 'other', icon: '✏️' }
    ]
  },
  {
    id: 'foodsToAvoid',
    title: 'Foods to Avoid',
    question: 'List any allergies, dislikes, or foods to avoid (comma-separated)',
    type: 'text',
    required: false
  },
  {
    id: 'healthGoal',
    title: 'Primary Health Goal',
    question: 'What\'s your primary health goal?',
    type: 'single',
    options: [
      { id: 'weight_loss', label: 'Weight loss', value: 'weight_loss', icon: '📉' },
      { id: 'muscle_gain', label: 'Muscle gain', value: 'muscle_gain', icon: '💪' },
      { id: 'maintain', label: 'Maintain current health', value: 'maintain', icon: '⚖️' },
      { id: 'family_balanced', label: 'Family balanced nutrition', value: 'family_balanced', icon: '👨‍👩‍👧‍👦' },
      { id: 'athletic', label: 'Athletic performance', value: 'athletic', icon: '🏃‍♂️' }
    ],
    required: true
  },
  {
    id: 'cookingTime',
    title: 'Maximum Cook Time',
    question: 'Maximum cook-time per meal?',
    type: 'single',
    options: [
      { id: '15min', label: '15 minutes', value: 15, icon: '⚡' },
      { id: '30min', label: '30 minutes', value: 30, icon: '⏰' },
      { id: '45min', label: '45 minutes', value: 45, icon: '🧘' },
      { id: '60min', label: '60 minutes', value: 60, icon: '👨‍🍳' }
    ],
    required: true
  },
  {
    id: 'cookingSkill',
    title: 'Cooking Skill Level',
    question: 'What\'s your cooking skill level?',
    type: 'single',
    options: [
      { id: 'beginner', label: 'Beginner', value: 'beginner', icon: '🔰' },
      { id: 'intermediate', label: 'Intermediate', value: 'intermediate', icon: '👨‍🍳' },
      { id: 'advanced', label: 'Advanced', value: 'advanced', icon: '👨‍🍳' }
    ],
    required: true
  },
  {
    id: 'budgetSensitivity',
    title: 'Budget Sensitivity',
    question: 'Target per-serving cost?',
    type: 'single',
    options: [
      { id: 'no_limit', label: 'No limit', value: 'no_limit', icon: '💳' },
      { id: 'under_8', label: '≤ $8 per serving', value: 'under_8', icon: '💵' },
      { id: 'under_12', label: '≤ $12 per serving', value: 'under_12', icon: '💵' },
      { id: 'under_18', label: '≤ $18 per serving', value: 'under_18', icon: '💵' },
      { id: 'custom', label: 'Custom amount (specify)', value: 'custom', icon: '✏️' }
    ],
    required: true
  },
  {
    id: 'organicPreference',
    title: 'Organic Preference',
    question: 'What\'s your preference for organic ingredients?',
    type: 'single',
    options: [
      { id: 'preferred', label: 'Prefer organic when available', value: 'preferred', icon: '🌱' },
      { id: 'only_if_within_10_percent', label: 'Only if within 10% of regular price', value: 'only_if_within_10_percent', icon: '💰' },
      { id: 'no_preference', label: 'No preference', value: 'no_preference', icon: '🤷‍♂️' }
    ],
    required: true
  },
  {
    id: 'favoriteFoods',
    title: 'Favorite Foods',
    question: 'What foods do you love? Select any that appeal to you:',
    type: 'pills',
    options: [
      { id: 'chicken', label: 'Chicken', value: ['chicken'], icon: '🐔' },
      { id: 'steak', label: 'Steak', value: ['steak'], icon: '🥩' },
      { id: 'salmon', label: 'Salmon', value: ['salmon'], icon: '🐟' },
      { id: 'shrimp', label: 'Shrimp', value: ['shrimp'], icon: '🦐' },
      { id: 'tofu', label: 'Tofu', value: ['tofu'], icon: '🧀' },
      { id: 'eggs', label: 'Eggs', value: ['eggs'], icon: '🥚' },
      { id: 'rice_bowls', label: 'Rice Bowls', value: ['rice bowls'], icon: '🍚' },
      { id: 'pasta', label: 'Pasta', value: ['pasta'], icon: '🍝' },
      { id: 'tacos', label: 'Tacos', value: ['tacos'], icon: '🌮' },
      { id: 'stir_fry', label: 'Stir-Fry', value: ['stir-fry'], icon: '🥘' },
      { id: 'salads', label: 'Salads', value: ['salads'], icon: '🥗' },
      { id: 'soups', label: 'Soups', value: ['soups'], icon: '🍲' },
      { id: 'burgers', label: 'Burgers', value: ['burgers'], icon: '🍔' },
      { id: 'smoothies', label: 'Smoothies', value: ['smoothies'], icon: '🥤' },
      { id: 'oatmeal', label: 'Oatmeal', value: ['oatmeal'], icon: '🥣' },
      { id: 'yogurt', label: 'Yogurt', value: ['yogurt'], icon: '🥛' },
      { id: 'roasted_veggies', label: 'Roasted Veggies', value: ['roasted vegetables'], icon: '🥕' }
    ]
  },
  {
    id: 'cuisinePreferences',
    title: 'Favorite Cuisines',
    question: 'What cuisines would you like to include? (optional)',
    type: 'pills',
    options: [
      { id: 'mexican', label: 'Mexican', value: ['mexican'], icon: '🌮' },
      { id: 'italian', label: 'Italian', value: ['italian'], icon: '🍝' },
      { id: 'chinese', label: 'Chinese', value: ['chinese'], icon: '🥢' },
      { id: 'japanese', label: 'Japanese', value: ['japanese'], icon: '🍣' },
      { id: 'thai', label: 'Thai', value: ['thai'], icon: '🌶️' },
      { id: 'indian', label: 'Indian', value: ['indian'], icon: '🍛' },
      { id: 'mediterranean', label: 'Mediterranean', value: ['mediterranean'], icon: '🫒' },
      { id: 'american', label: 'American', value: ['american'], icon: '🇺🇸' },
      { id: 'french', label: 'French', value: ['french'], icon: '🥖' },
      { id: 'greek', label: 'Greek', value: ['greek'], icon: '🧄' },
      { id: 'korean', label: 'Korean', value: ['korean'], icon: '🥢' },
      { id: 'vietnamese', label: 'Vietnamese', value: ['vietnamese'], icon: '🍜' },
      { id: 'middle_eastern', label: 'Middle Eastern', value: ['middle eastern'], icon: '🥙' },
      { id: 'global_mix', label: 'Global Mix', value: ['mexican', 'italian', 'asian', 'mediterranean', 'american'], icon: '🌍' },
      { id: 'other', label: 'Other', value: 'other', icon: '✏️' }
    ]
  },
  {
    id: 'additionalConsiderations',
    title: 'Additional Considerations',
    question: 'Anything else I should consider? (optional)',
    type: 'text',
    required: false
  }
]

export default function GuidedOnboarding({ onComplete, onBack }: GuidedOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})

  const currentStepData = onboardingSteps[currentStep]
  const isLastStep = currentStep === onboardingSteps.length - 1
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100

  const handleAnswer = (value: any) => {
    const step = currentStepData
    if (!step) return
    
    if (step.type === 'multiple' || step.type === 'pills') {
      const currentAnswers = answers[step.id] || []
      
      // Handle "none" option specially for dietary style
      if (step.id === 'dietaryStyle' && Array.isArray(value) && value.length === 0) {
        // Toggle "none" - if already selected (empty array), unselect it (undefined)
        // If not selected, select it (empty array)
        if (Array.isArray(currentAnswers) && currentAnswers.length === 0) {
          setAnswers(prev => ({ ...prev, [step.id]: undefined })) // Unselect by setting to undefined
        } else {
          setAnswers(prev => ({ ...prev, [step.id]: [] })) // Select by setting to empty array
        }
        return
      }
      
      // Toggle selection for multiple choice
      let isSelected
      if (Array.isArray(value) && value.length > 1) {
        // For multi-value options, check by option ID
        const optionId = currentStepData.options?.find(opt => JSON.stringify(opt.value) === JSON.stringify(value))?.id
        isSelected = currentAnswers.includes(optionId)
      } else if (Array.isArray(value) && value.length === 1) {
        // For single-value arrays, check the actual value
        isSelected = currentAnswers.includes(value[0])
      } else {
        isSelected = currentAnswers.some((item: any) => 
          Array.isArray(item) ? JSON.stringify(item) === JSON.stringify(value) : item === value
        )
      }
      
      let newAnswers
      if (isSelected) {
        // Remove by option ID for multi-value options, by value for others
        if (Array.isArray(value) && value.length > 1) {
          // Find and remove the option ID that corresponds to this multi-value option
          const optionId = currentStepData.options?.find(opt => JSON.stringify(opt.value) === JSON.stringify(value))?.id
          newAnswers = currentAnswers.filter((item: any) => item !== optionId)
        } else if (Array.isArray(value) && value.length === 1) {
          // For single-value arrays, remove the actual value
          newAnswers = currentAnswers.filter((item: any) => item !== value[0])
        } else {
          newAnswers = currentAnswers.filter((item: any) => 
            Array.isArray(item) ? JSON.stringify(item) !== JSON.stringify(value) : item !== value
          )
        }
      } else {
        // For multi-value pills (like Global Mix), store the option ID instead of expanding
        if (Array.isArray(value) && value.length > 1) {
          const optionId = currentStepData.options?.find(opt => JSON.stringify(opt.value) === JSON.stringify(value))?.id
          newAnswers = [...currentAnswers, optionId]
        } else if (Array.isArray(value) && value.length === 1) {
          newAnswers = [...currentAnswers, value[0]]
        } else if (Array.isArray(value)) {
          newAnswers = [...currentAnswers, ...value]
        } else {
          newAnswers = [...currentAnswers, value]
        }
      }
      
      setAnswers(prev => ({ ...prev, [step.id]: newAnswers }))
    } else {
      setAnswers(prev => ({ ...prev, [step.id]: value }))
    }
  }

  const canContinue = () => {
    if (!currentStepData?.required) return true
    
    // Special handling for household size
    if (currentStepData?.id === 'householdSize') {
      return (answers.adults > 0) || (answers.kids > 0)
    }
    
    // Special handling for meal frequency
    if (currentStepData?.id === 'mealFrequency') {
      return (answers.breakfastMeals || 0) > 0 || (answers.lunchMeals || 0) > 0 || (answers.dinnerMeals || 0) > 0
    }
    
    // Special handling for meal participation
    if (currentStepData?.id === 'mealParticipation') {
      // At least one meal type must have some participation
      const hasBreakfastParticipation = (answers.breakfastMeals || 0) === 0 || ((answers.breakfastAdults || answers.adults || 0) + (answers.breakfastKids || answers.kids || 0)) > 0
      const hasLunchParticipation = (answers.lunchMeals || 0) === 0 || ((answers.lunchAdults || answers.adults || 0) + (answers.lunchKids || answers.kids || 0)) > 0
      const hasDinnerParticipation = (answers.dinnerMeals || 0) === 0 || ((answers.dinnerAdults || answers.adults || 0) + (answers.dinnerKids || answers.kids || 0)) > 0
      return hasBreakfastParticipation && hasLunchParticipation && hasDinnerParticipation
    }
    
    const answer = answers[currentStepData?.id || '']
    if (currentStepData?.type === 'multiple' || currentStepData?.type === 'pills') {
      return Array.isArray(answer) && answer.length > 0
    }
    if (currentStepData?.type === 'text') {
      return true // Text fields are optional even if marked required
    }
    return answer !== undefined && answer !== null
  }

  const handleNext = () => {
    if (isLastStep) {
      // Convert answers to UserPreferences format
      const preferences: UserPreferences = {
        // Household size
        adults: answers.adults || 2,
        kids: answers.kids || 0,
        
        // Meals per week - use selected frequencies
        breakfastsPerWeek: answers.breakfastMeals || 0,
        lunchesPerWeek: answers.lunchMeals || 0,
        dinnersPerWeek: answers.dinnerMeals || 0,
        snacksPerWeek: 0, // Remove snacks as requested
        dessertsPerWeek: 0, // Remove desserts as requested
        
        // Dietary preferences
        dietaryStyle: [
          ...(answers.dietaryStyle?.filter((style: string) => style !== 'other') || []),
          ...(answers.dietaryStyleOther ? [answers.dietaryStyleOther] : [])
        ],
        foodsToAvoid: answers.foodsToAvoid ? answers.foodsToAvoid.split(',').map((s: string) => s.trim()) : [],
        favoriteFoods: answers.favoriteFoods || [],
        
        // Health and cooking preferences
        healthGoal: answers.healthGoal || 'maintain',
        maxCookingTime: answers.cookingTime || 30,
        cookingSkillLevel: answers.cookingSkill || 'intermediate',
        budgetSensitivity: answers.budgetSensitivity || 'no_limit',
        customBudgetAmount: answers.customBudgetAmount || '',
        organicPreference: answers.organicPreference || 'no_preference',
        
        // Cuisine preferences - expand option IDs to actual values
        cuisinePreferences: [
          ...((answers.cuisinePreferences || []).reduce((acc: string[], item: string) => {
            if (item === 'other') return acc
            // Check if this is an option ID that needs to be expanded
            const option = onboardingSteps.find(step => step.id === 'cuisinePreferences')?.options?.find(opt => opt.id === item)
            if (option && Array.isArray(option.value)) {
              return [...acc, ...option.value]
            }
            return [...acc, item]
          }, [])),
          ...(answers.cuisinePreferencesOther ? [answers.cuisinePreferencesOther] : [])
        ],
        
        // Meal participation settings
        mealParticipation: answers.mealParticipation || 'yes',
        
        // Additional considerations
        additionalConsiderations: answers.additionalConsiderations || '',
        dietaryStyleOther: answers.dietaryStyleOther || '',
        cuisinePreferencesOther: answers.cuisinePreferencesOther || '',
        
        // Legacy fields for compatibility
        selectedMealTypes: [],
        diets: answers.dietaryStyle?.flat() || [],
        allergies: answers.foodsToAvoid ? answers.foodsToAvoid.split(',').map((s: string) => s.trim()) : [],
        maxCookTime: answers.cookingTime || 30,
        preferredCuisines: [
          ...((answers.cuisinePreferences || []).reduce((acc: string[], item: string) => {
            if (item === 'other') return acc
            // Check if this is an option ID that needs to be expanded
            const option = onboardingSteps.find(step => step.id === 'cuisinePreferences')?.options?.find(opt => opt.id === item)
            if (option && Array.isArray(option.value)) {
              return [...acc, ...option.value]
            }
            return [...acc, item]
          }, [])),
          ...(answers.cuisinePreferencesOther ? [answers.cuisinePreferencesOther] : [])
        ],
        mealsPerWeek: (answers.breakfastMeals || 0) + (answers.lunchMeals || 0) + (answers.dinnerMeals || 0),
        peoplePerMeal: (answers.adults || 2) + ((answers.kids || 0) * 0.5),
        mealTypes: [
          ...(answers.breakfastMeals > 0 ? [{
            type: 'breakfast' as const,
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].slice(0, answers.breakfastMeals),
            adults: answers.breakfastAdults || answers.adults || 2,
            kids: answers.breakfastKids || answers.kids || 0
          }] : []),
          ...(answers.lunchMeals > 0 ? [{
            type: 'lunch' as const,
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].slice(0, answers.lunchMeals),
            adults: answers.lunchAdults || answers.adults || 2,
            kids: answers.lunchKids || answers.kids || 0
          }] : []),
          ...(answers.dinnerMeals > 0 ? [{
            type: 'dinner' as const,
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].slice(0, answers.dinnerMeals),
            adults: answers.dinnerAdults || answers.adults || 2,
            kids: answers.dinnerKids || answers.kids || 0
          }] : [])
        ]
      }
      
      onComplete(preferences)
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep === 0) {
      onBack()
    } else {
      setCurrentStep(prev => prev - 1)
    }
  }

  const isOptionSelected = (option: any) => {
    if (!currentStepData) return false
    const answer = answers[currentStepData.id]
    if (currentStepData.type === 'multiple' || currentStepData.type === 'pills') {
      // Special handling for "None" option with empty array value
      if (option.id === 'none' && Array.isArray(option.value) && option.value.length === 0) {
        // Return true if answer is specifically an empty array (not undefined or other values)
        return Array.isArray(answer) && answer.length === 0
      }
      
      if (!Array.isArray(answer)) return false
      
      // Store and check by option ID for multi-value options to avoid cross-selection
      if (Array.isArray(option.value) && option.value.length > 1) {
        return answer.includes(option.id)
      }
      // For single-value arrays, check the actual value
      if (Array.isArray(option.value) && option.value.length === 1) {
        return answer.includes(option.value[0])
      }
      // For non-array values, check directly
      return answer.includes(option.value)
    }
    return answer === option.value
  }

  return (
    <div className="min-h-screen bg-health-gradient flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-soft max-w-2xl w-full p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-600 to-brand-700 rounded-full flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-neutral-800">
{currentStepData?.title}
              </h1>
              <p className="text-sm text-neutral-600">
                Step {currentStep + 1} of {onboardingSteps.length}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="bg-neutral-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-brand-500 to-brand-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-neutral-800 mb-6">
{currentStepData?.question}
          </h2>

          {/* Input based on step type */}
          {currentStepData?.type === 'number' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Adults (ages 12+)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={answers.adults || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, adults: parseInt(e.target.value) || 0 }))}
                    className="w-full p-3 border-2 border-neutral-200 rounded-lg focus:border-brand-500 focus:ring-0"
                    placeholder="e.g. 2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Kids (&lt; 12 yrs, count ½-portion)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={answers.kids || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, kids: parseInt(e.target.value) || 0 }))}
                    className="w-full p-3 border-2 border-neutral-200 rounded-lg focus:border-brand-500 focus:ring-0"
                    placeholder="e.g. 1"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStepData?.type === 'text' && (
            <div>
              <textarea
                value={answers[currentStepData?.id || ''] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [currentStepData?.id || '']: e.target.value }))}
                className="w-full p-3 border-2 border-neutral-200 rounded-lg focus:border-brand-500 focus:ring-0"
                rows={3}
                placeholder={currentStepData?.id === 'foodsToAvoid' ? 'e.g. peanuts, shellfish, very spicy' : 'e.g. Training for half-marathon; low-sodium please.'}
              />
            </div>
          )}

          {currentStepData?.type === 'meal-frequency' && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-600 mb-4">
                Don't worry, you'll be able to add snacks, drinks, and other groceries after choosing your meals.
              </p>
              <div className="flex items-center justify-between p-4 border-2 border-neutral-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥞</span>
                  <span className="font-medium">Breakfast</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="7"
                  value={answers.breakfastMeals || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, breakfastMeals: parseInt(e.target.value) || 0 }))}
                  className="w-20 p-2 border border-neutral-300 rounded text-center"
                  placeholder="0"
                />
              </div>
              <div className="flex items-center justify-between p-4 border-2 border-neutral-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥗</span>
                  <span className="font-medium">Lunch</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="7"
                  value={answers.lunchMeals || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, lunchMeals: parseInt(e.target.value) || 0 }))}
                  className="w-20 p-2 border border-neutral-300 rounded text-center"
                  placeholder="0"
                />
              </div>
              <div className="flex items-center justify-between p-4 border-2 border-neutral-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🍽️</span>
                  <span className="font-medium">Dinner</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="7"
                  value={answers.dinnerMeals || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, dinnerMeals: parseInt(e.target.value) || 0 }))}
                  className="w-20 p-2 border border-neutral-300 rounded text-center"
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {/* Meal servings step - always show sliders */}
          {currentStepData?.type === 'meal-servings' && (
            <div className="space-y-4">
              {/* Only show meal types that have meals per week > 0 */}
              {(answers.breakfastMeals || 0) > 0 && (
                <div className={`grid gap-4 items-center ${(answers.kids || 0) > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🥞</span>
                    <span className="font-medium">Breakfast</span>
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-600 mb-1">Adults</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={answers.breakfastAdults || answers.adults || 2}
                      onChange={(e) => setAnswers(prev => ({ ...prev, breakfastAdults: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <span className="text-sm text-neutral-500">{answers.breakfastAdults || answers.adults || 2}</span>
                  </div>
                  {(answers.kids || 0) > 0 && (
                    <div>
                      <label className="block text-sm text-neutral-600 mb-1">Kids</label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={answers.breakfastKids || answers.kids || 0}
                        onChange={(e) => setAnswers(prev => ({ ...prev, breakfastKids: parseInt(e.target.value) }))}
                        className="w-full"
                      />
                      <span className="text-sm text-neutral-500">{answers.breakfastKids || answers.kids || 0}</span>
                    </div>
                  )}
                </div>
              )}
              
              {(answers.lunchMeals || 0) > 0 && (
                <div className={`grid gap-4 items-center ${(answers.kids || 0) > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🥗</span>
                    <span className="font-medium">Lunch</span>
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-600 mb-1">Adults</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={answers.lunchAdults || answers.adults || 2}
                      onChange={(e) => setAnswers(prev => ({ ...prev, lunchAdults: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <span className="text-sm text-neutral-500">{answers.lunchAdults || answers.adults || 2}</span>
                  </div>
                  {(answers.kids || 0) > 0 && (
                    <div>
                      <label className="block text-sm text-neutral-600 mb-1">Kids</label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={answers.lunchKids || answers.kids || 0}
                        onChange={(e) => setAnswers(prev => ({ ...prev, lunchKids: parseInt(e.target.value) }))}
                        className="w-full"
                      />
                      <span className="text-sm text-neutral-500">{answers.lunchKids || answers.kids || 0}</span>
                    </div>
                  )}
                </div>
              )}

              {(answers.dinnerMeals || 0) > 0 && (
                <div className={`grid gap-4 items-center ${(answers.kids || 0) > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🍽️</span>
                    <span className="font-medium">Dinner</span>
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-600 mb-1">Adults</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={answers.dinnerAdults || answers.adults || 2}
                      onChange={(e) => setAnswers(prev => ({ ...prev, dinnerAdults: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <span className="text-sm text-neutral-500">{answers.dinnerAdults || answers.adults || 2}</span>
                  </div>
                  {(answers.kids || 0) > 0 && (
                    <div>
                      <label className="block text-sm text-neutral-600 mb-1">Kids</label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={answers.dinnerKids || answers.kids || 0}
                        onChange={(e) => setAnswers(prev => ({ ...prev, dinnerKids: parseInt(e.target.value) }))}
                        className="w-full"
                      />
                      <span className="text-sm text-neutral-500">{answers.dinnerKids || answers.kids || 0}</span>
                    </div>
                  )}
                </div>
              )}

              {(answers.snacksPerWeek || 0) > 0 && (
                <div className={`grid gap-4 items-center ${(answers.kids || 0) > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🍿</span>
                    <span className="font-medium">Snacks</span>
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-600 mb-1">Adults</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={answers.snacksAdults || answers.adults || 2}
                      onChange={(e) => setAnswers(prev => ({ ...prev, snacksAdults: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <span className="text-sm text-neutral-500">{answers.snacksAdults || answers.adults || 2}</span>
                  </div>
                  {(answers.kids || 0) > 0 && (
                    <div>
                      <label className="block text-sm text-neutral-600 mb-1">Kids</label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={answers.snacksKids || answers.kids || 0}
                        onChange={(e) => setAnswers(prev => ({ ...prev, snacksKids: parseInt(e.target.value) }))}
                        className="w-full"
                      />
                      <span className="text-sm text-neutral-500">{answers.snacksKids || answers.kids || 0}</span>
                    </div>
                  )}
                </div>
              )}

              {(answers.dessertsPerWeek || 0) > 0 && (
                <div className={`grid gap-4 items-center ${(answers.kids || 0) > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🍰</span>
                    <span className="font-medium">Desserts</span>
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-600 mb-1">Adults</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={answers.dessertsAdults || answers.adults || 2}
                      onChange={(e) => setAnswers(prev => ({ ...prev, dessertsAdults: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <span className="text-sm text-neutral-500">{answers.dessertsAdults || answers.adults || 2}</span>
                  </div>
                  {(answers.kids || 0) > 0 && (
                    <div>
                      <label className="block text-sm text-neutral-600 mb-1">Kids</label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={answers.dessertsKids || answers.kids || 0}
                        onChange={(e) => setAnswers(prev => ({ ...prev, dessertsKids: parseInt(e.target.value) }))}
                        className="w-full"
                      />
                      <span className="text-sm text-neutral-500">{answers.dessertsKids || answers.kids || 0}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pill button layout for specific multi-select options */}
          {currentStepData?.type === 'pills' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {currentStepData?.options?.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleAnswer(option.value)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border-2 text-sm transition-all duration-200 ${
                      isOptionSelected(option)
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-neutral-200 hover:border-brand-300 hover:bg-brand-25'
                    }`}
                  >
                    <span>{option.icon}</span>
                    <span className="font-medium">{option.label}</span>
                    {isOptionSelected(option) && (
                      <Check className="w-4 h-4 text-brand-600" />
                    )}
                  </button>
                ))}
              </div>

              {/* Free text chip input for favorite foods */}
              {currentStepData.id === 'favoriteFoods' && (
                <div className="mt-4">
                  <input
                    type="text"
                    value={answers.favoriteFoodsCustom || ''}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === 'Tab') && e.currentTarget.value.trim()) {
                        e.preventDefault()
                        const newFood = e.currentTarget.value.trim()
                        const currentFoods = answers.favoriteFoods || []
                        setAnswers(prev => ({ 
                          ...prev, 
                          favoriteFoods: [...currentFoods, newFood],
                          favoriteFoodsCustom: ''
                        }))
                      }
                    }}
                    onChange={(e) => setAnswers(prev => ({ ...prev, favoriteFoodsCustom: e.target.value }))}
                    className="w-full p-3 border-2 border-neutral-200 rounded-lg focus:border-brand-500 focus:ring-0"
                    placeholder="Type any food item and hit Enter to add..."
                  />
                  {/* Show custom added foods as removable chips */}
                  {answers.favoriteFoods?.filter((food: string) => !currentStepData?.options?.some(opt => opt.value.includes(food))).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {answers.favoriteFoods.filter((food: string) => !currentStepData?.options?.some(opt => opt.value.includes(food))).map((food: string, index: number) => (
                        <button
                          key={index}
                          onClick={() => {
                            const updatedFoods = answers.favoriteFoods?.filter((f: string) => f !== food) || []
                            setAnswers(prev => ({ ...prev, favoriteFoods: updatedFoods }))
                          }}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-full border-2 border-brand-500 bg-brand-50 text-brand-700 text-sm transition-all duration-200"
                        >
                          <span className="font-medium">{food}</span>
                          <Check className="w-4 h-4 text-brand-600" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Show additional text input for "other" options */}
              {((currentStepData.id === 'dietaryStyle' && answers.dietaryStyle?.includes('other')) ||
                (currentStepData.id === 'cuisinePreferences' && answers.cuisinePreferences?.includes('other'))) && (
                <div className="mt-4">
                  <input
                    type="text"
                    value={
                      currentStepData.id === 'dietaryStyle' ? (answers.dietaryStyleOther || '') :
                      currentStepData.id === 'cuisinePreferences' ? (answers.cuisinePreferencesOther || '') : ''
                    }
                    onChange={(e) => {
                      if (currentStepData.id === 'dietaryStyle') {
                        setAnswers(prev => ({ ...prev, dietaryStyleOther: e.target.value }))
                      } else if (currentStepData.id === 'cuisinePreferences') {
                        setAnswers(prev => ({ ...prev, cuisinePreferencesOther: e.target.value }))
                      }
                    }}
                    className="w-full p-3 border-2 border-neutral-200 rounded-lg focus:border-brand-500 focus:ring-0"
                    placeholder={
                      currentStepData.id === 'dietaryStyle' ? 'Please specify your dietary style...' :
                      currentStepData.id === 'cuisinePreferences' ? 'Please specify your favorite cuisines...' : ''
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* Regular grid layout for single/multiple choice options */}
          {currentStepData?.type !== 'number' && currentStepData?.type !== 'text' && currentStepData?.type !== 'pills' && currentStepData?.type !== 'meal-frequency' && currentStepData?.type !== 'meal-servings' && (
            <div className="space-y-4">
              <div className="grid gap-3">
                {currentStepData?.options?.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleAnswer(option.value)}
                    className={`p-4 rounded-lg border-2 text-left transition-all duration-200 flex items-center gap-3 ${
                      isOptionSelected(option)
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-neutral-200 hover:border-brand-300 hover:bg-brand-25'
                    }`}
                  >
                    <span className="text-2xl">{option.icon}</span>
                    <span className="font-medium">{option.label}</span>
                    {isOptionSelected(option) && (
                      <Check className="w-5 h-5 text-brand-600 ml-auto" />
                    )}
                  </button>
                ))}
              </div>

              {/* Show additional text input for budget custom option */}
              {(currentStepData?.id === 'budgetSensitivity' && answers.budgetSensitivity === 'custom') && (
                <div className="mt-4">
                  <input
                    type="text"
                    value={answers.customBudgetAmount || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, customBudgetAmount: e.target.value }))}
                    className="w-full p-3 border-2 border-neutral-200 rounded-lg focus:border-brand-500 focus:ring-0"
                    placeholder="e.g. $6.50 per serving"
                  />
                </div>
              )}
            </div>
          )}

          {/* Meal participation toggle */}
          {currentStepData?.id === 'mealParticipation' && (
            <div className="grid gap-3">
              {currentStepData?.options?.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleAnswer(option.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-all duration-200 flex items-center gap-3 ${
                    isOptionSelected(option)
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-neutral-200 hover:border-brand-300 hover:bg-brand-25'
                  }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="font-medium">{option.label}</span>
                  {isOptionSelected(option) && (
                    <Check className="w-5 h-5 text-brand-600 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            className="flex items-center gap-2 px-6 py-3 text-neutral-600 hover:text-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {currentStep === 0 ? 'Back to homepage' : 'Previous'}
          </button>

          <button
            onClick={handleNext}
            disabled={!canContinue()}
            className={`flex items-center gap-2 px-8 py-3 rounded-lg font-medium transition-all ${
              canContinue()
                ? 'bg-brand-600 text-white hover:bg-brand-700'
                : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
            }`}
          >
            {isLastStep ? 'Create My Meal Plan' : 'Next'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}