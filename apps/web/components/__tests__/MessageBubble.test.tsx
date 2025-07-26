import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import MessageBubble from '../ConversationalChat/MessageBubble'

describe('MessageBubble', () => {
  const defaultProps = {
    id: 'test-message',
    role: 'user' as const,
    content: 'Test message content',
    timestamp: new Date('2023-01-01T12:00:00Z')
  }

  describe('Rendering', () => {
    it('should render user message with correct styling', () => {
      render(<MessageBubble {...defaultProps} />)
      
      expect(screen.getByText('Test message content')).toBeInTheDocument()
      expect(screen.getByLabelText('user message')).toBeInTheDocument()
      
      // Check user-specific styling
      const messageContainer = screen.getByRole('listitem')
      expect(messageContainer).toHaveClass('flex-row-reverse')
    })

    it('should render assistant message with correct styling', () => {
      render(<MessageBubble {...defaultProps} role="assistant" />)
      
      expect(screen.getByText('Test message content')).toBeInTheDocument()
      expect(screen.getByLabelText('assistant message')).toBeInTheDocument()
      
      // Check assistant-specific styling
      const messageContainer = screen.getByRole('listitem')
      expect(messageContainer).toHaveClass('flex-row')
    })

    it('should display timestamp when provided', () => {
      render(<MessageBubble {...defaultProps} />)
      
      expect(screen.getByText('12:00 PM')).toBeInTheDocument()
    })

    it('should not display timestamp when not provided', () => {
      const { timestamp, ...propsWithoutTimestamp } = defaultProps
      render(<MessageBubble {...propsWithoutTimestamp} />)
      
      expect(screen.queryByText(/\d{1,2}:\d{2}/)).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<MessageBubble {...defaultProps} />)
      
      expect(screen.getByLabelText('user message')).toBeInTheDocument()
      expect(screen.getByRole('listitem')).toBeInTheDocument()
    })

    it('should hide decorative icons from screen readers', () => {
      render(<MessageBubble {...defaultProps} />)
      
      const icon = document.querySelector('[aria-hidden="true"]')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Visual indicators', () => {
    it('should show user icon for user messages', () => {
      render(<MessageBubble {...defaultProps} />)
      
      // User icon should be present (testing via SVG class or similar)
      const avatar = document.querySelector('.bg-brand-600')
      expect(avatar).toBeInTheDocument()
    })

    it('should show bot icon for assistant messages', () => {
      render(<MessageBubble {...defaultProps} role="assistant" />)
      
      // Bot icon should be present with green theme
      const avatar = document.querySelector('.bg-gradient-to-br')
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveClass('from-brand-100', 'to-fresh-100')
    })

    it('should apply green theme colors', () => {
      render(<MessageBubble {...defaultProps} role="assistant" />)
      
      const messageBubble = document.querySelector('.bg-white.border-brand-100')
      expect(messageBubble).toBeInTheDocument()
    })
  })

  describe('Content handling', () => {
    it('should handle long content with proper word breaking', () => {
      const longContent = 'This is a very long message that should wrap properly and not break the layout when displayed in the message bubble component'
      
      render(<MessageBubble {...defaultProps} content={longContent} />)
      
      expect(screen.getByText(longContent)).toBeInTheDocument()
      
      const contentElement = screen.getByText(longContent)
      expect(contentElement).toHaveClass('break-words')
    })

    it('should handle empty content gracefully', () => {
      render(<MessageBubble {...defaultProps} content="" />)
      
      const messageContainer = screen.getByRole('listitem')
      expect(messageContainer).toBeInTheDocument()
    })

    it('should handle special characters and emojis', () => {
      const specialContent = 'Test message with emoji 👨‍🍳 and special chars: @#$%^&*()'
      
      render(<MessageBubble {...defaultProps} content={specialContent} />)
      
      expect(screen.getByText(specialContent)).toBeInTheDocument()
    })
  })

  describe('Animation and interactivity', () => {
    it('should have fade-in animation class', () => {
      render(<MessageBubble {...defaultProps} />)
      
      const messageContainer = screen.getByRole('listitem')
      expect(messageContainer).toHaveClass('animate-fade-in')
    })

    it('should have hover effects on assistant messages', () => {
      render(<MessageBubble {...defaultProps} role="assistant" />)
      
      const messageBubble = document.querySelector('.hover\\:shadow-md')
      expect(messageBubble).toBeInTheDocument()
    })

    it('should have green shadow hover effect on user messages', () => {
      render(<MessageBubble {...defaultProps} />)
      
      const messageBubble = document.querySelector('.hover\\:shadow-green')
      expect(messageBubble).toBeInTheDocument()
    })
  })

  describe('Responsive design', () => {
    it('should have responsive max-width classes', () => {
      render(<MessageBubble {...defaultProps} />)
      
      const contentContainer = document.querySelector('.max-w-\\[80\\%\\]')
      expect(contentContainer).toBeInTheDocument()
      expect(contentContainer).toHaveClass('sm:max-w-[70%]')
    })

    it('should maintain proper spacing on mobile', () => {
      render(<MessageBubble {...defaultProps} />)
      
      const messageContainer = screen.getByRole('listitem')
      expect(messageContainer).toHaveClass('gap-3', 'mb-6')
    })
  })

  describe('Theme consistency', () => {
    it('should use brand colors for user messages', () => {
      render(<MessageBubble {...defaultProps} />)
      
      const userBubble = document.querySelector('.bg-brand-600')
      expect(userBubble).toBeInTheDocument()
      expect(userBubble).toHaveClass('text-white')
    })

    it('should use white background for assistant messages', () => {
      render(<MessageBubble {...defaultProps} role="assistant" />)
      
      const assistantBubble = document.querySelector('.bg-white')
      expect(assistantBubble).toBeInTheDocument()
      expect(assistantBubble).toHaveClass('border-brand-100')
    })

    it('should have consistent border radius with theme', () => {
      render(<MessageBubble {...defaultProps} />)
      
      const messageBubble = document.querySelector('.rounded-2xl')
      expect(messageBubble).toBeInTheDocument()
    })
  })
})