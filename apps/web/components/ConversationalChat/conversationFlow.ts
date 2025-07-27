import { ConversationStep, QuickReply } from '../../types'

// Quick reply configurations
export const mealTypeQuickReplies: QuickReply[] = [
  { id: 'breakfast', text: 'Breakfast', value: 'breakfast', icon: '🥞', allowMultiple: true },
  { id: 'lunch', text: 'Lunch', value: 'lunch', icon: '🥗', allowMultiple: true },
  { id: 'dinner', text: 'Dinner', value: 'dinner', icon: '🍽️', allowMultiple: true },
  { id: 'snacks', text: 'Snacks', value: 'snacks', icon: '🍿', allowMultiple: true }
]

export const dietaryRestrictionQuickReplies: QuickReply[] = [
  { id: 'none', text: 'No restrictions', value: [], icon: '✅' },
  { id: 'vegetarian', text: 'Vegetarian', value: ['vegetarian'], icon: '🥬' },
  { id: 'vegan', text: 'Vegan', value: ['vegan'], icon: '🌱' },
  { id: 'keto', text: 'Keto', value: ['keto'], icon: '🥑' },
  { id: 'gluten_free', text: 'Gluten-Free', value: ['gluten-free'], icon: '🌾' },
  { id: 'dairy_free', text: 'Dairy-Free', value: ['dairy-free'], icon: '🥛' }
]

export const cookingTimeQuickReplies: QuickReply[] = [
  { id: 'quick', text: '15 min or less', value: 15, icon: '⚡' },
  { id: 'moderate', text: '30 minutes', value: 30, icon: '⏰' },
  { id: 'relaxed', text: '45 minutes', value: 45, icon: '🧘' },
  { id: 'extended', text: '1 hour+', value: 60, icon: '👨‍🍳' }
]

export const cuisinePreferenceQuickReplies: QuickReply[] = [
  { id: 'italian', text: 'Italian', value: ['italian'], icon: '🇮🇹' },
  { id: 'mexican', text: 'Mexican', value: ['mexican'], icon: '🌮' },
  { id: 'asian', text: 'Asian', value: ['asian'], icon: '🥢' },
  { id: 'mediterranean', text: 'Mediterranean', value: ['mediterranean'], icon: '🫒' },
  { id: 'american', text: 'American', value: ['american'], icon: '🇺🇸' },
  { id: 'variety', text: 'Mix it up!', value: ['italian', 'mexican', 'asian', 'american'], icon: '🌍' }
]

// Conversation flow steps
export const conversationSteps: ConversationStep[] = [
  {
    id: 'meal_types',
    type: 'question',
    question: "What meals would you like me to plan for you?",
    preferenceKey: 'selectedMealTypes',
    quickReplies: mealTypeQuickReplies,
    required: true,
    validator: (value: any) => Array.isArray(value) && value.length > 0
  },
  {
    id: 'dietary_restrictions',
    type: 'question',
    question: "Do you have any dietary restrictions or preferences I should know about?",
    preferenceKey: 'diets',
    quickReplies: dietaryRestrictionQuickReplies,
    required: false,
    dependsOn: ['meal_types']
  },
  {
    id: 'cooking_time',
    type: 'question',
    question: "How much time do you typically like to spend cooking?",
    preferenceKey: 'maxCookTime',
    quickReplies: cookingTimeQuickReplies,
    required: true,
    dependsOn: ['meal_types'],
    validator: (value: any) => typeof value === 'number' && value > 0
  },
  {
    id: 'cuisine_preferences',
    type: 'question',
    question: "What flavors and cuisines do you enjoy most?",
    preferenceKey: 'preferredCuisines',
    quickReplies: cuisinePreferenceQuickReplies,
    required: false,
    dependsOn: ['cooking_time']
  },
  {
    id: 'meal_selection',
    type: 'question',
    question: "Based on your preferences, I've generated personalized meal options for you. Please select the meals you'd like to include in your plan.",
    preferenceKey: 'selectedRecipes',
    required: true,
    dependsOn: ['cuisine_preferences']
  },
  {
    id: 'final_confirmation',
    type: 'confirmation',
    question: "Perfect! Let me create your shopping cart with your selected meals.",
    preferenceKey: 'selectedMealTypes', // dummy key
    required: true,
    dependsOn: ['meal_selection']
  }
]

// Helper functions
export function getNextStep(currentStepId: string | null, completedSteps: Set<string>): ConversationStep | null {
  if (!currentStepId) {
    return conversationSteps[0] || null
  }

  const currentIndex = conversationSteps.findIndex(step => step.id === currentStepId)
  
  // Look for next step that hasn't been completed and has dependencies met
  for (let i = currentIndex + 1; i < conversationSteps.length; i++) {
    const step = conversationSteps[i]
    
    // Skip if step is undefined (shouldn't happen but TypeScript safety)
    if (!step) {
      continue
    }
    
    // Check if step is already completed
    if (completedSteps.has(step.id)) {
      continue
    }
    
    // Check if dependencies are met
    if (step.dependsOn) {
      const dependenciesMet = step.dependsOn.every(dep => completedSteps.has(dep))
      if (!dependenciesMet) {
        continue
      }
    }
    
    return step
  }
  
  return null
}

export function getStepById(stepId: string): ConversationStep | null {
  return conversationSteps.find(step => step.id === stepId) || null
}

export function isFlowComplete(completedSteps: Set<string>): boolean {
  const requiredSteps = conversationSteps.filter(step => step.required)
  return requiredSteps.every(step => completedSteps.has(step.id))
}

export function validateStepData(stepId: string, value: any): boolean {
  const step = getStepById(stepId)
  if (!step || !step.validator) {
    return true // No validation required
  }
  
  return step.validator(value)
}