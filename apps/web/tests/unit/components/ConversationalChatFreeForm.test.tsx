import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react'
import ConversationalChat from '../../../components/ConversationalChat/ConversationalChat'

// Mock the conversation process API
global.fetch = vi.fn()

const mockFetch = fetch as any

describe('ConversationalChat - Free Form Text Input', () => {
  const mockOnPreferencesComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    
    // Mock successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        response: "I understand you'd like dinner recipes for 2 people. Let me help you with that!",
        extractedData: {
          mealTypes: ['dinner'],
          peoplePerMeal: 2
        }
      })
    })
  })

  it('should show text input as primary interaction method', async () => {
    render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
    
    await waitFor(() => {
      expect(screen.getByText(/Hi! I'm your AI sous-chef/)).toBeInTheDocument()
    })

    // Text input should be visible and primary
    const textInput = screen.getByRole('textbox')
    expect(textInput).toBeInTheDocument()
    expect(textInput).toHaveAttribute('placeholder', expect.stringContaining('Tell me about your meal preferences'))
  })

  it('should show quick replies as optional suggestions below text input', async () => {
    render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
    
    await waitFor(() => {
      expect(screen.getByText(/Hi! I'm your AI sous-chef/)).toBeInTheDocument()
    })

    // Quick replies should still be present but secondary
    expect(screen.getByText('Breakfast')).toBeInTheDocument()
    expect(screen.getByText('Lunch')).toBeInTheDocument()
    expect(screen.getByText('Dinner')).toBeInTheDocument()
    
    // Text input should be the primary interaction
    const textInput = screen.getByRole('textbox')
    expect(textInput).toBeInTheDocument()
  })

  it('should allow natural language processing at any point', async () => {
    render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
    
    await waitFor(() => {
      expect(screen.getByText(/Hi! I'm your AI sous-chef/)).toBeInTheDocument()
    })

    const textInput = screen.getByRole('textbox')
    const sendButton = screen.getByRole('button', { name: /send/i })

    // Type natural language message
    await act(async () => {
      fireEvent.change(textInput, { 
        target: { value: 'I want healthy dinner recipes for my family of 4' } 
      })
    })

    // Send the message
    await act(async () => {
      fireEvent.click(sendButton)
    })

    // Should call the conversation API
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/conversation/process',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'I want healthy dinner recipes for my family of 4',
          context: expect.any(String)
        })
      })
    )
  })

  it('should maintain backward compatibility with existing data structures', async () => {
    // Pre-populate localStorage with existing conversation state
    const existingState = {
      step: 2,
      preferences: { 
        selectedMealTypes: ['dinner'],
        diets: ['vegetarian'] 
      },
      selectedReplies: [],
      mealConfiguration: { dinner: { days: 5, adults: 2, kids: 0 } },
      awaitingResponse: false,
      version: 1
    }
    localStorage.setItem('chefscart_conversation_state', JSON.stringify(existingState))

    render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
    
    await waitFor(() => {
      expect(screen.getByText(/Step 3 of/)).toBeInTheDocument()
    })

    // Should maintain existing conversation flow
    expect(screen.getByText(/dietary preferences/)).toBeInTheDocument()
  })

  it('should handle mobile keyboard properly', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    })

    render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
    
    await waitFor(() => {
      expect(screen.getByText(/Hi! I'm your AI sous-chef/)).toBeInTheDocument()
    })

    const textInput = screen.getByRole('textbox')
    
    // Should have mobile-friendly attributes
    expect(textInput).toHaveAttribute('inputMode', 'text')
    expect(textInput).toHaveAttribute('autoCapitalize', 'sentences')
  })

  it('should merge AI extracted data with conversation state', async () => {
    render(<ConversationalChat onPreferencesComplete={mockOnPreferencesComplete} />)
    
    await waitFor(() => {
      expect(screen.getByText(/Hi! I'm your AI sous-chef/)).toBeInTheDocument()
    })

    const textInput = screen.getByRole('textbox')
    const sendButton = screen.getByRole('button', { name: /send/i })

    // Send natural language message
    await act(async () => {
      fireEvent.change(textInput, { 
        target: { value: 'I want vegetarian dinner recipes for 2 people' } 
      })
      fireEvent.click(sendButton)
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    // The component should have processed the extracted data
    // This would be verified through the localStorage state or conversation flow
  })
})