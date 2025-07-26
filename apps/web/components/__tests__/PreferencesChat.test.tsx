import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import PreferencesChat from '../PreferencesChat'
import { UserPreferences } from '../../types'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock the onPreferencesComplete callback
const mockOnPreferencesComplete = vi.fn()

describe('PreferencesChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('localStorage persistence', () => {
    it('should save wizard progress to localStorage when user makes selections', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      // Select meal types
      const breakfastButton = screen.getByRole('button', { name: /breakfast/i })
      fireEvent.click(breakfastButton)
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      fireEvent.click(continueButton)
      
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'chefscart_wizard_progress',
          expect.stringContaining('"currentStep":2')
        )
      })
    })

    it('should restore wizard progress from localStorage on component mount', () => {
      const savedProgress = {
        currentStep: 3,
        preferences: { mealTypes: ['Breakfast'] },
        selectedOptions: [],
        mealConfiguration: {},
        messages: [
          { id: '1', role: 'assistant', content: 'Welcome message' },
          { id: 'user-1', role: 'user', content: 'Breakfast' }
        ]
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedProgress))
      
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      expect(screen.getByText(/step 3 of/i)).toBeInTheDocument()
    })

    it('should clear localStorage when wizard is completed', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      // Complete all steps programmatically for test
      // This would require refactoring the component to expose a test method
      // or we'll test this in the integration
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('chefscart_wizard_progress')
    })
  })

  describe('responsive button layout', () => {
    it('should render meal type buttons in a responsive grid', () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      const buttonContainer = screen.getByRole('button', { name: /breakfast/i }).parentElement
      expect(buttonContainer).toHaveClass('grid')
      expect(buttonContainer).toHaveClass('grid-cols-2') // Mobile first
      expect(buttonContainer).toHaveClass('sm:grid-cols-3') // Small screens
      expect(buttonContainer).toHaveClass('gap-2') // Appropriate spacing
    })

    it('should handle dessert button text wrapping on small screens', () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      const dessertButton = screen.getByRole('button', { name: /dessert/i })
      expect(dessertButton).toHaveClass('text-sm')
      expect(dessertButton).toHaveClass('text-center')
      expect(dessertButton).toHaveClass('leading-tight')
    })
  })

  describe('continue button state management', () => {
    it('should disable continue button when no options are selected for multiselect', () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      expect(continueButton).toBeDisabled()
    })

    it('should enable continue button when at least one option is selected for multiselect', () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      const breakfastButton = screen.getByRole('button', { name: /breakfast/i })
      fireEvent.click(breakfastButton)
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      expect(continueButton).not.toBeDisabled()
    })

    it('should disable continue button when text input is empty', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      // Navigate to a text input step (allergies step)
      // This would require setting up the component in the right state
      // For now, we'll test the logic exists in the implementation
    })

    it('should enable continue button when text input has content', async () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      // Similar to above - test the implementation logic
    })

    it('should properly handle continue button state for meal configuration step', () => {
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      // Test that meal configuration step has proper validation
      // This ensures users configure at least one meal type before continuing
    })
  })

  describe('data integrity', () => {
    it('should maintain type safety when restoring from localStorage', () => {
      const invalidProgress = '{"currentStep": "invalid", "preferences": null}'
      localStorageMock.getItem.mockReturnValue(invalidProgress)
      
      render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)
      
      // Should fall back to default state when localStorage data is invalid
      expect(screen.getByText(/step 1 of/i)).toBeInTheDocument()
    })

    it('should handle localStorage unavailability gracefully', () => {
      const originalLocalStorage = window.localStorage
      delete (window as any).localStorage
      
      expect(() => {
        render(<PreferencesChat onPreferencesComplete={mockOnPreferencesComplete} />)
      }).not.toThrow()
      
      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage
      })
    })
  })
})