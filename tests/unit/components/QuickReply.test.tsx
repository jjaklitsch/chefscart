import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import QuickReply from '../../../apps/web/components/ConversationalChat/QuickReply'
import { QuickReply as QuickReplyType } from '../../../apps/web/types'

describe('QuickReply Component', () => {
  const mockReply: QuickReplyType = {
    id: 'test-reply',
    text: 'Dinner',
    value: ['dinner'],
    icon: '🍽️'
  }

  const mockOnSelect = vi.fn()

  beforeEach(() => {
    mockOnSelect.mockClear()
  })

  it('renders quick reply with text and icon', () => {
    render(<QuickReply reply={mockReply} onSelect={mockOnSelect} />)
    
    expect(screen.getByText('Dinner')).toBeInTheDocument()
    expect(screen.getByText('🍽️')).toBeInTheDocument()
  })

  it('calls onSelect when clicked', () => {
    render(<QuickReply reply={mockReply} onSelect={mockOnSelect} />)
    
    const button = screen.getByRole('button', { name: /select dinner/i })
    fireEvent.click(button)
    
    expect(mockOnSelect).toHaveBeenCalledWith(mockReply)
  })

  it('renders without icon when icon is not provided', () => {
    const replyWithoutIcon = { ...mockReply, icon: undefined }
    render(<QuickReply reply={replyWithoutIcon} onSelect={mockOnSelect} />)
    
    expect(screen.getByText('Dinner')).toBeInTheDocument()
    expect(screen.queryByText('🍽️')).not.toBeInTheDocument()
  })

  it('is disabled when disabled prop is true', () => {
    render(<QuickReply reply={mockReply} onSelect={mockOnSelect} disabled={true} />)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    
    fireEvent.click(button)
    expect(mockOnSelect).not.toHaveBeenCalled()
  })

  it('applies correct styling classes', () => {
    render(<QuickReply reply={mockReply} onSelect={mockOnSelect} />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('inline-flex', 'items-center', 'gap-2', 'px-4', 'py-2', 'rounded-full')
  })

  it('applies disabled styling when disabled', () => {
    render(<QuickReply reply={mockReply} onSelect={mockOnSelect} disabled={true} />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-gray-100', 'text-gray-400', 'cursor-not-allowed')
  })
})