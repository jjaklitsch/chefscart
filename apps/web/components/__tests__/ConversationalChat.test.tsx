import React from 'react'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ConversationalChat } from '../ConversationalChat'
import { UserPreferences } from '../../types'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  configurable: true
})

// Mock the onPreferencesComplete callback
const mockOnPreferencesComplete = vi.fn()

// Mock timers for testing animations and delays
vi.useFakeTimers()

describe('ConversationalChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.clearAllTimers()
  })

  describe('Initial render and welcome message', () => {
    it('should render welcome message with green theme', () => {
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      expect(screen.getByText(/Hi! I'm your AI sous-chef/)).toBeInTheDocument()
      expect(screen.getByText(/Step 1 of/)).toBeInTheDocument()
      
      // Check for green theme elements
      expect(screen.getByRole('button', { name: /breakfast/i })).toBeInTheDocument()
      expect(document.querySelector('.bg-health-gradient')).toBeInTheDocument()
    })

    it('should display quick reply options for meal types', () => {
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      expect(screen.getByRole('button', { name: /breakfast/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /lunch/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /dinner/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /snacks/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /dessert/i })).toBeInTheDocument()
    })

    it('should show progress bar with green gradient', () => {
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      const progressBar = document.querySelector('.bg-gradient-to-r')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveClass('from-brand-600', 'to-fresh-500')
    })
  })

  describe('Message interaction and flow', () => {
    it('should allow selecting multiple meal types', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      const breakfastButton = screen.getByRole('button', { name: /breakfast/i })
      const dinnerButton = screen.getByRole('button', { name: /dinner/i })
      
      await user.click(breakfastButton)
      await user.click(dinnerButton)
      
      // Check that both buttons are selected (would have visual selection state)
      expect(breakfastButton).toHaveAttribute('aria-pressed', 'true')
      expect(dinnerButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should show continue button when meal types are selected', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      const breakfastButton = screen.getByRole('button', { name: /breakfast/i })
      await user.click(breakfastButton)
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      expect(continueButton).toBeInTheDocument()
      expect(continueButton).not.toBeDisabled()
    })

    it('should progress to next step when continue is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      // Select breakfast
      const breakfastButton = screen.getByRole('button', { name: /breakfast/i })
      await user.click(breakfastButton)
      
      // Click continue
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      // Fast-forward through animations
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      
      // Should show next step (meal configuration)
      await waitFor(() => {
        expect(screen.getByText(/Step 2 of/)).toBeInTheDocument()
      })
    })

    it('should show typing indicator during transitions', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      const breakfastButton = screen.getByRole('button', { name: /breakfast/i })
      await user.click(breakfastButton)
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      // Should show typing indicator
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByLabelText(/AI is typing/)).toBeInTheDocument()
    })
  })

  describe('Text input handling', () => {
    it('should handle text input for allergies step', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      // Mock localStorage to start at allergies step
      const savedState = {
        step: 3, // allergies step
        preferences: { mealTypes: ['breakfast'], diets: ['none'] },
        selectedReplies: [],
        mealConfiguration: { breakfast: { days: 5, adults: 2, kids: 0 } },
        awaitingResponse: false
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState))
      
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      // Should show text input for allergies
      const textInput = screen.getByPlaceholderText(/type your answer/i)
      expect(textInput).toBeInTheDocument()
      
      await user.type(textInput, 'peanuts, shellfish')
      await user.keyboard('{Enter}')
      
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      
      // Should progress to next step
      await waitFor(() => {
        expect(screen.getByText(/Step 5 of/)).toBeInTheDocument()
      })
    })

    it('should auto-expand textarea with content', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      const savedState = {
        step: 3,
        preferences: {},
        selectedReplies: [],
        mealConfiguration: {},
        awaitingResponse: false
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState))
      
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      const textInput = screen.getByPlaceholderText(/type your answer/i) as HTMLTextAreaElement
      
      await user.type(textInput, 'This is a very long allergy description that should cause the textarea to expand automatically when it gets longer than a single line')
      
      // Check that the textarea has expanded (height should be more than initial)
      expect(textInput.style.height).not.toBe('44px')
    })
  })

  describe('Accessibility compliance', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      // Check for proper roles and labels
      expect(screen.getByRole('log')).toBeInTheDocument()
      expect(screen.getByLabelText(/conversation messages/i)).toBeInTheDocument()
      expect(screen.getByRole('region', { name: /quick reply options/i })).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      const breakfastButton = screen.getByRole('button', { name: /breakfast/i })
      
      // Focus the button and activate with keyboard
      breakfastButton.focus()
      await user.keyboard('{Enter}')
      
      expect(breakfastButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should have minimum 44px touch targets for mobile', () => {
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button)
        const minHeight = parseInt(styles.minHeight)
        expect(minHeight).toBeGreaterThanOrEqual(44)
      })
    })

    it('should support screen readers with live regions', () => {
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      const liveRegion = screen.getByRole('log')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Mobile responsiveness', () => {
    it('should render properly on mobile viewports', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })
      
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      // Check mobile-specific classes
      expect(document.querySelector('.max-w-\\[80\\%\\]')).toBeInTheDocument()
      expect(document.querySelector('.sm\\:max-w-\\[70\\%\\]')).toBeInTheDocument()
    })

    it('should handle safe area for modern devices', () => {
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      // Check for proper padding and safe area handling
      const header = document.querySelector('.px-4.py-4')
      expect(header).toBeInTheDocument()
    })
  })

  describe('LocalStorage persistence', () => {
    it('should save conversation state to localStorage', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      const breakfastButton = screen.getByRole('button', { name: /breakfast/i })
      await user.click(breakfastButton)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'chefscart_conversation_state',
        expect.stringContaining('breakfast')
      )
    })

    it('should restore conversation state from localStorage', () => {
      const savedState = {
        step: 2,
        preferences: { mealTypes: ['breakfast', 'dinner'] },
        selectedReplies: [],
        mealConfiguration: {},
        awaitingResponse: false
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState))
      
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      expect(screen.getByText(/Step 3 of/)).toBeInTheDocument()
    })

    it('should clear localStorage when conversation completes', async () => {
      // Mock a completed conversation state
      const completedState = {
        step: 7, // Last step
        preferences: {
          mealTypes: ['dinner'],
          diets: ['none'],
          allergies: ['none'],
          organicPreference: 'no_preference',
          maxCookTime: 30,
          cookingSkillLevel: 'intermediate',
          preferredCuisines: ['italian']
        },
        selectedReplies: ['italian'],
        mealConfiguration: { dinner: { days: 5, adults: 2, kids: 0 } },
        awaitingResponse: false
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(completedState))
      
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      act(() => {
        vi.advanceTimersByTime(3000)
      })
      
      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('chefscart_conversation_state')
      })
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')
      
      expect(() => {
        render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      }).not.toThrow()
      
      // Should start fresh conversation
      expect(screen.getByText(/Step 1 of/)).toBeInTheDocument()
    })

    it('should handle localStorage unavailability', () => {
      const originalLocalStorage = window.localStorage
      delete (window as any).localStorage
      
      expect(() => {
        render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      }).not.toThrow()
      
      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        configurable: true
      })
    })

    it('should reset conversation when reset button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      // Progress through some steps first
      const breakfastButton = screen.getByRole('button', { name: /breakfast/i })
      await user.click(breakfastButton)
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      
      // Click reset button
      const resetButton = screen.getByLabelText(/reset conversation/i)
      await user.click(resetButton)
      
      // Should return to step 1
      expect(screen.getByText(/Step 1 of/)).toBeInTheDocument()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('chefscart_conversation_state')
    })
  })

  describe('Conversation completion', () => {
    it('should call onPreferencesComplete with correct data structure', async () => {
      // Mock a nearly complete state
      const nearCompleteState = {
        step: 7, // Last step
        preferences: {
          mealTypes: [{ type: 'dinner', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], adults: 2, kids: 0 }],
          diets: ['none'],
          allergies: ['none'],
          organicPreference: 'no_preference',
          maxCookTime: 30,
          cookingSkillLevel: 'intermediate',
          mealsPerWeek: 5
        },
        selectedReplies: ['italian'],
        mealConfiguration: { dinner: { days: 5, adults: 2, kids: 0 } },
        awaitingResponse: false
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(nearCompleteState))
      
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      // Complete the last step
      const italianButton = screen.getByRole('button', { name: /italian/i })
      await user.click(italianButton)
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      act(() => {
        vi.advanceTimersByTime(4000)
      })
      
      await waitFor(() => {
        expect(mockOnPreferencesComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            mealsPerWeek: expect.any(Number),
            peoplePerMeal: expect.any(Number),
            mealTypes: expect.any(Array),
            diets: expect.any(Array),
            allergies: expect.any(Array),
            avoidIngredients: expect.any(Array),
            organicPreference: expect.any(String),
            maxCookTime: expect.any(Number),
            cookingSkillLevel: expect.any(String),
            preferredCuisines: expect.any(Array),
            preferredRetailers: expect.any(Array)
          })
        )
      })
    })

    it('should show completion message before calling callback', async () => {
      const nearCompleteState = {
        step: 7,
        preferences: {
          mealTypes: [{ type: 'dinner', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], adults: 2, kids: 0 }],
          diets: ['none'],
          allergies: ['none'],
          organicPreference: 'no_preference',
          maxCookTime: 30,
          cookingSkillLevel: 'intermediate',
          mealsPerWeek: 5
        },
        selectedReplies: ['italian'],
        mealConfiguration: { dinner: { days: 5, adults: 2, kids: 0 } },
        awaitingResponse: false
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(nearCompleteState))
      
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      const italianButton = screen.getByRole('button', { name: /italian/i })
      await user.click(italianButton)
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      
      await waitFor(() => {
        expect(screen.getByText(/Perfect! I have everything I need/)).toBeInTheDocument()
      })
    })
  })
})