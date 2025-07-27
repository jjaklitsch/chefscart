import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock window and localStorage
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = newStore
    }
  }
}

// Extract localStorage utilities to test them in isolation
const STORAGE_KEY = 'chefscart_conversation_state'
const CURRENT_SCHEMA_VERSION = 1

// Mock conversation steps for validation
const mockConversationSteps = [
  { key: 'mealTypes' },
  { key: 'mealConfiguration' },
  { key: 'diets' },
  { key: 'allergies' },
  { key: 'organicPreference' },
  { key: 'maxCookTime' },
  { key: 'cookingSkillLevel' },
  { key: 'preferredCuisines' }
]

const validateConversationState = (state: any): boolean => {
  if (!state || typeof state !== 'object') return false
  
  // Check required fields exist and have correct types
  if (typeof state.step !== 'number' || state.step < 0) return false
  if (!state.preferences || typeof state.preferences !== 'object') return false
  if (!Array.isArray(state.selectedReplies)) return false
  if (!state.mealConfiguration || typeof state.mealConfiguration !== 'object') return false
  if (typeof state.awaitingResponse !== 'boolean') return false
  
  // Validate mealConfiguration structure
  for (const [key, config] of Object.entries(state.mealConfiguration)) {
    if (!config || typeof config !== 'object') return false
    const mealConfig = config as any
    if (typeof mealConfig.days !== 'number' || mealConfig.days < 1 || mealConfig.days > 7) return false
    if (typeof mealConfig.adults !== 'number' || mealConfig.adults < 1) return false
    if (typeof mealConfig.kids !== 'number' || mealConfig.kids < 0) return false
  }
  
  // Check step is within valid range
  if (state.step >= mockConversationSteps.length) return false
  
  return true
}

describe('localStorage State Management', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>
  let saveToLocalStorage: (state: any) => void
  let loadFromLocalStorage: () => any
  let clearLocalStorage: () => void

  beforeEach(() => {
    localStorageMock = createLocalStorageMock()
    Object.defineProperty(global, 'window', {
      value: { localStorage: localStorageMock },
      writable: true
    })

    // Create localStorage utility functions
    saveToLocalStorage = (state: any): void => {
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
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.removeItem(STORAGE_KEY)
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
              ...state,
              version: CURRENT_SCHEMA_VERSION,
              timestamp: Date.now()
            }))
          }
        } catch (retryError) {
          console.warn('Failed to save conversation state after retry:', retryError)
        }
      }
    }

    loadFromLocalStorage = (): any => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const stored = localStorage.getItem(STORAGE_KEY)
          if (!stored) return null
          
          const parsed = JSON.parse(stored)
          
          if (parsed.version && parsed.version !== CURRENT_SCHEMA_VERSION) {
            console.info('Conversation state version mismatch, starting fresh')
            clearLocalStorage()
            return null
          }
          
          if (!validateConversationState(parsed)) {
            console.warn('Invalid conversation state found, starting fresh')
            clearLocalStorage()
            return null
          }
          
          return parsed
        }
      } catch (error) {
        console.warn('Failed to load conversation state:', error)
        clearLocalStorage()
      }
      return null
    }

    clearLocalStorage = (): void => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch (error) {
        console.warn('Failed to clear conversation state:', error)
      }
    }
  })

  describe('Data Validation', () => {
    it('should validate valid conversation state', () => {
      const validState = {
        step: 2,
        preferences: {
          selectedMealTypes: ['breakfast', 'dinner']
        },
        selectedReplies: ['vegetarian'],
        mealConfiguration: {
          breakfast: { days: 5, adults: 2, kids: 0 },
          dinner: { days: 7, adults: 3, kids: 1 }
        },
        awaitingResponse: false
      }

      expect(validateConversationState(validState)).toBe(true)
    })

    it('should reject state with invalid step', () => {
      const invalidState = {
        step: -1, // Invalid negative step
        preferences: {},
        selectedReplies: [],
        mealConfiguration: {},
        awaitingResponse: false
      }

      expect(validateConversationState(invalidState)).toBe(false)
    })

    it('should reject state with invalid meal configuration', () => {
      const invalidState = {
        step: 1,
        preferences: {},
        selectedReplies: [],
        mealConfiguration: {
          breakfast: { days: 8, adults: 2, kids: 0 } // Invalid days > 7
        },
        awaitingResponse: false
      }

      expect(validateConversationState(invalidState)).toBe(false)
    })

    it('should reject state with missing required fields', () => {
      const invalidState = {
        step: 1,
        // Missing preferences, selectedReplies, mealConfiguration, awaitingResponse
      }

      expect(validateConversationState(invalidState)).toBe(false)
    })

    it('should reject state with step beyond conversation length', () => {
      const invalidState = {
        step: 999, // Beyond mockConversationSteps.length
        preferences: {},
        selectedReplies: [],
        mealConfiguration: {},
        awaitingResponse: false
      }

      expect(validateConversationState(invalidState)).toBe(false)
    })
  })

  describe('Save and Load Operations', () => {
    it('should save and load valid state correctly', () => {
      const state = {
        step: 3,
        preferences: {
          selectedMealTypes: ['lunch', 'dinner'],
          diets: ['vegetarian', 'gluten-free']
        },
        selectedReplies: ['keto'],
        mealConfiguration: {
          lunch: { days: 5, adults: 1, kids: 0 },
          dinner: { days: 6, adults: 2, kids: 1 }
        },
        awaitingResponse: false
      }

      saveToLocalStorage(state)
      const loaded = loadFromLocalStorage()

      expect(loaded).toMatchObject(state)
      expect(loaded.version).toBe(CURRENT_SCHEMA_VERSION)
      expect(loaded.timestamp).toBeTypeOf('number')
    })

    it('should handle corrupted JSON gracefully', () => {
      // Manually set corrupted data
      localStorageMock.setItem(STORAGE_KEY, '{"step": invalid json}')

      const loaded = loadFromLocalStorage()
      expect(loaded).toBe(null)
      
      // Should clear corrupted data
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY)
    })

    it('should handle version mismatch gracefully', () => {
      const stateWithOldVersion = {
        step: 2,
        preferences: {},
        selectedReplies: [],
        mealConfiguration: {},
        awaitingResponse: false,
        version: 999 // Future version
      }

      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(stateWithOldVersion))

      const loaded = loadFromLocalStorage()
      expect(loaded).toBe(null)
      
      // Should clear incompatible version
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY)
    })

    it('should handle invalid state schema gracefully', () => {
      const invalidState = {
        step: 'invalid', // Wrong type
        preferences: null,
        selectedReplies: 'not-array',
        mealConfiguration: {},
        awaitingResponse: 'not-boolean'
      }

      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(invalidState))

      const loaded = loadFromLocalStorage()
      expect(loaded).toBe(null)
      
      // Should clear invalid data
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY)
    })

    it('should handle quota exceeded error with retry', () => {
      const state = {
        step: 1,
        preferences: {},
        selectedReplies: [],
        mealConfiguration: {},
        awaitingResponse: false
      }

      // Mock first call to throw quota exceeded, second to succeed
      localStorageMock.setItem
        .mockImplementationOnce(() => {
          throw new Error('QuotaExceededError')
        })
        .mockImplementationOnce((key: string, value: string) => {
          // Should succeed on retry
        })

      saveToLocalStorage(state)

      // Should attempt retry after clearing
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY)
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2)
    })

    it('should return null when localStorage is not available', () => {
      // Mock window.localStorage as undefined
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true
      })

      const loaded = loadFromLocalStorage()
      expect(loaded).toBe(null)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty localStorage', () => {
      localStorageMock.clear()
      const loaded = loadFromLocalStorage()
      expect(loaded).toBe(null)
    })

    it('should handle null values in localStorage', () => {
      localStorageMock.setItem(STORAGE_KEY, 'null')
      const loaded = loadFromLocalStorage()
      expect(loaded).toBe(null)
    })

    it('should validate meal configuration with edge values', () => {
      const edgeCaseState = {
        step: 1,
        preferences: {},
        selectedReplies: [],
        mealConfiguration: {
          breakfast: { days: 1, adults: 1, kids: 0 }, // Minimum values
          dinner: { days: 7, adults: 6, kids: 6 } // Maximum reasonable values
        },
        awaitingResponse: false
      }

      expect(validateConversationState(edgeCaseState)).toBe(true)
    })

    it('should reject meal configuration with zero adults', () => {
      const invalidState = {
        step: 1,
        preferences: {},
        selectedReplies: [],
        mealConfiguration: {
          breakfast: { days: 5, adults: 0, kids: 2 } // Zero adults invalid
        },
        awaitingResponse: false
      }

      expect(validateConversationState(invalidState)).toBe(false)
    })

    it('should reject meal configuration with negative kids', () => {
      const invalidState = {
        step: 1,
        preferences: {},
        selectedReplies: [],
        mealConfiguration: {
          dinner: { days: 5, adults: 2, kids: -1 } // Negative kids invalid
        },
        awaitingResponse: false
      }

      expect(validateConversationState(invalidState)).toBe(false)
    })
  })
})