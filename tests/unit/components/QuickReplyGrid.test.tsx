import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import QuickReplyGrid from '../../../apps/web/components/ConversationalChat/QuickReplyGrid'
import { QuickReply as QuickReplyType } from '../../../apps/web/types'

describe('QuickReplyGrid Component', () => {
  const mockQuickReplies: QuickReplyType[] = [
    { id: 'dinner', text: 'Dinner', value: ['dinner'], icon: '🍽️' },
    { id: 'lunch', text: 'Lunch', value: ['lunch'], icon: '🥗' },
    { id: 'breakfast', text: 'Breakfast', value: ['breakfast'], icon: '🥞' },
  ]

  const mockOnSelect = vi.fn()

  beforeEach(() => {
    mockOnSelect.mockClear()
  })

  it('renders all quick replies', () => {
    render(<QuickReplyGrid quickReplies={mockQuickReplies} onSelect={mockOnSelect} />)
    
    expect(screen.getByText('Dinner')).toBeInTheDocument()
    expect(screen.getByText('Lunch')).toBeInTheDocument()
    expect(screen.getByText('Breakfast')).toBeInTheDocument()
  })

  it('returns null when no quick replies provided', () => {
    const { container } = render(<QuickReplyGrid quickReplies={[]} onSelect={mockOnSelect} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when quick replies is undefined', () => {
    const { container } = render(
      <QuickReplyGrid quickReplies={undefined as any} onSelect={mockOnSelect} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('calls onSelect when a quick reply is clicked', () => {
    render(<QuickReplyGrid quickReplies={mockQuickReplies} onSelect={mockOnSelect} />)
    
    const dinnerButton = screen.getByRole('button', { name: /select dinner/i })
    fireEvent.click(dinnerButton)
    
    expect(mockOnSelect).toHaveBeenCalledWith(mockQuickReplies[0])
  })

  it('applies correct grid layout classes based on number of items', () => {
    const { container } = render(
      <QuickReplyGrid quickReplies={mockQuickReplies} onSelect={mockOnSelect} />
    )
    
    const gridContainer = container.querySelector('.grid')
    expect(gridContainer).toHaveClass('grid-cols-2', 'sm:grid-cols-3')
  })

  it('applies single column layout for single item', () => {
    const singleReply = [mockQuickReplies[0]]
    const { container } = render(
      <QuickReplyGrid quickReplies={singleReply} onSelect={mockOnSelect} />
    )
    
    const gridContainer = container.querySelector('.grid')
    expect(gridContainer).toHaveClass('grid-cols-1')
  })

  it('applies two column layout for two items', () => {
    const twoReplies = mockQuickReplies.slice(0, 2)
    const { container } = render(
      <QuickReplyGrid quickReplies={twoReplies} onSelect={mockOnSelect} />
    )
    
    const gridContainer = container.querySelector('.grid')
    expect(gridContainer).toHaveClass('grid-cols-2')
  })

  it('disables all quick replies when disabled prop is true', () => {
    render(<QuickReplyGrid quickReplies={mockQuickReplies} onSelect={mockOnSelect} disabled={true} />)
    
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toBeDisabled()
    })
  })

  it('respects maxColumns prop', () => {
    const { container } = render(
      <QuickReplyGrid 
        quickReplies={mockQuickReplies} 
        onSelect={mockOnSelect} 
        maxColumns={2}
      />
    )
    
    const gridContainer = container.querySelector('.grid')
    expect(gridContainer).toHaveClass('sm:grid-cols-2')
  })
})