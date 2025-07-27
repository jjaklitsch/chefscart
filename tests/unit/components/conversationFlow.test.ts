import { describe, it, expect } from 'vitest'
import {
  getNextStep,
  getStepById,
  isFlowComplete,
  validateStepData,
  conversationSteps,
  mealTypeQuickReplies,
  dietaryRestrictionQuickReplies,
  cookingTimeQuickReplies,
  cuisinePreferenceQuickReplies
} from '../../../apps/web/components/ConversationalChat/conversationFlow'

describe('Conversation Flow Utilities', () => {
  describe('getStepById', () => {
    it('returns the correct step for valid id', () => {
      const step = getStepById('meal_types')
      expect(step).toBeDefined()
      expect(step?.id).toBe('meal_types')
      expect(step?.preferenceKey).toBe('selectedMealTypes')
    })

    it('returns null for invalid id', () => {
      const step = getStepById('invalid_step')
      expect(step).toBeNull()
    })
  })

  describe('getNextStep', () => {
    it('returns first step when currentStepId is null', () => {
      const nextStep = getNextStep(null, new Set())
      expect(nextStep).toBeDefined()
      expect(nextStep?.id).toBe('meal_types')
    })

    it('returns next step in sequence', () => {
      const completedSteps = new Set(['meal_types'])
      const nextStep = getNextStep('meal_types', completedSteps)
      expect(nextStep).toBeDefined()
      expect(nextStep?.id).toBe('dietary_restrictions')
    })

    it('skips completed steps', () => {
      const completedSteps = new Set(['meal_types', 'dietary_restrictions'])
      const nextStep = getNextStep('meal_types', completedSteps)
      expect(nextStep).toBeDefined()
      expect(nextStep?.id).toBe('cooking_time')
    })

    it('returns null when no more steps available', () => {
      const completedSteps = new Set(['meal_types', 'dietary_restrictions', 'cooking_time', 'cuisine_preferences', 'final_confirmation'])
      const nextStep = getNextStep('final_confirmation', completedSteps)
      expect(nextStep).toBeNull()
    })

    it('respects step dependencies', () => {
      const completedSteps = new Set(['meal_types']) // dietary_restrictions not completed
      const nextStep = getNextStep('meal_types', completedSteps)
      
      // Should return dietary_restrictions since it depends on meal_types
      expect(nextStep?.id).toBe('dietary_restrictions')
    })
  })

  describe('isFlowComplete', () => {
    it('returns false when required steps are not completed', () => {
      const completedSteps = new Set(['meal_types'])
      expect(isFlowComplete(completedSteps)).toBe(false)
    })

    it('returns true when all required steps are completed', () => {
      const requiredSteps = conversationSteps.filter(step => step.required).map(step => step.id)
      const completedSteps = new Set(requiredSteps)
      expect(isFlowComplete(completedSteps)).toBe(true)
    })

    it('returns true even if optional steps are not completed', () => {
      const requiredSteps = conversationSteps.filter(step => step.required).map(step => step.id)
      const completedSteps = new Set(requiredSteps)
      expect(isFlowComplete(completedSteps)).toBe(true)
    })
  })

  describe('validateStepData', () => {
    it('returns true for step without validator', () => {
      const isValid = validateStepData('dietary_restrictions', ['vegetarian'])
      expect(isValid).toBe(true)
    })

    it('validates meal_types step correctly', () => {
      expect(validateStepData('meal_types', ['dinner'])).toBe(true)
      expect(validateStepData('meal_types', [])).toBe(false)
      expect(validateStepData('meal_types', null)).toBe(false)
    })

    it('validates cooking_time step correctly', () => {
      expect(validateStepData('cooking_time', 30)).toBe(true)
      expect(validateStepData('cooking_time', 0)).toBe(false)
      expect(validateStepData('cooking_time', -1)).toBe(false)
      expect(validateStepData('cooking_time', 'invalid')).toBe(false)
    })

    it('returns true for non-existent step', () => {
      const isValid = validateStepData('non_existent', 'any_value')
      expect(isValid).toBe(true)
    })
  })

  describe('Quick Reply Configurations', () => {
    it('has meal type quick replies with correct structure', () => {
      expect(mealTypeQuickReplies).toHaveLength(6)
      expect(mealTypeQuickReplies[0]).toMatchObject({
        id: 'dinner',
        text: 'Dinner',
        value: ['dinner'],
        icon: '🍽️'
      })
    })

    it('has dietary restriction quick replies', () => {
      expect(dietaryRestrictionQuickReplies).toHaveLength(6)
      expect(dietaryRestrictionQuickReplies[0]).toMatchObject({
        id: 'none',
        text: 'No restrictions',
        value: [],
        icon: '✅'
      })
    })

    it('has cooking time quick replies', () => {
      expect(cookingTimeQuickReplies).toHaveLength(4)
      expect(cookingTimeQuickReplies[0]).toMatchObject({
        id: 'quick',
        text: '15 min or less',
        value: 15,
        icon: '⚡'
      })
    })

    it('has cuisine preference quick replies', () => {
      expect(cuisinePreferenceQuickReplies).toHaveLength(6)
      expect(cuisinePreferenceQuickReplies[0]).toMatchObject({
        id: 'italian',
        text: 'Italian',
        value: ['italian'],
        icon: '🇮🇹'
      })
    })
  })

  describe('Conversation Steps Configuration', () => {
    it('has all required steps defined', () => {
      const stepIds = conversationSteps.map(step => step.id)
      expect(stepIds).toContain('meal_types')
      expect(stepIds).toContain('dietary_restrictions')
      expect(stepIds).toContain('cooking_time')
      expect(stepIds).toContain('cuisine_preferences')
      expect(stepIds).toContain('final_confirmation')
    })

    it('has correct dependencies defined', () => {
      const dietaryStep = getStepById('dietary_restrictions')
      expect(dietaryStep?.dependsOn).toContain('meal_types')
      
      const cookingStep = getStepById('cooking_time')
      expect(cookingStep?.dependsOn).toContain('meal_types')
      
      const cuisineStep = getStepById('cuisine_preferences')
      expect(cuisineStep?.dependsOn).toContain('cooking_time')
    })

    it('has required fields properly set', () => {
      const mealTypesStep = getStepById('meal_types')
      expect(mealTypesStep?.required).toBe(true)
      
      const cookingTimeStep = getStepById('cooking_time')
      expect(cookingTimeStep?.required).toBe(true)
      
      const dietaryStep = getStepById('dietary_restrictions')
      expect(dietaryStep?.required).toBe(false)
    })
  })
})