import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import QuickReplies from '../ConversationalChat/QuickReplies'

const mockOnReplySelect = vi.fn()

describe('QuickReplies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const sampleReplies = [
    { id: '1', text: 'Breakfast', value: 'breakfast' },
    { id: '2', text: 'Lunch', value: 'lunch' },
    { id: '3', text: 'Dinner', value: 'dinner', selected: true }
  ]

  describe('Basic rendering', () => {
    it('should render all reply options', () => {
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      expect(screen.getByText('Breakfast')).toBeInTheDocument()
      expect(screen.getByText('Lunch')).toBeInTheDocument()
      expect(screen.getByText('Dinner')).toBeInTheDocument()
    })

    it('should show green theme styling', () => {
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      const container = screen.getByRole('region')
      expect(container).toHaveClass('bg-gradient-to-r', 'from-brand-50', 'to-fresh-50')
    })

    it('should not render when no replies provided', () => {
      const { container } = render(
        <QuickReplies 
          replies={[]} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      expect(container.firstChild).toBeNull()
    })

    it('should not render when replies is null/undefined', () => {
      const { container } = render(
        <QuickReplies 
          replies={null as any} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      expect(screen.getByRole('region', { name: 'Quick reply options' })).toBeInTheDocument()
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label')
        expect(button).toHaveAttribute('aria-pressed')
      })
    })

    it('should indicate selected state with aria-pressed', () => {
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      const dinnerButton = screen.getByText('Dinner')
      expect(dinnerButton).toHaveAttribute('aria-pressed', 'true')
      
      const breakfastButton = screen.getByText('Breakfast')
      expect(breakfastButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('should have descriptive aria-labels for single select', () => {
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
          multiSelect={false}
        />
      )
      
      const breakfastButton = screen.getByText('Breakfast')
      expect(breakfastButton).toHaveAttribute('aria-label', 'Select Breakfast')
    })

    it('should have descriptive aria-labels for multi select', () => {
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
          multiSelect={true}
        />
      )
      
      const breakfastButton = screen.getByText('Breakfast')
      expect(breakfastButton).toHaveAttribute('aria-label', 'Toggle Breakfast')
    })
  })

  describe('Selection behavior', () => {
    it('should call onReplySelect when button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      const breakfastButton = screen.getByText('Breakfast')
      await user.click(breakfastButton)
      
      expect(mockOnReplySelect).toHaveBeenCalledWith({
        id: '1',
        text: 'Breakfast',
        value: 'breakfast'
      })
    })

    it('should not call onReplySelect when disabled', async () => {
      const user = userEvent.setup()
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
          disabled={true}
        />
      )
      
      const breakfastButton = screen.getByText('Breakfast')
      await user.click(breakfastButton)
      
      expect(mockOnReplySelect).not.toHaveBeenCalled()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      const breakfastButton = screen.getByText('Breakfast')
      breakfastButton.focus()
      
      await user.keyboard('{Enter}')
      
      expect(mockOnReplySelect).toHaveBeenCalledWith({
        id: '1',
        text: 'Breakfast',
        value: 'breakfast'
      })
    })

    it('should support space key activation', async () => {
      const user = userEvent.setup()
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      const breakfastButton = screen.getByText('Breakfast')
      breakfastButton.focus()
      
      await user.keyboard('{ }') // Space key
      
      expect(mockOnReplySelect).toHaveBeenCalledWith({
        id: '1',
        text: 'Breakfast',
        value: 'breakfast'
      })
    })
  })

  describe('Visual states', () => {
    it('should show selected state styling', () => {
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      const dinnerButton = screen.getByText('Dinner')
      expect(dinnerButton).toHaveClass('bg-brand-600', 'text-white', 'border-brand-600')
    })

    it('should show unselected state styling', () => {
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      const breakfastButton = screen.getByText('Breakfast')
      expect(breakfastButton).toHaveClass('bg-white', 'text-brand-700', 'border-brand-200')
    })

    it('should show disabled state styling when disabled', () => {
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
          disabled={true}
        />
      )
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toBeDisabled()
        expect(button).toHaveClass('disabled:opacity-50')
      })
    })

    it('should show check icon for selected items in multiSelect mode', () => {
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
          multiSelect={true}
        />
      )
      
      // Check icon should be present for selected item
      const dinnerButton = screen.getByText('Dinner')
      const checkIcon = dinnerButton.querySelector('svg')
      expect(checkIcon).toBeInTheDocument()
    })
  })

  describe('Multi-select behavior', () => {
    it('should show multi-select help text', () => {
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
          multiSelect={true}
        />
      )
      
      expect(screen.getByText('Select all that apply')).toBeInTheDocument()
    })

    it('should not show help text for single select', () => {
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
          multiSelect={false}
        />
      )
      
      expect(screen.queryByText('Select all that apply')).not.toBeInTheDocument()
    })

    it('should handle multiple selected items in multiSelect mode', () => {
      const multiSelectReplies = [
        { id: '1', text: 'Breakfast', value: 'breakfast', selected: true },
        { id: '2', text: 'Lunch', value: 'lunch', selected: true },
        { id: '3', text: 'Dinner', value: 'dinner', selected: false }
      ]

      render(
        <QuickReplies 
          replies={multiSelectReplies} 
          onReplySelect={mockOnReplySelect} 
          multiSelect={true}
        />
      )
      
      const breakfastButton = screen.getByText('Breakfast')
      const lunchButton = screen.getByText('Lunch')
      const dinnerButton = screen.getByText('Dinner')
      
      expect(breakfastButton).toHaveAttribute('aria-pressed', 'true')
      expect(lunchButton).toHaveAttribute('aria-pressed', 'true')
      expect(dinnerButton).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('Mobile responsiveness', () => {
    it('should have proper touch targets for mobile', () => {
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('min-h-[44px]') // 44px minimum touch target
      })
    })

    it('should handle text wrapping properly', () => {
      const longTextReplies = [
        { id: '1', text: 'Very long text that should wrap properly on small screens', value: 'long' }
      ]

      render(
        <QuickReplies 
          replies={longTextReplies} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      const button = screen.getByText('Very long text that should wrap properly on small screens')
      const textSpan = button.querySelector('span')
      expect(textSpan).toHaveClass('truncate', 'max-w-[200px]')
    })

    it('should use responsive gap spacing', () => {
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      const container = document.querySelector('.flex.flex-wrap')
      expect(container).toHaveClass('gap-2')
    })
  })

  describe('Animation and interaction', () => {
    it('should have hover effects', () => {
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      const breakfastButton = screen.getByText('Breakfast')
      expect(breakfastButton).toHaveClass('hover:border-brand-400', 'hover:bg-brand-50')
    })

    it('should have lift animation on hover', () => {
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('transform', 'hover:-translate-y-0.5')
      })
    })

    it('should have focus ring for keyboard navigation', () => {
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('focus:ring-4', 'focus:ring-brand-100')
      })
    })
  })

  describe('Custom styling', () => {
    it('should apply custom className', () => {
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
          className="custom-class"
        />
      )
      
      const container = screen.getByRole('region')
      expect(container).toHaveClass('custom-class')
    })

    it('should maintain green shadow for selected items', () => {
      render(
        <QuickReplies 
          replies={sampleReplies} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      const dinnerButton = screen.getByText('Dinner')
      expect(dinnerButton).toHaveClass('shadow-green')
    })
  })

  describe('Edge cases', () => {
    it('should handle reply with empty text', () => {
      const edgeReplies = [
        { id: '1', text: '', value: 'empty' },
        { id: '2', text: 'Normal', value: 'normal' }
      ]

      render(
        <QuickReplies 
          replies={edgeReplies} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
    })

    it('should handle special characters in text', () => {
      const specialReplies = [
        { id: '1', text: 'Text with émojis 🍕', value: 'emoji' },
        { id: '2', text: 'Special chars: @#$%', value: 'special' }
      ]

      render(
        <QuickReplies 
          replies={specialReplies} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      expect(screen.getByText('Text with émojis 🍕')).toBeInTheDocument()
      expect(screen.getByText('Special chars: @#$%')).toBeInTheDocument()
    })

    it('should handle very long text with truncation', () => {
      const longTextReplies = [
        { 
          id: '1', 
          text: 'This is an extremely long text that should be truncated properly when displayed in the quick reply button to prevent layout issues', 
          value: 'long' 
        }
      ]

      render(
        <QuickReplies 
          replies={longTextReplies} 
          onReplySelect={mockOnReplySelect} 
        />
      )
      
      const button = screen.getByRole('button')
      const textSpan = button.querySelector('span')
      expect(textSpan).toHaveClass('truncate')
    })
  })
})