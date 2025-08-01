"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { ShoppingCart, ArrowRight, ArrowLeft, Check, Upload, X, Camera, Plus, Menu, CheckCircle } from 'lucide-react'
import { UserPreferences } from '../types'
import Header from './Header'

interface GuidedOnboardingProps {
  onComplete: (preferences: UserPreferences) => void
  onBack: () => void
  initialPreferences?: UserPreferences | null
}

interface OnboardingStep {
  id: string
  title: string
  question: string
  required?: boolean
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'planSelector',
    title: 'Plan your week',
    question: 'Tell us about your weekly meal needs',
    required: true
  },
  {
    id: 'dietaryStyle',
    title: 'Dietary preferences',
    question: 'What dietary style best describes you?',
    required: false
  },
  {
    id: 'foodsToAvoid',
    title: 'Foods to avoid',
    question: 'Are there any foods you need to avoid?',
    required: false
  },
  {
    id: 'healthGoal',
    title: 'Health goals',
    question: 'What is your primary health goal?',
    required: true
  },
  {
    id: 'cookingTime',
    title: 'Cooking time',
    question: 'How much time do you prefer to spend cooking?',
    required: true
  },
  {
    id: 'cookingSkill',
    title: 'Cooking skill',
    question: 'How would you describe your cooking experience?',
    required: true
  },
  {
    id: 'budgetSensitivity',
    title: 'Budget preference',
    question: 'What is your budget preference for meals?',
    required: true
  },
  {
    id: 'organicPreference',
    title: 'Organic preference',
    question: 'How do you feel about organic ingredients?',
    required: true
  },
  {
    id: 'favoriteFoods',
    title: 'Favorite foods',
    question: 'What are some of your favorite foods?',
    required: false
  },
  {
    id: 'cuisinePreferences',
    title: 'Favorite cuisines',
    question: 'What cuisines do you enjoy most?',
    required: false
  },
  {
    id: 'additionalConsiderations',
    title: 'Additional notes',
    question: 'Any other dietary considerations or preferences?',
    required: false
  },
  {
    id: 'fridgePantryPhotos',
    title: 'Got ingredients already?',
    question: 'Upload photos of your fridge and pantry to help us use what you already have',
    required: false
  }
]

// Dietary style options
const dietaryStyleOptions = [
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

// Favorite foods options  
const favoriteFoodsOptions = [
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

// Health goal options
const healthGoalOptions = [
  { id: 'weight_loss', label: 'Weight loss', value: 'weight_loss', icon: '📉' },
  { id: 'muscle_gain', label: 'Muscle gain', value: 'muscle_gain', icon: '💪' },
  { id: 'maintain', label: 'Maintain current health', value: 'maintain', icon: '⚖️' },
  { id: 'family_balanced', label: 'Family balanced nutrition', value: 'family_balanced', icon: '👨‍👩‍👧‍👦' },
  { id: 'athletic', label: 'Athletic performance', value: 'athletic', icon: '🏃‍♂️' }
]

// Cooking time options
const cookingTimeOptions = [
  { id: '15min', label: '15 minutes', value: 15, icon: '⚡' },
  { id: '30min', label: '30 minutes', value: 30, icon: '⏰' },
  { id: '45min', label: '45 minutes', value: 45, icon: '🧘' },
  { id: '60min', label: '60 minutes', value: 60, icon: '👨‍🍳' }
]

// Cooking skill options
const cookingSkillOptions = [
  { id: 'beginner', label: 'Beginner', value: 'beginner', icon: '🔰' },
  { id: 'intermediate', label: 'Intermediate', value: 'intermediate', icon: '👨‍🍳' },
  { id: 'advanced', label: 'Advanced', value: 'advanced', icon: '👨‍🍳' }
]

// Budget options
const budgetOptions = [
  { id: 'no_limit', label: 'No limit', value: 'no_limit', icon: '💳' },
  { id: 'under_8', label: '≤ $8 per serving', value: 'under_8', icon: '💵' },
  { id: 'under_12', label: '≤ $12 per serving', value: 'under_12', icon: '💵' },
  { id: 'under_18', label: '≤ $18 per serving', value: 'under_18', icon: '💵' },
  { id: 'custom', label: 'Custom amount (specify)', value: 'custom', icon: '✏️' }
]

// Cuisine preference options
const cuisinePreferenceOptions = [
  { id: 'italian', label: 'Italian', value: ['italian'], icon: '🇮🇹' },
  { id: 'mexican', label: 'Mexican', value: ['mexican'], icon: '🌮' },
  { id: 'asian', label: 'Asian', value: ['asian'], icon: '🥢' },
  { id: 'mediterranean', label: 'Mediterranean', value: ['mediterranean'], icon: '🫒' },
  { id: 'american', label: 'American', value: ['american'], icon: '🇺🇸' },
  { id: 'indian', label: 'Indian', value: ['indian'], icon: '🍛' },
  { id: 'thai', label: 'Thai', value: ['thai'], icon: '🌶️' },
  { id: 'chinese', label: 'Chinese', value: ['chinese'], icon: '🥡' },
  { id: 'japanese', label: 'Japanese', value: ['japanese'], icon: '🍣' },
  { id: 'korean', label: 'Korean', value: ['korean'], icon: '🇰🇷' },
  { id: 'french', label: 'French', value: ['french'], icon: '🇫🇷' },
  { id: 'greek', label: 'Greek', value: ['greek'], icon: '🇬🇷' },
  { id: 'spanish', label: 'Spanish', value: ['spanish'], icon: '🇪🇸' },
  { id: 'middle_eastern', label: 'Middle Eastern', value: ['middle_eastern'], icon: '🧆' },
  { id: 'moroccan', label: 'Moroccan', value: ['moroccan'], icon: '🇲🇦' },
  { id: 'vietnamese', label: 'Vietnamese', value: ['vietnamese'], icon: '🇻🇳' },
  { id: 'brazilian', label: 'Brazilian', value: ['brazilian'], icon: '🇧🇷' },
  { id: 'peruvian', label: 'Peruvian', value: ['peruvian'], icon: '🇵🇪' },
  { id: 'ethiopian', label: 'Ethiopian', value: ['ethiopian'], icon: '🇪🇹' },
  { id: 'jamaican', label: 'Jamaican', value: ['jamaican'], icon: '🇯🇲' },
  { id: 'variety', label: 'Mix it up!', value: ['italian', 'mexican', 'asian', 'american', 'indian', 'mediterranean'], icon: '🌍' },
  { id: 'other', label: 'Other', value: 'other', icon: '✏️' }
]

// LocalStorage utilities for preference persistence
const STORAGE_KEY = 'chefscart_preferences'

const savePreferencesToStorage = (preferences: Record<string, any>) => {
  try {
    const dataToSave = {
      ...preferences,
      lastUpdated: Date.now()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
  } catch (error) {
    console.warn('Failed to save preferences to localStorage:', error)
  }
}

const loadPreferencesFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Remove lastUpdated timestamp from the actual preferences
      const { lastUpdated, ...preferences } = parsed
      return preferences
    }
  } catch (error) {
    console.warn('Failed to load preferences from localStorage:', error)
  }
  return null
}

const clearStoredPreferences = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear stored preferences:', error)
  }
}

const convertPreferencesToAnswers = (preferences: UserPreferences): Record<string, any> => {
  return {
    // Plan selector
    servingsPerMeal: preferences.peoplePerMeal || 3,
    breakfastMeals: preferences.breakfastsPerWeek || 0,
    lunchMeals: preferences.lunchesPerWeek || 0,
    dinnerMeals: preferences.dinnersPerWeek || 0,
    
    // Other preferences - fix field mappings
    dietaryStyle: preferences.dietaryStyle || preferences.diets || [],
    foodsToAvoid: preferences.foodsToAvoid || preferences.avoidIngredients || [],
    healthGoal: preferences.healthGoal || 'maintain',
    cookingTime: preferences.maxCookingTime || preferences.maxCookTime || 30,
    cookingSkill: preferences.cookingSkillLevel || 'intermediate',
    budgetSensitivity: preferences.budgetSensitivity || 'no_limit',
    customBudgetAmount: preferences.customBudgetAmount || '',
    organicPreference: preferences.organicPreference || 'no_preference',
    favoriteFoods: preferences.favoriteFoods || [],
    cuisinePreferences: preferences.cuisinePreferences || preferences.preferredCuisines || [],
    additionalConsiderations: preferences.additionalConsiderations || '',
    
    // Photo upload related
    identifiedIngredients: preferences.identifiedIngredients || [],
    manuallyAddedIngredients: preferences.manuallyAddedIngredients || [],
    skipPhotoUpload: preferences.skipPhotoUpload || false
  }
}

export default function GuidedOnboarding({ onComplete, onBack, initialPreferences }: GuidedOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)
  const [answers, setAnswers] = useState<Record<string, any>>({
    // Default values for Plan Selector
    servingsPerMeal: 3,
    breakfastMeals: 0,
    lunchMeals: 5,
    dinnerMeals: 5
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showIngredientConfirmation, setShowIngredientConfirmation] = useState(false)
  const [identifiedIngredients, setIdentifiedIngredients] = useState<Array<{ name: string; quantity: number; unit: string }>>([])
  const [manualIngredientInput, setManualIngredientInput] = useState('')
  const [showChecklist, setShowChecklist] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [isAnalyzingPhotos, setIsAnalyzingPhotos] = useState(false)
  const [analysisTimer, setAnalysisTimer] = useState<NodeJS.Timeout | null>(null)
  const [isWaitingForAnalysis, setIsWaitingForAnalysis] = useState(false)
  const [editingItem, setEditingItem] = useState<{ index: number; type: 'identified' | 'manual' } | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pasteText, setPasteText] = useState('')

  // Load preferences from localStorage or initialPreferences on component mount
  useEffect(() => {
    let preferencesToLoad = null
    
    // Priority: initialPreferences > stored preferences
    if (initialPreferences) {
      preferencesToLoad = convertPreferencesToAnswers(initialPreferences)
    } else {
      preferencesToLoad = loadPreferencesFromStorage()
    }
    
    if (preferencesToLoad) {
      setAnswers(prevAnswers => ({
        ...prevAnswers,
        ...preferencesToLoad
      }))
    }
    setIsInitialized(true)
  }, [initialPreferences])

  // Mark completed steps when in edit mode (initialPreferences provided)
  useEffect(() => {
    if (isInitialized && initialPreferences) {
      // We're in edit mode - mark all valid steps as completed
      const newCompletedSteps = new Set<number>()
      
      for (let i = 0; i < onboardingSteps.length; i++) {
        if (isStepComplete(i)) {
          newCompletedSteps.add(i)
        }
      }
      
      setCompletedSteps(newCompletedSteps)
    }
  }, [isInitialized, initialPreferences, answers])

  // Save preferences to localStorage whenever answers change (after initial load)
  useEffect(() => {
    if (isInitialized) {
      savePreferencesToStorage(answers)
    }
  }, [answers, isInitialized])

  // Auto-mark steps as completed when they become valid
  useEffect(() => {
    if (isInitialized) {
      const newCompletedSteps = new Set(completedSteps)
      let hasChanges = false
      
      // Check all previous steps and current step
      for (let i = 0; i <= currentStep; i++) {
        if (!completedSteps.has(i) && isStepComplete(i)) {
          newCompletedSteps.add(i)
          hasChanges = true
        }
      }
      
      if (hasChanges) {
        setCompletedSteps(newCompletedSteps)
      }
    }
  }, [answers, currentStep, isInitialized, completedSteps])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (analysisTimer) {
        clearTimeout(analysisTimer)
      }
    }
  }, [analysisTimer])

  const currentStepData = onboardingSteps[currentStep]
  const isLastStep = currentStep === onboardingSteps.length - 1
  
  // Calculate totals for footer
  const totalMeals = (answers.breakfastMeals || 0) + (answers.lunchMeals || 0) + (answers.dinnerMeals || 0)
  const totalServings = totalMeals * (answers.servingsPerMeal || 3)

  // Handle pill selection for multi-select options
  const handlePillToggle = (field: string, value: any, options: any[]) => {
    const currentAnswers = answers[field] || []
    
    // Handle "none" option specially for dietary style
    if (field === 'dietaryStyle' && Array.isArray(value) && value.length === 0) {
      // If "None" is currently selected (either undefined or empty array), toggle it off by setting to undefined
      // If other options are selected, set to empty array (selecting "None")
      if (!answers[field] || (Array.isArray(currentAnswers) && currentAnswers.length === 0)) {
        setAnswers(prev => ({ ...prev, [field]: undefined }))
      } else {
        setAnswers(prev => ({ ...prev, [field]: [] }))
      }
      return
    }
    
    // Toggle selection for multiple choice
    let isSelected
    if (Array.isArray(value) && value.length > 1) {
      const optionId = options?.find(opt => JSON.stringify(opt.value) === JSON.stringify(value))?.id
      isSelected = currentAnswers.includes(optionId)
    } else if (Array.isArray(value) && value.length === 1) {
      isSelected = currentAnswers.includes(value[0])
    } else {
      isSelected = currentAnswers.some((item: any) => 
        Array.isArray(item) ? JSON.stringify(item) === JSON.stringify(value) : item === value
      )
    }
    
    let newAnswers
    if (isSelected) {
      if (Array.isArray(value) && value.length > 1) {
        const optionId = options?.find(opt => JSON.stringify(opt.value) === JSON.stringify(value))?.id
        newAnswers = currentAnswers.filter((item: any) => item !== optionId)
      } else if (Array.isArray(value) && value.length === 1) {
        newAnswers = currentAnswers.filter((item: any) => item !== value[0])
      } else {
        newAnswers = currentAnswers.filter((item: any) => 
          Array.isArray(item) ? JSON.stringify(item) !== JSON.stringify(value) : item !== value
        )
      }
    } else {
      if (Array.isArray(value) && value.length > 1) {
        const optionId = options?.find(opt => JSON.stringify(opt.value) === JSON.stringify(value))?.id
        newAnswers = [...currentAnswers, optionId]
      } else if (Array.isArray(value) && value.length === 1) {
        newAnswers = [...currentAnswers, value[0]]
      } else if (Array.isArray(value)) {
        newAnswers = [...currentAnswers, ...value]
      } else {
        newAnswers = [...currentAnswers, value]
      }
    }
    
    setAnswers(prev => ({ ...prev, [field]: newAnswers }))
  }

  // Check if a pill option is selected
  const isPillSelected = (field: string, option: any, options: any[]) => {
    const answer = answers[field]
    
    // Special handling for "None" option with empty array value
    if (option.id === 'none' && Array.isArray(option.value) && option.value.length === 0) {
      // "None" is selected when answer is undefined, null, or empty array
      return !answer || (Array.isArray(answer) && answer.length === 0)
    }
    
    if (!Array.isArray(answer)) return false
    
    // Store and check by option ID for multi-value options
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

  const canContinue = () => {
    if (!currentStepData?.required) return true
    
    // Plan Selector - at least one meal must be selected
    if (currentStepData?.id === 'planSelector') {
      return (answers.breakfastMeals || 0) > 0 || (answers.lunchMeals || 0) > 0 || (answers.dinnerMeals || 0) > 0
    }
    
    // Health Goal - must select a health goal
    if (currentStepData?.id === 'healthGoal') {
      return answers.healthGoal && answers.healthGoal.trim() !== ''
    }
    
    // Cooking Time - must select a time preference
    if (currentStepData?.id === 'cookingTime') {
      return answers.cookingTime && answers.cookingTime > 0
    }
    
    // Cooking Skill - must select a skill level
    if (currentStepData?.id === 'cookingSkill') {
      return answers.cookingSkill && answers.cookingSkill.trim() !== ''
    }
    
    // Budget Sensitivity - must select a budget preference
    if (currentStepData?.id === 'budgetSensitivity') {
      return answers.budgetSensitivity && answers.budgetSensitivity.trim() !== ''
    }
    
    // All other steps are optional (dietaryStyle, foodsToAvoid, organicPreference, favoriteFoods, cuisinePreferences, additionalConsiderations, fridgePantryPhotos)
    return true
  }

  const handleNext = () => {
    if (isLastStep) {
      // Convert answers to UserPreferences format
      const preferences: UserPreferences = {
        // Calculate household size from servings per meal (simplified approach)
        adults: Math.ceil((answers.servingsPerMeal || 3) * 0.7), // Estimate adults as ~70% of servings
        kids: Math.floor((answers.servingsPerMeal || 3) * 0.3 / 0.5), // Estimate kids (count as 0.5 servings each)
        
        // Meals per week - use selected frequencies
        breakfastsPerWeek: answers.breakfastMeals || 0,
        lunchesPerWeek: answers.lunchMeals || 0,
        dinnersPerWeek: answers.dinnerMeals || 0,
        snacksPerWeek: 0, // Remove snacks as requested
        dessertsPerWeek: 0, // Remove desserts as requested
        
        // Dietary preferences - process dietary style properly
        dietaryStyle: (() => {
          const dietaryAnswers = answers.dietaryStyle || []
          if (Array.isArray(dietaryAnswers) && dietaryAnswers.length === 0) {
            return [] // "None" was selected
          }
          
          // Process pill selections - expand multi-value options
          const processed = dietaryAnswers.reduce((acc: string[], item: string) => {
            if (item === 'other') return acc
            
            // Find the option and expand if it's multi-value
            const option = dietaryStyleOptions.find(opt => opt.id === item)
            if (option && Array.isArray(option.value)) {
              return [...acc, ...option.value]
            }
            return [...acc, item]
          }, [])
          
          // Add other dietary style if specified
          if (answers.dietaryStyleOther) {
            processed.push(answers.dietaryStyleOther)
          }
          
          return processed
        })(),
        
        foodsToAvoid: answers.foodsToAvoid ? 
          (typeof answers.foodsToAvoid === 'string' ? 
            answers.foodsToAvoid.split(',').map((s: string) => s.trim()).filter(s => s.length > 0) : 
            []) : 
          [],
        
        // Process favorite foods - expand multi-value options
        favoriteFoods: (() => {
          const foodAnswers = answers.favoriteFoods || []
          return foodAnswers.reduce((acc: string[], item: string) => {
            // Find the option and expand if it's multi-value
            const option = favoriteFoodsOptions.find(opt => opt.id === item)
            if (option && Array.isArray(option.value)) {
              return [...acc, ...option.value]
            }
            // If it's not a preset option, it's a custom food
            return [...acc, item]
          }, [])
        })(),
        
        // Health and cooking preferences
        healthGoal: answers.healthGoal || 'maintain',
        maxCookingTime: answers.cookingTime || 30,
        cookingSkillLevel: answers.cookingSkill || 'intermediate',
        budgetSensitivity: answers.budgetSensitivity || 'no_limit',
        customBudgetAmount: answers.customBudgetAmount || '',
        organicPreference: answers.organicPreference || 'no_preference',
        
        // Process cuisine preferences - expand multi-value options
        cuisinePreferences: (() => {
          const cuisineAnswers = answers.cuisinePreferences || []
          const processed = cuisineAnswers.reduce((acc: string[], item: string) => {
            if (item === 'other') return acc
            
            // Find the option and expand if it's multi-value
            const option = cuisinePreferenceOptions.find(opt => opt.id === item)
            if (option && Array.isArray(option.value)) {
              return [...acc, ...option.value]
            }
            return [...acc, item]
          }, [])
          
          // Add other cuisine preference if specified
          if (answers.cuisinePreferencesOther) {
            processed.push(answers.cuisinePreferencesOther)
          }
          
          return processed
        })(),
        
        // Meal participation settings
        mealParticipation: answers.mealParticipation || 'yes',
        
        // Additional considerations
        additionalConsiderations: answers.additionalConsiderations || '',
        dietaryStyleOther: answers.dietaryStyleOther || '',
        cuisinePreferencesOther: answers.cuisinePreferencesOther || '',
        
        // Photo and ingredient identification
        fridgePantryPhotos: answers.fridgePantryPhotos || [],
        identifiedIngredients: identifiedIngredients,
        manuallyAddedIngredients: answers.manuallyAddedIngredients || [],
        skipPhotoUpload: answers.skipPhotoUpload || false,
        
        // Legacy fields for compatibility
        selectedMealTypes: [],
        diets: (() => {
          const dietaryAnswers = answers.dietaryStyle || []
          if (Array.isArray(dietaryAnswers) && dietaryAnswers.length === 0) {
            return [] // "None" was selected
          }
          
          // Process pill selections - expand multi-value options
          const processed = dietaryAnswers.reduce((acc: string[], item: string) => {
            if (item === 'other') return acc
            
            // Find the option and expand if it's multi-value
            const option = dietaryStyleOptions.find(opt => opt.id === item)
            if (option && Array.isArray(option.value)) {
              return [...acc, ...option.value]
            }
            return [...acc, item]
          }, [])
          
          // Add other dietary style if specified
          if (answers.dietaryStyleOther) {
            processed.push(answers.dietaryStyleOther)
          }
          
          return processed
        })(),
        allergies: answers.foodsToAvoid ? 
          (typeof answers.foodsToAvoid === 'string' ? 
            answers.foodsToAvoid.split(',').map((s: string) => s.trim()).filter(s => s.length > 0) : 
            []) : 
          [],
        maxCookTime: answers.cookingTime || 30,
        preferredCuisines: (() => {
          const cuisineAnswers = answers.cuisinePreferences || []
          const processed = cuisineAnswers.reduce((acc: string[], item: string) => {
            if (item === 'other') return acc
            
            // Find the option and expand if it's multi-value
            const option = cuisinePreferenceOptions.find(opt => opt.id === item)
            if (option && Array.isArray(option.value)) {
              return [...acc, ...option.value]
            }
            return [...acc, item]
          }, [])
          
          // Add other cuisine preference if specified
          if (answers.cuisinePreferencesOther) {
            processed.push(answers.cuisinePreferencesOther)
          }
          
          return processed
        })(),
        mealsPerWeek: (answers.breakfastMeals || 0) + (answers.lunchMeals || 5) + (answers.dinnerMeals || 5),
        peoplePerMeal: answers.servingsPerMeal || 3,
        mealTypes: [
          ...((answers.breakfastMeals || 0) > 0 ? [{
            type: 'breakfast' as const,
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].slice(0, answers.breakfastMeals || 0),
            adults: Math.ceil((answers.servingsPerMeal || 3) * 0.7),
            kids: Math.floor((answers.servingsPerMeal || 3) * 0.3 / 0.5)
          }] : []),
          ...((answers.lunchMeals || 5) > 0 ? [{
            type: 'lunch' as const,
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].slice(0, answers.lunchMeals || 5),
            adults: Math.ceil((answers.servingsPerMeal || 3) * 0.7),
            kids: Math.floor((answers.servingsPerMeal || 3) * 0.3 / 0.5)
          }] : []),
          ...((answers.dinnerMeals || 5) > 0 ? [{
            type: 'dinner' as const,
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].slice(0, answers.dinnerMeals || 5),
            adults: Math.ceil((answers.servingsPerMeal || 3) * 0.7),
            kids: Math.floor((answers.servingsPerMeal || 3) * 0.3 / 0.5)
          }] : [])
        ],
        
        // Photo and ingredient identification (legacy compatibility)
        pantryItems: [...identifiedIngredients, ...(answers.manuallyAddedIngredients || [])]
      }
      
      // Clear stored preferences since we're completing the flow
      clearStoredPreferences()
      
      onComplete(preferences)
    } else {
      setCompletedSteps(prev => new Set(prev).add(currentStep))
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    // Reset photo upload state if going back from confirmation
    if (currentStepData?.id === 'fridgePantryPhotos' && showIngredientConfirmation) {
      setShowIngredientConfirmation(false)
      return
    }
    
    if (currentStep === 0) {
      onBack()
    } else {
      setCurrentStep(prev => prev - 1)
    }
  }

  // Check if a specific step is valid (has required fields filled)
  const isStepComplete = (stepIndex: number) => {
    if (stepIndex >= onboardingSteps.length) return false
    
    const stepData = onboardingSteps[stepIndex]
    if (!stepData || !stepData.required) return true // Optional steps are always "complete"
    
    // Check validation for each required step
    if (stepData.id === 'planSelector') {
      return (answers.breakfastMeals || 0) > 0 || (answers.lunchMeals || 0) > 0 || (answers.dinnerMeals || 0) > 0
    }
    if (stepData.id === 'healthGoal') {
      return answers.healthGoal && answers.healthGoal.trim() !== ''
    }
    if (stepData.id === 'cookingTime') {
      return answers.cookingTime && answers.cookingTime > 0
    }
    if (stepData.id === 'cookingSkill') {
      return answers.cookingSkill && answers.cookingSkill.trim() !== ''
    }
    if (stepData.id === 'budgetSensitivity') {
      return answers.budgetSensitivity && answers.budgetSensitivity.trim() !== ''
    }
    if (stepData.id === 'organicPreference') {
      return answers.organicPreference && answers.organicPreference.trim() !== ''
    }
    
    return true // Default to true for unknown steps
  }

  const navigateToStep = (stepIndex: number) => {
    const isEditMode = Boolean(initialPreferences)
    
    if (isEditMode) {
      // In edit mode: allow navigation to any completed step
      const canGoToStep = completedSteps.has(stepIndex) || stepIndex === currentStep
      if (canGoToStep) {
        setCurrentStep(stepIndex)
        setShowChecklist(false)
      }
    } else {
      // Initial onboarding: sequential navigation only
      // Can only navigate to:
      // 1. Completed steps (marked as completed)
      // 2. Current step  
      // 3. Next step IF current step is complete
      const canGoToStep = completedSteps.has(stepIndex) || 
                         stepIndex === currentStep || 
                         (stepIndex === currentStep + 1 && isStepComplete(currentStep))
      
      if (canGoToStep) {
        setCurrentStep(stepIndex)
        setShowChecklist(false)
      }
    }
  }

  // Function to trigger analysis with debouncing
  const triggerPhotoAnalysis = useCallback((photos: File[]) => {
    // Clear existing timer
    if (analysisTimer) {
      clearTimeout(analysisTimer)
    }
    
    // Set waiting state
    setIsWaitingForAnalysis(photos.length > 0)
    
    // Set new timer for debounced analysis (3 seconds after last upload)
    const timer = setTimeout(() => {
      if (photos.length > 0) {
        console.log(`🔍 Starting debounced ingredient analysis for ${photos.length} photos`)
        setIsWaitingForAnalysis(false)
        setIsAnalyzingPhotos(true)
        identifyIngredientsFromPhotos(photos).then(ingredients => {
          console.log(`✅ Ingredient analysis complete: ${ingredients.length} items identified`)
          setIdentifiedIngredients(ingredients)
          setIsAnalyzingPhotos(false)
        }).catch(error => {
          console.error('❌ Error analyzing photos:', error)
          setIsAnalyzingPhotos(false)
          setIsWaitingForAnalysis(false)
          // Show user-friendly error message
          alert('Unable to analyze photos. Please try again or add items manually.')
        })
      } else {
        setIsWaitingForAnalysis(false)
      }
    }, 3000) // 3 second delay
    
    setAnalysisTimer(timer)
  }, [analysisTimer])

  // Real ingredient identification function using GPT-4 Vision
  const identifyIngredientsFromPhotos = useCallback(async (photos: File[]): Promise<Array<{ name: string; quantity: number; unit: string }>> => {
    try {
      console.log(`📤 Sending ${photos.length} photos to API for analysis`)
      photos.forEach((photo, index) => {
        console.log(`  Photo ${index + 1}: ${photo.name} (${photo.type || 'no-type'}, ${(photo.size / 1024 / 1024).toFixed(1)}MB)`)
      })
      
      const formData = new FormData()
      photos.forEach((photo, index) => {
        formData.append('photos', photo)
      })

      console.log('🌐 Making API request to /api/identify-pantry-items')
      const response = await fetch('/api/identify-pantry-items', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ API response not ok: ${response.status} - ${errorText}`)
        throw new Error(`Failed to analyze photos: ${response.status} - ${errorText}`)
      }

      console.log('📥 Received API response, parsing JSON...')
      const data = await response.json()
      console.log('🔍 API response data:', data)
      
      if (data.fallback) {
        console.warn('AI analysis fallback:', data.message)
        // Show user a message that they'll need to add items manually
      }
      
      if (data.message && data.message.includes('No supported image formats')) {
        console.warn('Image format issue:', data.message)
      }
      
      // Handle both old format (string array) and new format (object array)
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        if (typeof data.items[0] === 'string') {
          // Convert old format to new format
          return data.items.map((item: string) => ({
            name: item,
            quantity: 1,
            unit: 'item'
          }))
        }
        // Already in new format
        return data.items
      }
      
      return []
    } catch (error) {
      console.error('Error identifying ingredients:', error)
      // Fallback to empty array if API fails
      return []
    }
  }, [])

  // File upload handlers
  const handleFileSelect = useCallback((files: FileList | null) => {
    console.log('📁 handleFileSelect called with:', files ? files.length : 0, 'files')
    if (!files) return
    
    const validFiles = Array.from(files).filter(file => {
      // Detailed logging for debugging
      console.log(`🔍 Processing file: ${file.name}`)
      console.log(`  - Size: ${file.size} bytes (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
      console.log(`  - Type: "${file.type}" (${file.type ? 'has type' : 'NO TYPE SET'})`)
      console.log(`  - Last modified: ${new Date(file.lastModified).toISOString()}`)
      
      // Check file extension first (more reliable for HEIC/HEIF)
      const fileName = file.name.toLowerCase()
      const isHeicFile = fileName.endsWith('.heic') || fileName.endsWith('.heif')
      const isStandardImageFile = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || 
                                 fileName.endsWith('.png') || fileName.endsWith('.webp') ||
                                 fileName.endsWith('.gif') || fileName.endsWith('.bmp')
      
      console.log(`  - File extension check: HEIC=${isHeicFile}, StandardImage=${isStandardImageFile}`)
      
      // Check MIME type (may be empty/incorrect for HEIC on some browsers)
      const hasImageMimeType = file.type.startsWith('image/') ||
                              file.type === 'image/heic' || 
                              file.type === 'image/heif' ||
                              file.type === '' // Some browsers don't set MIME type for HEIC
      
      console.log(`  - MIME type check: hasImageMimeType=${hasImageMimeType}`)
      
      const isValidType = isHeicFile || isStandardImageFile || hasImageMimeType
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB limit
      
      console.log(`  - Validation: type=${isValidType}, size=${isValidSize} (limit: 10MB)`)
      
      if (isHeicFile) {
        console.log(`📱 HEIC/HEIF file detected: ${file.name}`)
        console.log(`  - Browser MIME type: "${file.type}" (may be empty on some browsers)`)
        console.log(`  - File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      }
      
      const isValid = isValidType && isValidSize
      console.log(`✅ File ${file.name}: ${isValid ? 'VALID' : 'REJECTED'}`)
      
      return isValid
    })
    
    console.log(`✅ ${validFiles.length} valid files out of ${files.length} total`)
    
    // Show helpful message if some files were rejected
    if (validFiles.length < files.length) {
      const rejectedCount = files.length - validFiles.length
      const rejectedFiles = Array.from(files).filter(file => !validFiles.includes(file))
      const hasLargeFiles = rejectedFiles.some(file => file.size > 10 * 1024 * 1024)
      const hasUnsupportedFiles = rejectedFiles.some(file => {
        const fileName = file.name.toLowerCase()
        return !fileName.endsWith('.heic') && !fileName.endsWith('.heif') && 
               !fileName.endsWith('.jpg') && !fileName.endsWith('.jpeg') && 
               !fileName.endsWith('.png') && !fileName.endsWith('.webp') &&
               !file.type.startsWith('image/')
      })
      
      let message = `${rejectedCount} file(s) were skipped. `
      if (hasLargeFiles) message += 'Some files exceed 10MB. '
      if (hasUnsupportedFiles) message += 'Some files are not supported image formats. '
      message += 'Supported: JPG, PNG, HEIC/HEIF from iPhone.'
      
      console.warn(message)
      // You could show a toast notification here
    }
    
    if (validFiles.length === 0) return
    
    // Calculate the new photos array for analysis
    const currentPhotos = answers.fridgePantryPhotos || []
    const newPhotos = [...currentPhotos, ...validFiles].slice(0, 5)
    
    // Update state
    setAnswers(prev => {
      const currentPhotos = prev.fridgePantryPhotos || []
      const updatedPhotos = [...currentPhotos, ...validFiles].slice(0, 5) // Max 5 photos
      return { ...prev, fridgePantryPhotos: updatedPhotos }
    })
    
    // Trigger debounced analysis for all photos
    console.log(`📁 Added ${validFiles.length} photo(s), total: ${newPhotos.length}. Analysis will start in 3 seconds...`)
    triggerPhotoAnalysis(newPhotos)
  }, [triggerPhotoAnalysis, answers.fridgePantryPhotos])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const removePhoto = useCallback((index: number) => {
    let updatedPhotos: File[] = []
    setAnswers(prev => {
      const currentPhotos = prev.fridgePantryPhotos || []
      const newPhotos = currentPhotos.filter((_: File, i: number) => i !== index)
      updatedPhotos = newPhotos
      return { ...prev, fridgePantryPhotos: newPhotos }
    })
    
    // Re-identify ingredients
    if (updatedPhotos.length > 0) {
      setIsAnalyzingPhotos(true)
      identifyIngredientsFromPhotos(updatedPhotos).then(ingredients => {
        setIdentifiedIngredients(ingredients)
        setIsAnalyzingPhotos(false)
      }).catch(error => {
        console.error('Error analyzing photos:', error)
        setIsAnalyzingPhotos(false)
      })
    } else {
      setIdentifiedIngredients([])
    }
  }, [identifyIngredientsFromPhotos])

  const addManualIngredient = useCallback(() => {
    const ingredient = manualIngredientInput.trim()
    if (!ingredient) return
    
    const currentManual = answers.manuallyAddedIngredients || []
    const identifiedNames = identifiedIngredients.map(item => item.name)
    if (!currentManual.includes(ingredient) && !identifiedNames.includes(ingredient)) {
      setAnswers(prev => ({ 
        ...prev, 
        manuallyAddedIngredients: [ingredient, ...currentManual] // Add at beginning
      }))
    }
    setManualIngredientInput('')
  }, [manualIngredientInput, answers.manuallyAddedIngredients, identifiedIngredients])

  const removeIngredient = useCallback((ingredient: string, isManual: boolean = false) => {
    if (isManual) {
      const currentManual = answers.manuallyAddedIngredients || []
      setAnswers(prev => ({ 
        ...prev, 
        manuallyAddedIngredients: currentManual.filter((i: string) => i !== ingredient) 
      }))
    } else {
      setIdentifiedIngredients(prev => prev.filter(item => item.name !== ingredient))
    }
  }, [answers.manuallyAddedIngredients])

  const startEditingItem = useCallback((index: number, type: 'identified' | 'manual', currentValue: string) => {
    setEditingItem({ index, type })
    setEditingValue(currentValue)
  }, [])

  const saveEditedItem = useCallback(() => {
    if (!editingItem || !editingValue.trim()) {
      setEditingItem(null)
      setEditingValue('')
      return
    }

    const newValue = editingValue.trim()
    
    if (editingItem.type === 'identified') {
      setIdentifiedIngredients(prev => {
        const updated = [...prev]
        const currentItem = updated[editingItem.index]
        if (currentItem) {
          updated[editingItem.index] = { 
            name: newValue,
            quantity: currentItem.quantity,
            unit: currentItem.unit
          }
        }
        return updated
      })
    } else {
      setAnswers(prev => {
        const currentManual = prev.manuallyAddedIngredients || []
        const updated = [...currentManual]
        updated[editingItem.index] = newValue
        return { ...prev, manuallyAddedIngredients: updated }
      })
    }
    
    setEditingItem(null)
    setEditingValue('')
  }, [editingItem, editingValue])

  const handleSkipPhotoUpload = useCallback(() => {
    setAnswers(prev => ({ ...prev, skipPhotoUpload: true }))
    if (isLastStep) {
      // Create a mock event since handleNext expects one
      const mockEvent = { preventDefault: () => {} } as React.MouseEvent<HTMLButtonElement>
      handleNext()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }, [isLastStep, handleNext])

  const handleContinueWithPhotos = useCallback(() => {
    if ((answers.fridgePantryPhotos?.length || 0) > 0) {
      setShowIngredientConfirmation(true)
    } else {
      // No photos uploaded, continue normally
      if (isLastStep) {
        handleNext()
      } else {
        setCurrentStep(prev => prev + 1)
      }
    }
  }, [answers.fridgePantryPhotos, isLastStep, handleNext])

  return (
    <div className="min-h-screen bg-health-gradient">
      <Header />
      <div className="flex items-start justify-center p-4">
      {/* Checklist Sidebar */}
      {showChecklist && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setShowChecklist(false)}
        />
      )}
      
      <div className={`fixed left-0 top-16 h-full bg-white shadow-xl z-40 transition-transform duration-300 ${
        showChecklist ? 'translate-x-0' : '-translate-x-full'
      } lg:relative lg:top-0 lg:translate-x-0 lg:shadow-none lg:mr-4 w-80 lg:w-64 lg:z-auto`}>
        <div className="p-6 h-full overflow-y-auto pt-6 lg:pt-6">
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <h3 className="text-lg font-semibold">Progress Checklist</h3>
            <button
              onClick={() => setShowChecklist(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="hidden lg:block mb-6">
            <h3 className="text-lg font-semibold text-neutral-800">Progress</h3>
            
            {/* Progress bar moved to sidebar */}
            <div className="mt-4">
              <div className="relative">
                <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all duration-500 ease-out"
                    style={{ 
                      width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-neutral-500">
                    Step {currentStep + 1}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {Math.round(((currentStep + 1) / onboardingSteps.length) * 100)}% complete
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            {onboardingSteps.map((step, index) => {
              const isCompleted = completedSteps.has(index)
              const isCurrent = currentStep === index
              const isEditMode = Boolean(initialPreferences)
              
              const canNavigate = isEditMode 
                ? (isCompleted || index === currentStep) // Edit mode: navigate to completed steps + current
                : (isCompleted || index === currentStep || (index === currentStep + 1 && isStepComplete(currentStep))) // Initial: sequential
              
              return (
                <button
                  key={step.id}
                  onClick={() => canNavigate && navigateToStep(index)}
                  disabled={!canNavigate}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                    isCurrent 
                      ? 'bg-orange-100 border-2 border-orange-500' 
                      : canNavigate
                        ? 'hover:bg-gray-100 cursor-pointer'
                        : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      isCompleted 
                        ? 'bg-green-500 text-white' 
                        : isCurrent
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-300'
                    }`}>
                      {isCompleted ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <span className="text-xs font-bold">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        isCurrent ? 'text-orange-700' : 'text-gray-700'
                      }`}>
                        {step.title}
                        {step.required && <span className="text-red-500 ml-1">*</span>}
                      </p>
                      {step.required && (
                        <p className="text-xs text-gray-500 mt-0.5">Required</p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              Complete all required steps to generate your personalized meal plan.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft max-w-2xl w-full p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowChecklist(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="w-12 h-12 bg-gradient-to-br from-brand-600 to-brand-700 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
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


        {/* Question */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-neutral-800 mb-6">
            {currentStepData?.question}
          </h2>

          {/* Plan Selector Screen */}
          {currentStepData?.id === 'planSelector' && (
            <div className="space-y-6">
              <p className="text-sm text-neutral-600 mb-6">
                Don't worry, you'll be able to add snacks, drinks, and other groceries after choosing your meals.
              </p>
              
              {/* Servings per meal stepper */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-neutral-800 mb-4">Servings per meal</h3>
                <div className="flex items-center justify-center gap-6 p-6 border-2 border-neutral-200 rounded-lg">
                  <button
                    onClick={() => setAnswers(prev => ({ ...prev, servingsPerMeal: Math.max(1, (prev.servingsPerMeal || 3) - 1) }))}
                    className="w-12 h-12 rounded-full border-2 border-neutral-300 flex items-center justify-center text-xl font-bold hover:bg-neutral-50 transition-colors"
                    disabled={(answers.servingsPerMeal || 3) <= 1}
                  >
                    −
                  </button>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-brand-600 mb-1">{answers.servingsPerMeal || 3}</div>
                    <div className="text-sm text-neutral-600">servings</div>
                  </div>
                  <button
                    onClick={() => setAnswers(prev => ({ ...prev, servingsPerMeal: Math.min(8, (prev.servingsPerMeal || 3) + 1) }))}
                    className="w-12 h-12 rounded-full border-2 border-neutral-300 flex items-center justify-center text-xl font-bold hover:bg-neutral-50 transition-colors"
                    disabled={(answers.servingsPerMeal || 3) >= 8}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Meals this week sliders */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-neutral-800 mb-4">Meals this week</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border-2 border-neutral-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🥞</span>
                      <span className="font-medium">Breakfast</span>
                    </div>
                    <div className="flex items-center gap-4 flex-1 max-w-xs">
                      <input
                        type="range"
                        min="0"
                        max="7"
                        value={answers.breakfastMeals || 0}
                        onChange={(e) => setAnswers(prev => ({ ...prev, breakfastMeals: parseInt(e.target.value) || 0 }))}
                        className="flex-1 h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #10B981 0%, #10B981 ${((answers.breakfastMeals || 0) / 7) * 100}%, #E5E7EB ${((answers.breakfastMeals || 0) / 7) * 100}%, #E5E7EB 100%)`
                        }}
                      />
                      <span className="w-8 text-center font-medium text-lg">{answers.breakfastMeals || 0}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border-2 border-neutral-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🥗</span>
                      <span className="font-medium">Lunch</span>
                    </div>
                    <div className="flex items-center gap-4 flex-1 max-w-xs">
                      <input
                        type="range"
                        min="0"
                        max="7"
                        value={answers.lunchMeals || 5}
                        onChange={(e) => setAnswers(prev => ({ ...prev, lunchMeals: parseInt(e.target.value) || 0 }))}
                        className="flex-1 h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #10B981 0%, #10B981 ${((answers.lunchMeals || 5) / 7) * 100}%, #E5E7EB ${((answers.lunchMeals || 5) / 7) * 100}%, #E5E7EB 100%)`
                        }}
                      />
                      <span className="w-8 text-center font-medium text-lg">{answers.lunchMeals || 5}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border-2 border-neutral-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🍽️</span>
                      <span className="font-medium">Dinner</span>
                    </div>
                    <div className="flex items-center gap-4 flex-1 max-w-xs">
                      <input
                        type="range"
                        min="0"
                        max="7"
                        value={answers.dinnerMeals || 5}
                        onChange={(e) => setAnswers(prev => ({ ...prev, dinnerMeals: parseInt(e.target.value) || 0 }))}
                        className="flex-1 h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #10B981 0%, #10B981 ${((answers.dinnerMeals || 5) / 7) * 100}%, #E5E7EB ${((answers.dinnerMeals || 5) / 7) * 100}%, #E5E7EB 100%)`
                        }}
                      />
                      <span className="w-8 text-center font-medium text-lg">{answers.dinnerMeals || 5}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Dietary Style */}
          {currentStepData?.id === 'dietaryStyle' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {dietaryStyleOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handlePillToggle('dietaryStyle', option.value, dietaryStyleOptions)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border-2 text-sm transition-all duration-200 ${
                      isPillSelected('dietaryStyle', option, dietaryStyleOptions)
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-neutral-200 hover:border-brand-300 hover:bg-brand-25'
                    }`}
                  >
                    <span>{option.icon}</span>
                    <span className="font-medium">{option.label}</span>
                    {isPillSelected('dietaryStyle', option, dietaryStyleOptions) && (
                      <Check className="w-4 h-4 text-brand-600" />
                    )}
                  </button>
                ))}
              </div>
              {answers.dietaryStyle?.includes('other') && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={answers.dietaryStyleOther || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, dietaryStyleOther: e.target.value }))}
                    className="w-full p-3 border-2 border-neutral-200 rounded-lg focus:border-brand-500 focus:ring-0"
                    placeholder="Please specify your dietary style..."
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Foods to Avoid */}
          {currentStepData?.id === 'foodsToAvoid' && (
            <div>
              <textarea
                value={answers.foodsToAvoid || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, foodsToAvoid: e.target.value }))}
                className="w-full p-3 border-2 border-neutral-200 rounded-lg focus:border-brand-500 focus:ring-0"
                rows={4}
                placeholder="e.g. peanuts, shellfish, very spicy foods"
              />
            </div>
          )}

          {/* Step 4: Health Goal */}
          {currentStepData?.id === 'healthGoal' && (
            <div className="space-y-3">
              {healthGoalOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setAnswers(prev => ({ ...prev, healthGoal: option.value }))}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 flex items-center gap-3 ${
                    answers.healthGoal === option.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-neutral-200 hover:border-brand-300 hover:bg-brand-25'
                  }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="font-medium">{option.label}</span>
                  {answers.healthGoal === option.value && (
                    <Check className="w-5 h-5 text-brand-600 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Step 5: Cooking Time */}
          {currentStepData?.id === 'cookingTime' && (
            <div className="space-y-3">
              {cookingTimeOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setAnswers(prev => ({ ...prev, cookingTime: option.value }))}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all duration-200 flex items-center gap-3 ${
                    answers.cookingTime === option.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-neutral-200 hover:border-brand-300 hover:bg-brand-25'
                  }`}
                >
                  <span className="text-xl">{option.icon}</span>
                  <span className="font-medium">{option.label}</span>
                  {answers.cookingTime === option.value && (
                    <Check className="w-4 h-4 text-brand-600 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Step 6: Cooking Skill */}
          {currentStepData?.id === 'cookingSkill' && (
            <div className="space-y-3">
              {cookingSkillOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setAnswers(prev => ({ ...prev, cookingSkill: option.value }))}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all duration-200 flex items-center gap-3 ${
                    answers.cookingSkill === option.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-neutral-200 hover:border-brand-300 hover:bg-brand-25'
                  }`}
                >
                  <span className="text-xl">{option.icon}</span>
                  <span className="font-medium">{option.label}</span>
                  {answers.cookingSkill === option.value && (
                    <Check className="w-4 h-4 text-brand-600 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Step 7: Budget Sensitivity */}
          {currentStepData?.id === 'budgetSensitivity' && (
            <div className="space-y-3">
              {budgetOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setAnswers(prev => ({ ...prev, budgetSensitivity: option.value }))}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all duration-200 flex items-center gap-3 ${
                    answers.budgetSensitivity === option.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-neutral-200 hover:border-brand-300 hover:bg-brand-25'
                  }`}
                >
                  <span className="text-xl">{option.icon}</span>
                  <span className="font-medium">{option.label}</span>
                  {answers.budgetSensitivity === option.value && (
                    <Check className="w-4 h-4 text-brand-600 ml-auto" />
                  )}
                </button>
              ))}
              {answers.budgetSensitivity === 'custom' && (
                <div className="mt-3">
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

          {/* Step 8: Organic Preference */}
          {currentStepData?.id === 'organicPreference' && (
            <div className="space-y-3">
              <button
                onClick={() => setAnswers(prev => ({ ...prev, organicPreference: 'preferred' }))}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all duration-200 flex items-center gap-3 ${
                  answers.organicPreference === 'preferred'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-neutral-200 hover:border-brand-300 hover:bg-brand-25'
                }`}
              >
                <span className="text-xl">🌱</span>
                <span className="font-medium">Prefer organic when available</span>
                {answers.organicPreference === 'preferred' && (
                  <Check className="w-4 h-4 text-brand-600 ml-auto" />
                )}
              </button>
              <button
                onClick={() => setAnswers(prev => ({ ...prev, organicPreference: 'only_if_within_10_percent' }))}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all duration-200 flex items-center gap-3 ${
                  answers.organicPreference === 'only_if_within_10_percent'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-neutral-200 hover:border-brand-300 hover:bg-brand-25'
                }`}
              >
                <span className="text-xl">💰</span>
                <span className="font-medium">Only if within 10% of regular price</span>
                {answers.organicPreference === 'only_if_within_10_percent' && (
                  <Check className="w-4 h-4 text-brand-600 ml-auto" />
                )}
              </button>
              <button
                onClick={() => setAnswers(prev => ({ ...prev, organicPreference: 'no_preference' }))}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all duration-200 flex items-center gap-3 ${
                  answers.organicPreference === 'no_preference'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-neutral-200 hover:border-brand-300 hover:bg-brand-25'
                }`}
              >
                <span className="text-xl">🤷‍♂️</span>
                <span className="font-medium">No preference</span>
                {answers.organicPreference === 'no_preference' && (
                  <Check className="w-4 h-4 text-brand-600 ml-auto" />
                )}
              </button>
            </div>
          )}

          {/* Step 9: Favorite Foods */}
          {currentStepData?.id === 'favoriteFoods' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {favoriteFoodsOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handlePillToggle('favoriteFoods', option.value, favoriteFoodsOptions)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border-2 text-sm transition-all duration-200 ${
                      isPillSelected('favoriteFoods', option, favoriteFoodsOptions)
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-neutral-200 hover:border-brand-300 hover:bg-brand-25'
                    }`}
                  >
                    <span>{option.icon}</span>
                    <span className="font-medium">{option.label}</span>
                    {isPillSelected('favoriteFoods', option, favoriteFoodsOptions) && (
                      <Check className="w-4 h-4 text-brand-600" />
                    )}
                  </button>
                ))}
              </div>
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
              {answers.favoriteFoods?.filter((food: string) => !favoriteFoodsOptions.some(opt => opt.value.includes(food))).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {answers.favoriteFoods.filter((food: string) => !favoriteFoodsOptions.some(opt => opt.value.includes(food))).map((food: string, index: number) => (
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

          {/* Step 10: Cuisine Preferences */}
          {currentStepData?.id === 'cuisinePreferences' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {cuisinePreferenceOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handlePillToggle('cuisinePreferences', option.value, cuisinePreferenceOptions)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border-2 text-sm transition-all duration-200 ${
                      isPillSelected('cuisinePreferences', option, cuisinePreferenceOptions)
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-neutral-200 hover:border-brand-300 hover:bg-brand-25'
                    }`}
                  >
                    <span>{option.icon}</span>
                    <span className="font-medium">{option.label}</span>
                    {isPillSelected('cuisinePreferences', option, cuisinePreferenceOptions) && (
                      <Check className="w-4 h-4 text-brand-600" />
                    )}
                  </button>
                ))}
              </div>
              {answers.cuisinePreferences?.includes('other') && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={answers.cuisinePreferencesOther || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, cuisinePreferencesOther: e.target.value }))}
                    className="w-full p-3 border-2 border-neutral-200 rounded-lg focus:border-brand-500 focus:ring-0"
                    placeholder="Please specify your preferred cuisine..."
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 11: Additional Considerations */}
          {currentStepData?.id === 'additionalConsiderations' && (
            <div>
              <textarea
                value={answers.additionalConsiderations || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, additionalConsiderations: e.target.value }))}
                className="w-full p-3 border-2 border-neutral-200 rounded-lg focus:border-brand-500 focus:ring-0"
                rows={4}
                placeholder="Any other dietary considerations, family preferences, or cooking constraints we should know about?"
              />
            </div>
          )}

          {/* Step 12: Fridge/Pantry Photos */}
          {currentStepData?.id === 'fridgePantryPhotos' && (
            <div className="space-y-6">
              {!showIngredientConfirmation ? (
                <>
                  {/* Description */}
                  <p className="text-sm text-neutral-600 mb-6">
                    Our AI will identify existing items and suggest meals that make use of what you already have. This step is optional and can be skipped.
                  </p>

                  {/* File Upload Area */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                      isDragging
                        ? 'border-brand-500 bg-brand-25'
                        : 'border-neutral-300 hover:border-brand-400 hover:bg-brand-25'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.heic,.heif,image/heic,image/heif"
                      onChange={(e) => handleFileSelect(e.target.files)}
                      className="hidden"
                    />
                    
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center">
                        <Camera className="w-8 h-8 text-brand-600" />
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-800 mb-2">
                          Drag and drop photos here
                        </h3>
                        <p className="text-neutral-600 mb-2">
                          or <span className="text-brand-600 font-medium cursor-pointer">click to browse</span>
                        </p>
                        <p className="text-sm text-neutral-500">
                          Upload up to 5 photos (JPG, PNG, HEIC/HEIF from iPhone). Max 10MB each.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Photo Previews */}
                  {(answers.fridgePantryPhotos?.length || 0) > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-neutral-800">Uploaded Photos</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {answers.fridgePantryPhotos?.map((file: File, index: number) => (
                          <div key={index} className="relative group">
                            <div className="aspect-square bg-neutral-100 rounded-lg overflow-hidden">
                              {file && file instanceof File ? (
                                file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif') ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 p-4">
                                    <div className="text-3xl mb-2">📷</div>
                                    <div className="text-xs text-center">
                                      <div className="font-medium">HEIC Photo</div>
                                      <div className="text-green-600 mt-1">✓ AI Analysis Supported</div>
                                      <div className="text-neutral-400 mt-1">{(file.size / 1024 / 1024).toFixed(1)}MB</div>
                                    </div>
                                  </div>
                                ) : (
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={`Upload ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // Fallback for unsupported formats
                                      const target = e.target as HTMLImageElement
                                      target.style.display = 'none'
                                      target.parentElement!.innerHTML = `
                                        <div class="w-full h-full flex flex-col items-center justify-center text-neutral-600 p-4">
                                          <div class="text-3xl mb-2">🖼️</div>
                                          <div class="text-xs text-center">
                                            <div class="font-medium">Image File</div>
                                            <div class="text-neutral-400 mt-1">${(file.size / 1024 / 1024).toFixed(1)}MB</div>
                                          </div>
                                        </div>
                                      `
                                    }}
                                  />
                                )
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                  Invalid file
                                </div>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                removePhoto(index)
                              }}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleContinueWithPhotos}
                      disabled={(answers.fridgePantryPhotos?.length || 0) === 0 || isAnalyzingPhotos || isWaitingForAnalysis}
                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                        (answers.fridgePantryPhotos?.length || 0) > 0 && !isAnalyzingPhotos && !isWaitingForAnalysis
                          ? 'bg-brand-600 text-white hover:bg-brand-700'
                          : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                      }`}
                    >
                      {isAnalyzingPhotos ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Analyzing photos...
                        </>
                      ) : isWaitingForAnalysis ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Analysis starting in 3s...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Continue with {answers.fridgePantryPhotos?.length || 0} photo{(answers.fridgePantryPhotos?.length || 0) !== 1 ? 's' : ''}
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleSkipPhotoUpload}
                      className="flex-1 px-6 py-3 border-2 border-neutral-300 text-neutral-700 rounded-lg font-medium hover:border-neutral-400 hover:bg-neutral-50 transition-all"
                    >
                      Skip this step
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Ingredient Confirmation Screen */}
                  <div className="space-y-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-amber-800 text-sm font-medium flex items-start gap-2">
                        <span className="text-amber-600 mt-0.5">⚠️</span>
                        AI does its best to identify ingredients but can make mistakes. Please review and confirm the results.
                      </p>
                    </div>

                    {/* Pantry Items List */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-neutral-800">Your Pantry Items</h4>
                      </div>

                      {isAnalyzingPhotos ? (
                        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                          <span className="text-blue-800">Analyzing your photos...</span>
                        </div>
                      ) : (
                        <>
                          {/* Items List */}
                          {(identifiedIngredients.length > 0 || (answers.manuallyAddedIngredients?.length || 0) > 0) ? (
                            <div className="bg-white border border-neutral-200 rounded-lg">
                              {/* Header */}
                              <div className="grid grid-cols-[1fr,80px,40px] gap-4 p-3 bg-neutral-50 border-b border-neutral-200 text-sm font-medium text-neutral-700">
                                <div>Item Name</div>
                                <div className="text-center">Qty</div>
                                <div></div>
                              </div>
                              
                              {/* Scrollable Items List */}
                              <div className="max-h-60 overflow-y-auto">
                                {/* Manual ingredients (shown first) */}
                                {(answers.manuallyAddedIngredients || []).map((ingredient: string, index: number) => (
                                  <div key={`manual-${index}`} className="grid grid-cols-[1fr,80px,40px] gap-4 p-3 border-b border-neutral-100 items-center hover:bg-neutral-50 transition-colors">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full" title="Added manually"></div>
                                      {editingItem?.type === 'manual' && editingItem.index === index ? (
                                        <input
                                          type="text"
                                          value={editingValue}
                                          onChange={(e) => setEditingValue(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveEditedItem()
                                            if (e.key === 'Escape') {
                                              setEditingItem(null)
                                              setEditingValue('')
                                            }
                                          }}
                                          onBlur={saveEditedItem}
                                          className="flex-1 px-2 py-1 border border-brand-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
                                          autoFocus
                                        />
                                      ) : (
                                        <span 
                                          className="text-neutral-800 cursor-pointer hover:text-brand-600"
                                          onClick={() => startEditingItem(index, 'manual', ingredient)}
                                        >
                                          {ingredient}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-center">
                                      <input
                                        type="number"
                                        min="1"
                                        defaultValue="1"
                                        className="w-16 px-2 py-1 text-center border border-neutral-200 rounded text-sm focus:border-brand-500 focus:ring-0"
                                      />
                                    </div>
                                    <button
                                      onClick={() => removeIngredient(ingredient, true)}
                                      className="text-neutral-400 hover:text-red-500 transition-colors p-1"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                                
                                {/* Identified ingredients (shown after manual) */}
                                {identifiedIngredients.map((item, index) => (
                                  <div key={`identified-${index}`} className="grid grid-cols-[1fr,80px,40px] gap-4 p-3 border-b border-neutral-100 items-center hover:bg-neutral-50 transition-colors">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-green-500 rounded-full" title="From photo"></div>
                                      {editingItem?.type === 'identified' && editingItem.index === index ? (
                                        <input
                                          type="text"
                                          value={editingValue}
                                          onChange={(e) => setEditingValue(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveEditedItem()
                                            if (e.key === 'Escape') {
                                              setEditingItem(null)
                                              setEditingValue('')
                                            }
                                          }}
                                          onBlur={saveEditedItem}
                                          className="flex-1 px-2 py-1 border border-brand-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
                                          autoFocus
                                        />
                                      ) : (
                                        <span 
                                          className="text-neutral-800 cursor-pointer hover:text-brand-600"
                                          onClick={() => startEditingItem(index, 'identified', item.name)}
                                        >
                                          {item.name} 
                                          {item.unit !== 'item' && (
                                            <span className="text-neutral-500 text-xs ml-1">({item.unit})</span>
                                          )}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-center">
                                      <input
                                        type="number"
                                        min="1"
                                        defaultValue={item.quantity}
                                        className="w-16 px-2 py-1 text-center border border-neutral-200 rounded text-sm focus:border-brand-500 focus:ring-0"
                                      />
                                    </div>
                                    <button
                                      onClick={() => removeIngredient(item.name, false)}
                                      className="text-neutral-400 hover:text-red-500 transition-colors p-1"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-neutral-500 bg-neutral-50 rounded-lg border-2 border-dashed border-neutral-200">
                              <p className="text-sm">No items added yet.</p>
                              <p className="text-xs mt-1">Upload photos or add items manually below.</p>
                            </div>
                          )}

                          {/* Add Item Input */}
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={manualIngredientInput}
                                onChange={(e) => setManualIngredientInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    addManualIngredient()
                                  }
                                }}
                                className="flex-1 p-3 border-2 border-neutral-200 rounded-lg focus:border-brand-500 focus:ring-0"
                                placeholder="Type item name..."
                              />
                              <button
                                onClick={addManualIngredient}
                                className="px-4 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                Add
                              </button>
                            </div>
                            
                            {/* Paste List Option */}
                            <div className="text-center">
                              <button
                                onClick={() => setShowPasteModal(true)}
                                className="text-sm text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1"
                              >
                                <Plus className="w-4 h-4" />
                                Or paste a list of items
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Summary */}
                    <div className="bg-neutral-50 rounded-lg p-4">
                      <p className="text-sm text-neutral-700">
                        <span className="font-medium">
                          Total items: {identifiedIngredients.length + (answers.manuallyAddedIngredients?.length || 0)}
                        </span>
                        {(identifiedIngredients.length + (answers.manuallyAddedIngredients?.length || 0)) > 0 && (
                          <span className="block mt-1">
                            We'll suggest meals that incorporate these ingredients to minimize waste and save money.
                          </span>
                        )}
                      </p>
                    </div>
                    
                    {/* Paste Modal */}
                    {showPasteModal && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg max-w-md w-full p-6">
                          <h3 className="text-lg font-semibold text-neutral-800 mb-4">Paste Your Items</h3>
                          <p className="text-sm text-neutral-600 mb-4">Enter one item per line</p>
                          <textarea
                            value={pasteText}
                            onChange={(e) => setPasteText(e.target.value)}
                            className="w-full h-40 p-3 border-2 border-neutral-200 rounded-lg focus:border-brand-500 focus:ring-0 resize-none"
                            placeholder="Milk&#10;Eggs&#10;Bread&#10;Chicken breast&#10;..."
                            autoFocus
                          />
                          <div className="flex gap-3 mt-4">
                            <button
                              onClick={() => {
                                setShowPasteModal(false)
                                setPasteText('')
                              }}
                              className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                const items = pasteText.split('\n')
                                  .map(item => item.trim())
                                  .filter(item => item.length > 0)
                                
                                const currentManual = answers.manuallyAddedIngredients || []
                                const identifiedNames = identifiedIngredients.map(item => item.name)
                                const newItems = items.filter(item => 
                                  !currentManual.includes(item) && !identifiedNames.includes(item)
                                )
                                
                                if (newItems.length > 0) {
                                  setAnswers(prev => ({
                                    ...prev,
                                    manuallyAddedIngredients: [...newItems, ...currentManual]
                                  }))
                                }
                                
                                setShowPasteModal(false)
                                setPasteText('')
                              }}
                              className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                            >
                              Add Items
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            className="flex items-center gap-2 px-3 py-2 text-neutral-600 hover:text-neutral-800 hover:bg-gray-100 rounded-lg transition-colors text-left"
          >
            <ArrowLeft className="w-4 h-4" />
            {currentStep === 0 ? 'Back to homepage' : 
             (currentStepData?.id === 'fridgePantryPhotos' && showIngredientConfirmation) ? 'Back to photos' : 'Previous'}
          </button>

          {/* Hide default next button for photo upload step when in confirmation or when photos uploaded */}
          {!(currentStepData?.id === 'fridgePantryPhotos' && (!showIngredientConfirmation || (answers.fridgePantryPhotos?.length || 0) > 0)) && (
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
          )}
          
          {/* Special continue button for ingredient confirmation */}
          {currentStepData?.id === 'fridgePantryPhotos' && showIngredientConfirmation && (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-3 rounded-lg font-medium bg-brand-600 text-white hover:bg-brand-700 transition-all"
            >
              {isLastStep ? 'Create My Meal Plan' : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}