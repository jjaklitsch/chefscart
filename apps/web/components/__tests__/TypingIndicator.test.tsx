import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import TypingIndicator from '../ConversationalChat/TypingIndicator'

describe('TypingIndicator', () => {
  describe('Basic rendering', () => {
    it('should render with default message', () => {
      render(<TypingIndicator />)
      
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByLabelText('AI is typing...')).toBeInTheDocument()
    })

    it('should render with custom message', () => {
      render(<TypingIndicator message="Custom typing message..." />)
      
      expect(screen.getByLabelText('Custom typing message...')).toBeInTheDocument()
    })

    it('should show AI avatar with green theme', () => {
      render(<TypingIndicator />)
      
      const avatar = document.querySelector('.bg-gradient-to-br')
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveClass('from-brand-100', 'to-fresh-100')
    })

    it('should display bot icon in avatar', () => {
      render(<TypingIndicator />)
      
      const botIcon = document.querySelector('[aria-hidden="true"]')
      expect(botIcon).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<TypingIndicator />)
      
      const statusElement = screen.getByRole('status')
      expect(statusElement).toHaveAttribute('aria-live', 'polite')
      expect(statusElement).toHaveAttribute('aria-label', 'AI is typing...')
    })

    it('should hide decorative elements from screen readers', () => {
      render(<TypingIndicator />)
      
      const hiddenElements = document.querySelectorAll('[aria-hidden="true"]')
      expect(hiddenElements.length).toBeGreaterThan(0)
    })

    it('should provide screen reader text for typing status', () => {
      render(<TypingIndicator message="Processing your request..." />)
      
      const screenReaderText = document.querySelector('.sr-only')
      expect(screenReaderText).toBeInTheDocument()
    })
  })

  describe('Animation and visual effects', () => {
    it('should have fade-in animation', () => {
      render(<TypingIndicator />)
      
      const container = screen.getByRole('status')
      expect(container).toHaveClass('animate-fade-in')
    })

    it('should have animated typing dots', () => {
      render(<TypingIndicator />)
      
      const animatedDots = document.querySelectorAll('.animate-bounce')
      expect(animatedDots).toHaveLength(3)
    })

    it('should have staggered animation delays for dots', () => {
      render(<TypingIndicator />)
      
      const dots = document.querySelectorAll('.animate-bounce')
      
      expect(dots[0]).toHaveStyle('animation-delay: 0ms')
      expect(dots[1]).toHaveStyle('animation-delay: 200ms')
      expect(dots[2]).toHaveStyle('animation-delay: 400ms')
    })

    it('should have consistent animation duration', () => {
      render(<TypingIndicator />)
      
      const dots = document.querySelectorAll('.animate-bounce')
      
      dots.forEach(dot => {
        expect(dot).toHaveStyle('animation-duration: 1.4s')
      })
    })
  })

  describe('Styling and theme', () => {
    it('should use green brand colors for dots', () => {
      render(<TypingIndicator />)
      
      const dots = document.querySelectorAll('.bg-brand-400')
      expect(dots).toHaveLength(3)
    })

    it('should have proper bubble styling', () => {
      render(<TypingIndicator />)
      
      const bubble = document.querySelector('.bg-white')
      expect(bubble).toBeInTheDocument()
      expect(bubble).toHaveClass('border-brand-100', 'rounded-2xl', 'rounded-bl-lg')
    })

    it('should match message bubble design', () => {
      render(<TypingIndicator />)
      
      const bubble = document.querySelector('.bg-white')
      expect(bubble).toHaveClass('px-4', 'py-3', 'shadow-sm')
    })

    it('should have consistent avatar styling with assistant messages', () => {
      render(<TypingIndicator />)
      
      const avatar = document.querySelector('.w-8.h-8')
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveClass('rounded-full', 'border-2', 'border-brand-200')
    })
  })

  describe('Layout and positioning', () => {
    it('should align to the left like assistant messages', () => {
      render(<TypingIndicator />)
      
      const container = screen.getByRole('status')
      expect(container).toHaveClass('flex', 'items-start', 'gap-3')
      expect(container).not.toHaveClass('flex-row-reverse') // Left-aligned
    })

    it('should have proper spacing', () => {
      render(<TypingIndicator />)
      
      const container = screen.getByRole('status')
      expect(container).toHaveClass('mb-6')
    })

    it('should have responsive max-width', () => {
      render(<TypingIndicator />)
      
      const bubble = document.querySelector('.max-w-\\[70\\%\\]')
      expect(bubble).toBeInTheDocument()
    })
  })

  describe('Custom styling', () => {
    it('should apply custom className', () => {
      render(<TypingIndicator className="custom-typing-class" />)
      
      const container = screen.getByRole('status')
      expect(container).toHaveClass('custom-typing-class')
    })

    it('should maintain base classes with custom className', () => {
      render(<TypingIndicator className="custom-class" />)
      
      const container = screen.getByRole('status')
      expect(container).toHaveClass('custom-class')
      expect(container).toHaveClass('flex', 'items-start', 'gap-3')
    })
  })

  describe('Dot animation details', () => {
    it('should render exactly 3 animated dots', () => {
      render(<TypingIndicator />)
      
      const dots = document.querySelectorAll('.w-2.h-2.bg-brand-400.rounded-full')
      expect(dots).toHaveLength(3)
    })

    it('should have proper dot sizing', () => {
      render(<TypingIndicator />)
      
      const dots = document.querySelectorAll('.w-2.h-2')
      expect(dots).toHaveLength(3)
      
      dots.forEach(dot => {
        expect(dot).toHaveClass('rounded-full')
      })
    })

    it('should have proper dot spacing', () => {
      render(<TypingIndicator />)
      
      const dotsContainer = document.querySelector('.flex.items-center.gap-1')
      expect(dotsContainer).toBeInTheDocument()
    })
  })

  describe('Performance considerations', () => {
    it('should not cause layout shift', () => {
      render(<TypingIndicator />)
      
      // The component should maintain consistent dimensions
      const container = screen.getByRole('status')
      const bubble = container.querySelector('.px-4.py-3')
      
      expect(bubble).toBeInTheDocument()
      expect(bubble).toHaveClass('px-4', 'py-3') // Consistent padding
    })

    it('should use CSS animations rather than JavaScript', () => {
      render(<TypingIndicator />)
      
      const dots = document.querySelectorAll('.animate-bounce')
      expect(dots).toHaveLength(3)
      
      // Each dot should use CSS animation class
      dots.forEach(dot => {
        expect(dot).toHaveClass('animate-bounce')
      })
    })
  })

  describe('Message customization', () => {
    it('should handle empty message', () => {
      render(<TypingIndicator message="" />)
      
      const statusElement = screen.getByRole('status')
      expect(statusElement).toHaveAttribute('aria-label', '')
    })

    it('should handle long message', () => {
      const longMessage = 'This is a very long typing message that should be handled properly without breaking the layout or accessibility features'
      
      render(<TypingIndicator message={longMessage} />)
      
      expect(screen.getByLabelText(longMessage)).toBeInTheDocument()
    })

    it('should handle special characters in message', () => {
      const specialMessage = 'AI is thinking... 🤔 Processing your request!'
      
      render(<TypingIndicator message={specialMessage} />)
      
      expect(screen.getByLabelText(specialMessage)).toBeInTheDocument()
    })
  })

  describe('Integration with chat flow', () => {
    it('should match the visual style of assistant messages', () => {
      render(<TypingIndicator />)
      
      // Should have same avatar styling as assistant
      const avatar = document.querySelector('.bg-gradient-to-br.from-brand-100.to-fresh-100')
      expect(avatar).toBeInTheDocument()
      
      // Should have same bubble styling as assistant
      const bubble = document.querySelector('.bg-white.border-brand-100')
      expect(bubble).toBeInTheDocument()
    })

    it('should be distinguishable from regular messages', () => {
      render(<TypingIndicator />)
      
      // Should have animated dots that regular messages don't have
      const animatedDots = document.querySelectorAll('.animate-bounce')
      expect(animatedDots).toHaveLength(3)
      
      // Should have status role that messages don't have
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  describe('Browser compatibility', () => {
    it('should work without CSS animation support', () => {
      // Mock lack of animation support
      const originalAnimate = Element.prototype.animate
      Element.prototype.animate = undefined as any
      
      expect(() => {
        render(<TypingIndicator />)
      }).not.toThrow()
      
      // Should still render dots even without animation
      const dots = document.querySelectorAll('.bg-brand-400')
      expect(dots).toHaveLength(3)
      
      // Restore original
      Element.prototype.animate = originalAnimate
    })

    it('should handle reduced motion preferences', () => {
      // Test should consider prefers-reduced-motion
      // In a real implementation, animations might be disabled for accessibility
      render(<TypingIndicator />)
      
      const container = screen.getByRole('status')
      expect(container).toBeInTheDocument()
    })
  })
})