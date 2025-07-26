import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import ChatInput from '../ConversationalChat/ChatInput'

const mockOnSendMessage = vi.fn()

describe('ChatInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultProps = {
    onSendMessage: mockOnSendMessage,
    placeholder: 'Type your message...',
    maxLength: 500
  }

  describe('Basic rendering', () => {
    it('should render text input with placeholder', () => {
      render(<ChatInput {...defaultProps} />)
      
      expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument()
      expect(screen.getByLabelText('Send message')).toBeInTheDocument()
      expect(screen.getByLabelText(/voice recording/i)).toBeInTheDocument()
    })

    it('should show green theme styling', () => {
      render(<ChatInput {...defaultProps} />)
      
      const textInput = screen.getByPlaceholderText('Type your message...')
      expect(textInput).toHaveClass('border-brand-200')
      
      const sendButton = screen.getByLabelText('Send message')
      expect(sendButton).toHaveClass('bg-gray-200') // Initially disabled
    })

    it('should have proper ARIA labels for accessibility', () => {
      render(<ChatInput {...defaultProps} />)
      
      expect(screen.getByLabelText('Type your message')).toBeInTheDocument()
      expect(screen.getByLabelText('Send message')).toBeInTheDocument()
      expect(screen.getByLabelText('Start voice recording')).toBeInTheDocument()
    })
  })

  describe('Text input functionality', () => {
    it('should update input value when typing', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} />)
      
      const textInput = screen.getByPlaceholderText('Type your message...') as HTMLTextAreaElement
      
      await user.type(textInput, 'Hello world')
      
      expect(textInput.value).toBe('Hello world')
    })

    it('should enable send button when text is entered', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} />)
      
      const textInput = screen.getByPlaceholderText('Type your message...')
      const sendButton = screen.getByLabelText('Send message')
      
      expect(sendButton).toHaveClass('bg-gray-200') // Initially disabled
      
      await user.type(textInput, 'Hello')
      
      expect(sendButton).toHaveClass('bg-brand-600') // Enabled
      expect(sendButton).not.toBeDisabled()
    })

    it('should call onSendMessage when Enter is pressed', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} />)
      
      const textInput = screen.getByPlaceholderText('Type your message...')
      
      await user.type(textInput, 'Test message{Enter}')
      
      expect(mockOnSendMessage).toHaveBeenCalledWith('Test message')
    })

    it('should not send on Shift+Enter (should add new line)', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} />)
      
      const textInput = screen.getByPlaceholderText('Type your message...')
      
      await user.type(textInput, 'Line 1{Shift>}{Enter}{/Shift}Line 2')
      
      expect(mockOnSendMessage).not.toHaveBeenCalled()
      expect((textInput as HTMLTextAreaElement).value).toContain('\n')
    })

    it('should call onSendMessage when send button is clicked', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} />)
      
      const textInput = screen.getByPlaceholderText('Type your message...')
      const sendButton = screen.getByLabelText('Send message')
      
      await user.type(textInput, 'Test message')
      await user.click(sendButton)
      
      expect(mockOnSendMessage).toHaveBeenCalledWith('Test message')
    })

    it('should clear input after sending message', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} />)
      
      const textInput = screen.getByPlaceholderText('Type your message...') as HTMLTextAreaElement
      
      await user.type(textInput, 'Test message')
      await user.keyboard('{Enter}')
      
      expect(textInput.value).toBe('')
    })
  })

  describe('Auto-expanding textarea', () => {
    it('should have initial minimum height', () => {
      render(<ChatInput {...defaultProps} />)
      
      const textInput = screen.getByPlaceholderText('Type your message...') as HTMLTextAreaElement
      expect(textInput.style.minHeight).toBe('44px')
    })

    it('should expand height with longer content', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} />)
      
      const textInput = screen.getByPlaceholderText('Type your message...') as HTMLTextAreaElement
      const longText = 'This is a very long message that should cause the textarea to expand beyond its initial height when typed into the input field'
      
      await user.type(textInput, longText)
      
      // Height should be greater than initial
      const currentHeight = parseInt(textInput.style.height)
      expect(currentHeight).toBeGreaterThan(44)
    })

    it('should have maximum height limit', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} />)
      
      const textInput = screen.getByPlaceholderText('Type your message...') as HTMLTextAreaElement
      const maxHeight = 44 * 4 // 4 lines max
      
      // Type a very long message to test max height
      const veryLongText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20)
      
      await user.type(textInput, veryLongText)
      
      expect(textInput.style.maxHeight).toBe(`${maxHeight}px`)
    })

    it('should reset height after message is sent', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} />)
      
      const textInput = screen.getByPlaceholderText('Type your message...') as HTMLTextAreaElement
      const longText = 'This is a long message\nthat spans multiple\nlines to test height reset'
      
      await user.type(textInput, longText)
      
      // Verify it expanded
      const expandedHeight = parseInt(textInput.style.height)
      expect(expandedHeight).toBeGreaterThan(44)
      
      // Send message
      await user.keyboard('{Enter}')
      
      // Should reset to initial height
      expect(textInput.style.height).toBe('44px')
    })
  })

  describe('Character count and limits', () => {
    it('should show character count when approaching limit', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} maxLength={100} />)
      
      const textInput = screen.getByPlaceholderText('Type your message...')
      
      // Type enough to trigger character count display (70% of limit)
      await user.type(textInput, 'a'.repeat(70))
      
      expect(screen.getByText('70/100')).toBeInTheDocument()
    })

    it('should show warning color when near limit', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} maxLength={100} />)
      
      const textInput = screen.getByPlaceholderText('Type your message...')
      
      // Type to 80% of limit (warning threshold)
      await user.type(textInput, 'a'.repeat(80))
      
      const counter = screen.getByText('80/100')
      expect(counter).toHaveClass('text-warning')
    })

    it('should show error color when approaching max limit', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} maxLength={100} />)
      
      const textInput = screen.getByPlaceholderText('Type your message...')
      
      // Type to 90% of limit (error threshold)
      await user.type(textInput, 'a'.repeat(90))
      
      const counter = screen.getByText('90/100')
      expect(counter).toHaveClass('text-red-500')
    })

    it('should prevent typing beyond max length', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} maxLength={10} />)
      
      const textInput = screen.getByPlaceholderText('Type your message...') as HTMLTextAreaElement
      
      await user.type(textInput, 'This is longer than 10 characters')
      
      // Should only contain first 10 characters
      expect(textInput.value).toBe('This is lo')
      expect(textInput.value.length).toBe(10)
    })
  })

  describe('Voice recording functionality', () => {
    it('should toggle recording state when voice button is clicked', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} />)
      
      const voiceButton = screen.getByLabelText('Start voice recording')
      
      await user.click(voiceButton)
      
      expect(screen.getByLabelText('Stop recording')).toBeInTheDocument()
      expect(screen.getByText('Recording...')).toBeInTheDocument()
    })

    it('should show recording indicator when active', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} />)
      
      const voiceButton = screen.getByLabelText('Start voice recording')
      
      await user.click(voiceButton)
      
      expect(screen.getByText('Recording...')).toBeInTheDocument()
      expect(screen.getByText('Recording...')).toHaveClass('animate-pulse')
    })

    it('should change voice button appearance when recording', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} />)
      
      const voiceButton = screen.getByLabelText('Start voice recording')
      
      await user.click(voiceButton)
      
      const recordingButton = screen.getByLabelText('Stop recording')
      expect(recordingButton).toHaveClass('bg-red-500')
    })
  })

  describe('Disabled state', () => {
    it('should disable all inputs when disabled prop is true', () => {
      render(<ChatInput {...defaultProps} disabled />)
      
      const textInput = screen.getByPlaceholderText('Type your message...')
      const sendButton = screen.getByLabelText('Send message')
      const voiceButton = screen.getByLabelText('Start voice recording')
      
      expect(textInput).toBeDisabled()
      expect(sendButton).toBeDisabled()
      expect(voiceButton).toBeDisabled()
    })

    it('should not send message when disabled', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} disabled />)
      
      const textInput = screen.getByPlaceholderText('Type your message...')
      
      await user.type(textInput, 'Test message{Enter}')
      
      expect(mockOnSendMessage).not.toHaveBeenCalled()
    })
  })

  describe('Loading state', () => {
    it('should show loading spinner when isLoading is true', () => {
      render(<ChatInput {...defaultProps} isLoading />)
      
      expect(document.querySelector('.loading-spinner')).toBeInTheDocument()
    })

    it('should disable send button when loading', () => {
      render(<ChatInput {...defaultProps} isLoading />)
      
      const sendButton = screen.getByLabelText('Send message')
      expect(sendButton).toBeDisabled()
    })

    it('should not send message when loading', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} isLoading />)
      
      const textInput = screen.getByPlaceholderText('Type your message...')
      
      await user.type(textInput, 'Test message{Enter}')
      
      expect(mockOnSendMessage).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard shortcuts and hints', () => {
    it('should show keyboard hint text', () => {
      render(<ChatInput {...defaultProps} />)
      
      expect(screen.getByText('Press Enter to send, Shift+Enter for new line')).toBeInTheDocument()
    })

    it('should handle focus and blur states', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} />)
      
      const textInput = screen.getByPlaceholderText('Type your message...')
      
      await user.click(textInput)
      expect(textInput).toHaveFocus()
      
      await user.tab()
      expect(textInput).not.toHaveFocus()
    })
  })

  describe('Mobile responsiveness', () => {
    it('should have proper touch targets for mobile', () => {
      render(<ChatInput {...defaultProps} />)
      
      const sendButton = screen.getByLabelText('Send message')
      const voiceButton = screen.getByLabelText('Start voice recording')
      
      expect(sendButton).toHaveClass('w-11', 'h-11') // 44px minimum
      expect(voiceButton).toHaveClass('w-11', 'h-11')
    })

    it('should handle mobile keyboard properly', () => {
      render(<ChatInput {...defaultProps} />)
      
      const textInput = screen.getByPlaceholderText('Type your message...')
      expect(textInput).toHaveAttribute('rows', '1')
    })
  })
})