import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import ConversationalChat from '../../../apps/web/components/ConversationalChat/ConversationalChat'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('ConversationalChat', () => {
  const mockOnPreferencesComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('should show meal configuration for selected meal types only', async () => {
    render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)

    // Wait for initial welcome message
    await waitFor(() => {
      expect(screen.getByText(/Hi! I'm your AI sous-chef/)).toBeInTheDocument()
    }, { timeout: 5000 })

    // Select breakfast and dinner meal types
    const breakfastButton = screen.getByText('Breakfast')
    const dinnerButton = screen.getByText('Dinner')
    
    fireEvent.click(breakfastButton)
    fireEvent.click(dinnerButton)

    // Click continue to move to meal configuration step
    const continueButton = screen.getByText('Continue')
    fireEvent.click(continueButton)

    // Wait for meal configuration step with specific timeout
    await waitFor(() => {
      expect(screen.getByText(/configure each meal type/i)).toBeInTheDocument()
    }, { timeout: 5000 })

    // Verify that ONLY breakfast and dinner configuration options are shown
    expect(screen.getByText('Breakfast')).toBeInTheDocument()
    expect(screen.getByText('Dinner')).toBeInTheDocument()
    
    // Verify each meal type has the configuration controls
    expect(screen.getAllByLabelText('Days per week')).toHaveLength(2)
    expect(screen.getAllByLabelText('Adults')).toHaveLength(2)
    expect(screen.getAllByLabelText('Kids')).toHaveLength(2)
  })

  it('should preserve meal configuration settings when user makes changes', async () => {
    render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)

    // Navigate to meal configuration step
    await waitFor(() => {
      expect(screen.getByText('Breakfast')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Breakfast'))
    fireEvent.click(screen.getByText('Continue'))

    await waitFor(() => {
      expect(screen.getByText(/configure each meal type/i)).toBeInTheDocument()
    })

    // Find breakfast configuration
    const breakfastSection = screen.getByText('Breakfast').closest('.card-primary')
    const daysSelect = breakfastSection?.querySelector('select') as HTMLSelectElement
    
    // Change from default 1 day to 5 days
    fireEvent.change(daysSelect, { target: { value: '5' } })
    
    // Verify the change is reflected
    expect(daysSelect.value).toBe('5')
  })

  it('should not show meal configuration if no meal types selected', async () => {
    render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)

    // Wait for initial message
    await waitFor(() => {
      expect(screen.getByText(/Hi! I'm your AI sous-chef/)).toBeInTheDocument()
    })

    // Try to continue without selecting any meal types
    // Continue button should be disabled or not present
    const continueButton = screen.queryByText('Continue')
    
    if (continueButton) {
      expect(continueButton).toBeDisabled()
    } else {
      // Continue button should not appear without selections
      expect(continueButton).not.toBeInTheDocument()
    }
  })
})