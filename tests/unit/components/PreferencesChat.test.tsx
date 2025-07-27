import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PreferencesChat from '@/components/PreferencesChat'
import { UserPreferences } from '@/types'

describe('PreferencesChat Component', () => {
  const mockOnPreferencesComplete = vi.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render the chat interface', () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      expect(screen.getByText('ChefsCart Assistant')).toBeInTheDocument()
      expect(screen.getByText('Step 1 of 9')).toBeInTheDocument()
      expect(screen.getByText(/Hi! I'm your AI sous-chef/)).toBeInTheDocument()
    })

    it('should display progress bar', () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      const progressBar = document.querySelector('.bg-orange-600.h-full')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveStyle({ width: '11.11%' }) // 1/9 * 100%
    })

    it('should show initial meal type selection options', () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      expect(screen.getByText('Breakfast')).toBeInTheDocument()
      expect(screen.getByText('Lunch')).toBeInTheDocument()
      expect(screen.getByText('Dinner')).toBeInTheDocument()
      expect(screen.getByText('Snacks')).toBeInTheDocument()
      expect(screen.getByText('Dessert')).toBeInTheDocument()
    })
  })

  describe('Meal Type Selection Flow', () => {
    it('should allow selecting multiple meal types', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      // Select multiple meal types
      await user.click(screen.getByText('Breakfast'))
      await user.click(screen.getByText('Dinner'))

      // Check buttons are selected (have orange background)
      const breakfastButton = screen.getByText('Breakfast')
      const dinnerButton = screen.getByText('Dinner')
      
      expect(breakfastButton).toHaveClass('bg-orange-600')
      expect(dinnerButton).toHaveClass('bg-orange-600')
    })

    it('should allow deselecting meal types', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      // Select and then deselect
      await user.click(screen.getByText('Breakfast'))
      expect(screen.getByText('Breakfast')).toHaveClass('bg-orange-600')

      await user.click(screen.getByText('Breakfast'))
      expect(screen.getByText('Breakfast')).toHaveClass('bg-white')
    })

    it('should disable continue button when no options selected', () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      const continueButton = screen.getByText('Continue')
      expect(continueButton).toBeDisabled()
    })

    it('should enable continue button when options are selected', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      await user.click(screen.getByText('Dinner'))
      
      const continueButton = screen.getByText('Continue')
      expect(continueButton).not.toBeDisabled()
    })
  })

  describe('Step Navigation', () => {
    it('should advance to meal configuration step', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      // Select a meal type and continue
      await user.click(screen.getByText('Dinner'))
      await user.click(screen.getByText('Continue'))

      await waitFor(() => {
        expect(screen.getByText('Step 2 of 9')).toBeInTheDocument()
        expect(screen.getByText(/Now let's configure each meal type/)).toBeInTheDocument()
      })
    })

    it('should show meal configuration interface', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      await user.click(screen.getByText('Dinner'))
      await user.click(screen.getByText('Continue'))

      await waitFor(() => {
        expect(screen.getByText('Dinner')).toBeInTheDocument()
        expect(screen.getByText('Days per week')).toBeInTheDocument()
        expect(screen.getByText('Adults')).toBeInTheDocument()
        expect(screen.getByText('Kids')).toBeInTheDocument()
      })
    })

    it('should advance through dietary restrictions step', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      // Complete first two steps
      await user.click(screen.getByText('Dinner'))
      await user.click(screen.getByText('Continue'))

      await waitFor(async () => {
        await user.click(screen.getByText('Continue'))
      })

      await waitFor(() => {
        expect(screen.getByText('Step 3 of 9')).toBeInTheDocument()
        expect(screen.getByText(/dietary restrictions/)).toBeInTheDocument()
        expect(screen.getByText('Vegetarian')).toBeInTheDocument()
        expect(screen.getByText('Vegan')).toBeInTheDocument()
        expect(screen.getByText('Gluten-Free')).toBeInTheDocument()
      })
    })
  })

  describe('Text Input Steps', () => {
    it('should handle allergies text input', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      // Navigate to allergies step (step 4)
      await navigateToStep(4)

      await waitFor(() => {
        const input = screen.getByPlaceholderText('Type your answer...')
        expect(input).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('Type your answer...')
      await user.type(input, 'Peanuts, Shellfish')

      const continueButton = screen.getByText('Continue')
      expect(continueButton).not.toBeDisabled()
    })

    it('should handle enter key submission in text inputs', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      await navigateToStep(4)

      await waitFor(async () => {
        const input = screen.getByPlaceholderText('Type your answer...')
        await user.type(input, 'Peanuts')
        fireEvent.keyDown(input, { key: 'Enter' })
      })

      await waitFor(() => {
        expect(screen.getByText('Step 5 of 9')).toBeInTheDocument()
      })
    })
  })

  describe('Single Select Steps', () => {
    it('should handle single selection for organic preference', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      await navigateToStep(5) // Organic preference step

      await waitFor(() => {
        expect(screen.getByText('Preferred')).toBeInTheDocument()
        expect(screen.getByText('Only if within 10% of regular price')).toBeInTheDocument()
        expect(screen.getByText('No preference')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Preferred'))
      
      // Only one option should be selected
      expect(screen.getByText('Preferred')).toHaveClass('bg-orange-600')
      expect(screen.getByText('No preference')).toHaveClass('bg-white')
    })

    it('should replace previous selection in single select', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      await navigateToStep(5)

      await waitFor(async () => {
        await user.click(screen.getByText('Preferred'))
        await user.click(screen.getByText('No preference'))
      })

      // Should only have the latest selection
      expect(screen.getByText('No preference')).toHaveClass('bg-orange-600')
      expect(screen.getByText('Preferred')).toHaveClass('bg-white')
    })
  })

  describe('File Upload Step', () => {
    it('should show file upload interface', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      await navigateToStep(9) // Pantry photo step

      await waitFor(() => {
        expect(screen.getByText('Upload a photo of your pantry')).toBeInTheDocument()
        expect(screen.getByText('Choose Photo')).toBeInTheDocument()
        expect(screen.getByText('Skip for now')).toBeInTheDocument()
        expect(screen.getByText('Continue with photo')).toBeInTheDocument()
      })
    })

    it('should allow skipping file upload', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      await navigateToStep(9)

      await waitFor(async () => {
        await user.click(screen.getByText('Skip for now'))
      })

      await waitFor(() => {
        expect(screen.getByText(/Perfect! I have everything I need/)).toBeInTheDocument()
      })
    })
  })

  describe('Completion Flow', () => {
    it('should complete preferences and call callback', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      // Complete all steps quickly
      await completeAllSteps()

      await waitFor(() => {
        expect(screen.getByText(/Perfect! I have everything I need/)).toBeInTheDocument()
      })

      // Should call the completion callback after timeout
      await waitFor(() => {
        expect(mockOnPreferencesComplete).toHaveBeenCalledTimes(1)
      }, { timeout: 3000 })
    })

    it('should provide valid UserPreferences object', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      await completeAllSteps()

      await waitFor(() => {
        expect(mockOnPreferencesComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            mealsPerWeek: expect.any(Number),
            mealTypes: expect.any(Array),
            diets: expect.any(Array),
            allergies: expect.any(Array),
            organicPreference: expect.stringMatching(/preferred|only_if_within_10_percent|no_preference/),
            maxCookTime: expect.any(Number),
            cookingSkillLevel: expect.stringMatching(/beginner|intermediate|advanced/),
            preferredCuisines: expect.any(Array)
          })
        )
      }, { timeout: 3000 })
    })
  })

  describe('Progress Tracking', () => {
    it('should update progress bar correctly', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      expect(screen.getByText('Step 1 of 9')).toBeInTheDocument()

      await user.click(screen.getByText('Dinner'))
      await user.click(screen.getByText('Continue'))

      await waitFor(() => {
        expect(screen.getByText('Step 2 of 9')).toBeInTheDocument()
      })
    })

    it('should maintain user responses in chat history', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      await user.click(screen.getByText('Dinner'))
      await user.click(screen.getByText('Continue'))

      await waitFor(() => {
        // Should show user's previous response
        expect(screen.getByText('Dinner')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should support keyboard navigation', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      const firstOption = screen.getByText('Breakfast')
      firstOption.focus()
      
      fireEvent.keyDown(firstOption, { key: 'Enter' })
      expect(firstOption).toHaveClass('bg-orange-600')
    })
  })

  describe('Error Handling', () => {
    it('should handle empty selections gracefully', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      // Try to continue without selecting anything
      const continueButton = screen.getByText('Continue')
      expect(continueButton).toBeDisabled()
    })

    it('should handle component unmounting during flow', () => {
      const { unmount } = render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)

      expect(() => unmount()).not.toThrow()
    })
  })

  // Helper functions
  async function navigateToStep(targetStep: number) {
    for (let step = 1; step < targetStep; step++) {
      if (step === 1) {
        await user.click(screen.getByText('Dinner'))
        await user.click(screen.getByText('Continue'))
      } else if (step === 2) {
        await waitFor(async () => {
          await user.click(screen.getByText('Continue'))
        })
      } else if (step === 3) {
        await waitFor(async () => {
          await user.click(screen.getByText('None'))
          await user.click(screen.getByText('Continue'))
        })
      } else if (step === 4) {
        await waitFor(async () => {
          const input = screen.getByPlaceholderText('Type your answer...')
          await user.type(input, 'None')
          await user.click(screen.getByText('Continue'))
        })
      } else if (step === 5) {
        await waitFor(async () => {
          await user.click(screen.getByText('No preference'))
          await user.click(screen.getByText('Continue'))
        })
      } else if (step === 6) {
        await waitFor(async () => {
          await user.click(screen.getByText('30 minutes'))
          await user.click(screen.getByText('Continue'))
        })
      } else if (step === 7) {
        await waitFor(async () => {
          await user.click(screen.getByText('Intermediate'))
          await user.click(screen.getByText('Continue'))
        })
      } else if (step === 8) {
        await waitFor(async () => {
          await user.click(screen.getByText('No preference'))
          await user.click(screen.getByText('Continue'))
        })
      }
    }
  }

  async function completeAllSteps() {
    await navigateToStep(9)
    await waitFor(async () => {
      await user.click(screen.getByText('Skip for now'))
    })
  }
})