import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ConversationalChat from '../../../apps/web/components/ConversationalChat/ConversationalChat'

// Mock localStorage with more comprehensive functionality
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
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = newStore
    }
  }
}

const localStorageMock = createLocalStorageMock()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('ConversationalChat - localStorage State Reconstruction', () => {
  const mockOnPreferencesComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  describe('Complete State Restoration', () => {
    it('should restore complete conversation state after refresh at step 3', async () => {
      // Simulate saved state at step 3 (dietary restrictions)
      const savedState = {
        step: 2,
        preferences: {
          selectedMealTypes: ['breakfast', 'dinner'],
          mealTypes: [{
            type: 'breakfast',
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            adults: 2,
            kids: 0
          }, {
            type: 'dinner', 
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            adults: 2,
            kids: 0
          }]
        },
        selectedReplies: ['vegetarian', 'gluten-free'],
        mealConfiguration: {
          breakfast: { days: 5, adults: 2, kids: 0 },
          dinner: { days: 5, adults: 2, kids: 0 }
        },
        awaitingResponse: false
      }

      localStorageMock.setItem('chefscart_conversation_state', JSON.stringify(savedState))

      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)

      // Should restore to step 3 (dietary restrictions)
      await waitFor(() => {
        expect(screen.getByText(/dietary preferences or restrictions/i)).toBeInTheDocument()
      })

      // Should show progress as step 3 of 8
      expect(screen.getByText('Step 3 of 8')).toBeInTheDocument()

      // Should show previous messages in conversation history
      expect(screen.getByText(/what types of meals/i)).toBeInTheDocument()
      expect(screen.getByText(/configure each meal type/i)).toBeInTheDocument()

      // Should show quick replies with restored selection state
      const vegetarianButton = screen.getByText('Vegetarian')
      const glutenFreeButton = screen.getByText('Gluten-Free')
      
      expect(vegetarianButton).toHaveClass('selected') // assuming selection styling
      expect(glutenFreeButton).toHaveClass('selected')
    })

    it('should restore meal configuration state accurately', async () => {
      const savedState = {
        step: 1,
        preferences: {
          selectedMealTypes: ['breakfast', 'lunch', 'dinner']
        },
        selectedReplies: [],
        mealConfiguration: {
          breakfast: { days: 7, adults: 1, kids: 2 },
          lunch: { days: 5, adults: 3, kids: 1 },
          dinner: { days: 6, adults: 2, kids: 0 }
        },
        awaitingResponse: false
      }

      localStorageMock.setItem('chefscart_conversation_state', JSON.stringify(savedState))

      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)

      // Should be on meal configuration step
      await waitFor(() => {
        expect(screen.getByText(/configure each meal type/i)).toBeInTheDocument()
      })

      // Verify breakfast configuration is restored
      const breakfastSection = screen.getByText('Breakfast').closest('.card-primary')
      const breakfastDaysSelect = breakfastSection?.querySelector('select[value="7"]')
      expect(breakfastDaysSelect).toBeInTheDocument()

      // Verify lunch configuration is restored  
      const lunchSection = screen.getByText('Lunch').closest('.card-primary')
      const lunchAdultsSelect = lunchSection?.querySelectorAll('select')[1] as HTMLSelectElement
      expect(lunchAdultsSelect.value).toBe('3')

      // Verify dinner configuration is restored
      const dinnerSection = screen.getByText('Dinner').closest('.card-primary')
      const dinnerKidsSelect = dinnerSection?.querySelectorAll('select')[2] as HTMLSelectElement
      expect(dinnerKidsSelect.value).toBe('0')
    })
  })

  describe('Message History Reconstruction', () => {
    it('should rebuild conversation history with correct user responses', async () => {
      const savedState = {
        step: 3,
        preferences: {
          selectedMealTypes: ['dinner'],
          mealTypes: [{ type: 'dinner', days: ['monday', 'tuesday', 'wednesday'], adults: 2, kids: 1 }],
          allergies: ['peanuts', 'shellfish']
        },
        selectedReplies: [],
        mealConfiguration: {
          dinner: { days: 3, adults: 2, kids: 1 }
        },
        awaitingResponse: false
      }

      localStorageMock.setItem('chefscart_conversation_state', JSON.stringify(savedState))

      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)

      await waitFor(() => {
        expect(screen.getByText(/organic ingredients/i)).toBeInTheDocument()
      })

      // Should show user's meal type response
      expect(screen.getByText('dinner')).toBeInTheDocument()

      // Should show user's meal configuration response
      expect(screen.getByText(/dinner: 3 days\/week for 2 adults \+ 1 kids/)).toBeInTheDocument()

      // Should show user's allergies response
      expect(screen.getByText('peanuts, shellfish')).toBeInTheDocument()
    })

    it('should show assistant messages for completed steps', async () => {
      const savedState = {
        step: 2,
        preferences: {
          selectedMealTypes: ['breakfast'],
          mealTypes: [{ type: 'breakfast', days: ['monday'], adults: 1, kids: 0 }]
        },
        selectedReplies: ['vegetarian'],
        mealConfiguration: {
          breakfast: { days: 1, adults: 1, kids: 0 }
        },
        awaitingResponse: false
      }

      localStorageMock.setItem('chefscart_conversation_state', JSON.stringify(savedState))

      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)

      await waitFor(() => {
        expect(screen.getByText(/dietary preferences or restrictions/i)).toBeInTheDocument()
      })

      // Should show all previous assistant messages
      expect(screen.getByText(/what types of meals/i)).toBeInTheDocument()
      expect(screen.getByText(/configure each meal type/i)).toBeInTheDocument()
      expect(screen.getByText(/dietary preferences or restrictions/i)).toBeInTheDocument()
    })
  })

  describe('Quick Reply State Synchronization', () => {
    it('should restore multi-select quick reply selections correctly', async () => {
      const savedState = {
        step: 7,
        preferences: {
          selectedMealTypes: ['dinner'],
          preferredCuisines: ['italian', 'mexican', 'asian']
        },
        selectedReplies: ['italian', 'mexican', 'asian'],
        mealConfiguration: {
          dinner: { days: 5, adults: 2, kids: 0 }
        },
        awaitingResponse: false
      }

      localStorageMock.setItem('chefscart_conversation_state', JSON.stringify(savedState))

      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)

      await waitFor(() => {
        expect(screen.getByText(/what cuisines do you enjoy/i)).toBeInTheDocument()
      })

      // All three cuisine selections should be marked as selected
      const italianButton = screen.getByText('Italian')
      const mexicanButton = screen.getByText('Mexican') 
      const asianButton = screen.getByText('Asian')

      expect(italianButton).toHaveAttribute('aria-pressed', 'true')
      expect(mexicanButton).toHaveAttribute('aria-pressed', 'true')
      expect(asianButton).toHaveAttribute('aria-pressed', 'true')

      // Non-selected options should not be selected
      const americanButton = screen.getByText('American')
      expect(americanButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('should restore single-select quick reply selection correctly', async () => {
      const savedState = {
        step: 4,
        preferences: {
          selectedMealTypes: ['dinner'],
          organicPreference: 'preferred'
        },
        selectedReplies: ['preferred'],
        mealConfiguration: {
          dinner: { days: 5, adults: 2, kids: 0 }
        },
        awaitingResponse: false
      }

      localStorageMock.setItem('chefscart_conversation_state', JSON.stringify(savedState))

      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)

      await waitFor(() => {
        expect(screen.getByText(/organic ingredients/i)).toBeInTheDocument()
      })

      const organicButton = screen.getByText('I prefer organic')
      expect(organicButton).toHaveAttribute('aria-pressed', 'true')
      
      const budgetButton = screen.getByText('Only if within 10% of regular price')
      expect(budgetButton).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('Error Handling and Data Validation', () => {
    it('should handle corrupted localStorage data gracefully', async () => {
      // Set corrupted JSON data
      localStorageMock.setItem('chefscart_conversation_state', '{"step": "invalid", preferences:}')

      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)

      // Should fall back to starting fresh conversation
      await waitFor(() => {
        expect(screen.getByText(/Hi! I'm your AI sous-chef/i)).toBeInTheDocument()
        expect(screen.getByText('Step 1 of 8')).toBeInTheDocument()
      })
    })

    it('should validate localStorage data schema and handle mismatches', async () => {
      // Set data with missing required fields
      const invalidState = {
        step: 2,
        // missing preferences, selectedReplies, mealConfiguration
        awaitingResponse: false
      }

      localStorageMock.setItem('chefscart_conversation_state', JSON.stringify(invalidState))

      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)

      // Should fall back to fresh conversation due to invalid schema
      await waitFor(() => {
        expect(screen.getByText(/Hi! I'm your AI sous-chef/i)).toBeInTheDocument()
        expect(screen.getByText('Step 1 of 8')).toBeInTheDocument()
      })
    })

    it('should handle localStorage quota exceeded gracefully', async () => {
      // Mock localStorage.setItem to throw quota exceeded error
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })

      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)

      // Should start normally despite storage error
      await waitFor(() => {
        expect(screen.getByText(/Hi! I'm your AI sous-chef/i)).toBeInTheDocument()
      })

      // Interaction should still work despite storage errors
      fireEvent.click(screen.getByText('Breakfast'))
      expect(screen.getByText('Breakfast')).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('Performance Optimization', () => {
    it('should not block UI during state reconstruction', async () => {
      const largeState = {
        step: 7,
        preferences: {
          selectedMealTypes: Array.from({ length: 100 }, (_, i) => `meal-${i}`),
          preferredCuisines: Array.from({ length: 50 }, (_, i) => `cuisine-${i}`)
        },
        selectedReplies: Array.from({ length: 50 }, (_, i) => `reply-${i}`),
        mealConfiguration: Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [`meal-${i}`, { days: 7, adults: 4, kids: 2 }])
        ),
        awaitingResponse: false
      }

      localStorageMock.setItem('chefscart_conversation_state', JSON.stringify(largeState))

      const startTime = performance.now()
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      // Component should render quickly even with large state
      await waitFor(() => {
        expect(screen.getByText(/cuisines do you enjoy/i)).toBeInTheDocument()
      }, { timeout: 1000 })

      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(500) // Should take less than 500ms
    })
  })

  describe('State Consistency', () => {
    it('should maintain consistency between conversation state and UI state', async () => {
      const savedState = {
        step: 2,
        preferences: {
          selectedMealTypes: ['breakfast', 'dinner']
        },
        selectedReplies: ['vegetarian', 'keto'],
        mealConfiguration: {
          breakfast: { days: 7, adults: 1, kids: 0 },
          dinner: { days: 5, adults: 2, kids: 1 }
        },
        awaitingResponse: false
      }

      localStorageMock.setItem('chefscart_conversation_state', JSON.stringify(savedState))

      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)

      await waitFor(() => {
        expect(screen.getByText(/dietary preferences or restrictions/i)).toBeInTheDocument()
      })

      // UI selections should match saved state
      const vegetarianButton = screen.getByText('Vegetarian')
      const ketoButton = screen.getByText('Keto')
      
      expect(vegetarianButton).toHaveAttribute('aria-pressed', 'true')
      expect(ketoButton).toHaveAttribute('aria-pressed', 'true')

      // Unselected options should not be selected
      const veganButton = screen.getByText('Vegan')
      expect(veganButton).toHaveAttribute('aria-pressed', 'false')
    })
  })
})