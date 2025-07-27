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
  type: 'single' | 'multiple' | 'pills' | 'number' | 'text'
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
    id: 'mealsPerWeek',
    title: 'Meals per Week',
    question: 'How many meals per week do you want for each type?',
    type: 'multiple',
    options: [
      { id: 'breakfasts', label: 'Breakfasts per week', value: 'breakfasts', icon: '🥞' },
      { id: 'lunches', label: 'Lunches per week', value: 'lunches', icon: '🥗' },
      { id: 'dinners', label: 'Dinners per week', value: 'dinners', icon: '🍽️' },
      { id: 'snacks', label: 'Snacks per week', value: 'snacks', icon: '🍿' },
      { id: 'desserts', label: 'Desserts per week', value: 'desserts', icon: '🍰' }
    ],
    required: true
  },
  {
    id: 'mealParticipation',
    title: 'Meal Participation',
    question: 'Will everyone in the household eat each of these meals?',
    type: 'single',
    options: [
      { id: 'yes', label: 'Yes (Use household size)', value: 'yes', icon: '👨‍👩‍👧‍👦' },
      { id: 'no', label: 'No (I need different counts)', value: 'no', icon: '⚙️' }
    ],
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
      { id: 'prefer', label: 'Prefer organic when available', value: 'prefer', icon: '🌱' },
      { id: 'required', label: 'Organic required', value: 'required', icon: '✅' },
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
    
    if (step.type === 'multiple' || step.type === 'pills') {
      const currentAnswers = answers[step.id] || []
      
      // Handle "none" option specially for dietary style
      if (step.id === 'dietaryStyle' && value.length === 0) {
        setAnswers(prev => ({ ...prev, [step.id]: [] }))
        return
      }
      
      // Toggle selection for multiple choice
      const isSelected = currentAnswers.some((item: any) => 
        Array.isArray(item) ? JSON.stringify(item) === JSON.stringify(value) : item === value
      )
      
      let newAnswers
      if (isSelected) {
        newAnswers = currentAnswers.filter((item: any) => 
          Array.isArray(item) ? JSON.stringify(item) !== JSON.stringify(value) : item !== value
        )
      } else {
        // For pills, flatten arrays when adding
        if (Array.isArray(value) && value.length === 1) {
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
    if (!currentStepData.required) return true
    
    // Special handling for household size
    if (currentStepData.id === 'householdSize') {
      return (answers.adults > 0) || (answers.kids > 0)
    }
    
    // Special handling for meals per week
    if (currentStepData.id === 'mealsPerWeek') {
      const mealCounts = ['breakfasts', 'lunches', 'dinners', 'snacks', 'desserts']
      return mealCounts.some(meal => (answers[meal] || 0) > 0)
    }
    
    const answer = answers[currentStepData.id]
    if (currentStepData.type === 'multiple' || currentStepData.type === 'pills') {
      return Array.isArray(answer) && answer.length > 0
    }
    if (currentStepData.type === 'text') {
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
        
        // Meals per week
        breakfastsPerWeek: answers.breakfasts || 0,
        lunchesPerWeek: answers.lunches || 0,
        dinnersPerWeek: answers.dinners || 0,
        snacksPerWeek: answers.snacks || 0,
        dessertsPerWeek: answers.desserts || 0,
        
        // Dietary preferences
        dietaryStyle: [
          ...(answers.dietaryStyle?.filter(style => style !== 'other') || []),
          ...(answers.dietaryStyleOther ? [answers.dietaryStyleOther] : [])
        ],
        foodsToAvoid: answers.foodsToAvoid ? answers.foodsToAvoid.split(',').map(s => s.trim()) : [],
        favoriteFoods: answers.favoriteFoods || [],
        
        // Health and cooking preferences
        healthGoal: answers.healthGoal || 'maintain',
        maxCookingTime: answers.cookingTime || 30,
        cookingSkillLevel: answers.cookingSkill || 'intermediate',
        budgetSensitivity: answers.budgetSensitivity || 'no_limit',
        customBudgetAmount: answers.customBudgetAmount || '',
        organicPreference: answers.organicPreference || 'no_preference',
        
        // Cuisine preferences
        cuisinePreferences: [
          ...(answers.cuisinePreferences?.filter(cuisine => cuisine !== 'other') || []),
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
        allergies: answers.foodsToAvoid ? answers.foodsToAvoid.split(',').map(s => s.trim()) : [],
        mealsPerWeek: (answers.breakfasts || 0) + (answers.lunches || 0) + (answers.dinners || 0),
        peoplePerMeal: (answers.adults || 2) + ((answers.kids || 0) * 0.5),
        mealTypes: [
          // Create meal types based on selected counts
          ...(answers.breakfasts > 0 ? [{
            type: 'breakfast' as const,
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].slice(0, answers.breakfasts),
            adults: answers.adults || 2,
            kids: answers.kids || 0
          }] : []),
          ...(answers.lunches > 0 ? [{
            type: 'lunch' as const,
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].slice(0, answers.lunches),
            adults: answers.adults || 2,
            kids: answers.kids || 0
          }] : []),
          ...(answers.dinners > 0 ? [{
            type: 'dinner' as const,
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].slice(0, answers.dinners),
            adults: answers.adults || 2,
            kids: answers.kids || 0
          }] : []),
          ...(answers.snacks > 0 ? [{
            type: 'snacks' as const,
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].slice(0, answers.snacks),
            adults: answers.adults || 2,
            kids: answers.kids || 0
          }] : []),
          ...(answers.desserts > 0 ? [{
            type: 'dessert' as const,
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].slice(0, answers.desserts),
            adults: answers.adults || 2,
            kids: answers.kids || 0
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
    const answer = answers[currentStepData.id]
    if (currentStepData.type === 'multiple' || currentStepData.type === 'pills') {
      if (!Array.isArray(answer)) return false
      // For pills, check if any of the option values are in the answer array
      if (Array.isArray(option.value)) {
        return option.value.some((val: any) => answer.includes(val))
      }
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
                {currentStepData.title}
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
            {currentStepData.question}
          </h2>

          {/* Input based on step type */}
          {currentStepData.type === 'number' && (
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

          {currentStepData.type === 'text' && (
            <div>
              <textarea
                value={answers[currentStepData.id] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [currentStepData.id]: e.target.value }))}
                className="w-full p-3 border-2 border-neutral-200 rounded-lg focus:border-brand-500 focus:ring-0"
                rows={3}
                placeholder={currentStepData.id === 'foodsToAvoid' ? 'e.g. peanuts, shellfish, very spicy' : 'e.g. Training for half-marathon; low-sodium please.'}
              />
            </div>
          )}

          {currentStepData.id === 'mealsPerWeek' && (
            <div className="space-y-4">
              {currentStepData.options?.map((option) => (
                <div key={option.id} className="flex items-center justify-between p-4 border-2 border-neutral-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.icon}</span>
                    <span className="font-medium">{option.label}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="7"
                    value={answers[option.id] || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [option.id]: parseInt(e.target.value) || 0 }))}
                    className="w-20 p-2 border border-neutral-300 rounded text-center"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Per-meal sliders when meal participation is "no" */}
          {currentStepData.id === 'mealParticipation' && answers.mealParticipation === 'no' && (
            <div className="mt-6 p-4 bg-neutral-50 rounded-lg border">
              <h4 className="font-medium text-neutral-800 mb-4">Set serving sizes for each meal type:</h4>
              <div className="space-y-4">
                {/* Only show meal types that have a count > 0 */}
                {answers.breakfasts > 0 && (
                  <div className="grid grid-cols-3 gap-4 items-center">
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
                  </div>
                )}
                
                {answers.lunches > 0 && (
                  <div className="grid grid-cols-3 gap-4 items-center">
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
                  </div>
                )}

                {answers.dinners > 0 && (
                  <div className="grid grid-cols-3 gap-4 items-center">
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
                  </div>
                )}

                {answers.snacks > 0 && (
                  <div className="grid grid-cols-3 gap-4 items-center">
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
                  </div>
                )}

                {answers.desserts > 0 && (
                  <div className="grid grid-cols-3 gap-4 items-center">
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
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pill button layout for specific multi-select options */}
          {currentStepData.type === 'pills' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {currentStepData.options?.map((option) => (
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
                  {answers.favoriteFoods?.filter(food => !currentStepData.options?.some(opt => opt.value.includes(food))).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {answers.favoriteFoods.filter(food => !currentStepData.options?.some(opt => opt.value.includes(food))).map((food, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-sm"
                        >
                          {food}
                          <button
                            onClick={() => {
                              const updatedFoods = answers.favoriteFoods?.filter(f => f !== food) || []
                              setAnswers(prev => ({ ...prev, favoriteFoods: updatedFoods }))
                            }}
                            className="w-4 h-4 text-brand-500 hover:text-brand-700"
                          >
                            ×
                          </button>
                        </span>
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
          {currentStepData.type !== 'number' && currentStepData.type !== 'text' && currentStepData.type !== 'pills' && currentStepData.id !== 'mealsPerWeek' && currentStepData.id !== 'mealParticipation' && (
            <div className="space-y-4">
              <div className="grid gap-3">
                {currentStepData.options?.map((option) => (
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
              {(currentStepData.id === 'budgetSensitivity' && answers.budgetSensitivity === 'custom') && (
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
          {currentStepData.id === 'mealParticipation' && (
            <div className="grid gap-3">
              {currentStepData.options?.map((option) => (
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
            {currentStep === 0 ? 'Back to options' : 'Previous'}
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