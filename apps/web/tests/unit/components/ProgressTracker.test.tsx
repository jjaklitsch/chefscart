import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProgressTracker from '../../../components/ProgressTracker/ProgressTracker'
import { UserPreferences } from '../../../types'

describe('ProgressTracker', () => {
  const mockOnEditItem = vi.fn()
  const mockPreferences: Partial<UserPreferences> = {
    mealTypes: [{ type: 'dinner', days: ['monday', 'tuesday', 'wednesday'], adults: 2, kids: 0 }],
    diets: ['vegetarian'],
    allergies: [],
    organicPreference: 'preferred',
    maxCookTime: 30,
    cookingSkillLevel: 'intermediate',
    preferredCuisines: ['italian', 'mexican']
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render as collapsible sidebar on desktop', async () => {
    // Mock desktop viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    })

    render(
      <ProgressTracker 
        preferences={mockPreferences} 
        onEditItem={mockOnEditItem}
        isCollapsed={false}
        onToggleCollapse={() => {}}
      />
    )

    expect(screen.getByRole('complementary', { name: /progress tracker/i })).toBeInTheDocument()
    expect(screen.getByText(/meal planning progress/i)).toBeInTheDocument()
  })

  it('should display checklist of required data points', async () => {
    render(
      <ProgressTracker 
        preferences={mockPreferences} 
        onEditItem={mockOnEditItem}
        isCollapsed={false}
        onToggleCollapse={() => {}}
      />
    )

    // Check for required data points
    expect(screen.getByText(/meal types/i)).toBeInTheDocument()
    expect(screen.getByText(/dietary restrictions/i)).toBeInTheDocument()
    expect(screen.getByText(/allergies/i)).toBeInTheDocument()
    expect(screen.getByText(/organic preference/i)).toBeInTheDocument()
    expect(screen.getByText(/cooking time/i)).toBeInTheDocument()
    expect(screen.getByText(/skill level/i)).toBeInTheDocument()
    expect(screen.getByText(/cuisines/i)).toBeInTheDocument()
  })

  it('should show visual indicators for data point status', async () => {
    render(
      <ProgressTracker 
        preferences={mockPreferences} 
        onEditItem={mockOnEditItem}
        isCollapsed={false}
        onToggleCollapse={() => {}}
      />
    )

    // Should show completed status for provided data
    const mealTypesItem = screen.getByTestId('progress-item-mealTypes')
    expect(mealTypesItem).toHaveAttribute('data-status', 'completed')
    
    const dietsItem = screen.getByTestId('progress-item-diets')
    expect(dietsItem).toHaveAttribute('data-status', 'completed')

    // Should show pending status for missing data
    const missingPreferences = {}
    render(
      <ProgressTracker 
        preferences={missingPreferences} 
        onEditItem={mockOnEditItem}
        isCollapsed={false}
        onToggleCollapse={() => {}}
      />
    )

    const pendingItem = screen.getByTestId('progress-item-mealTypes')
    expect(pendingItem).toHaveAttribute('data-status', 'pending')
  })

  it('should make each item clickable to edit information', async () => {
    render(
      <ProgressTracker 
        preferences={mockPreferences} 
        onEditItem={mockOnEditItem}
        isCollapsed={false}
        onToggleCollapse={() => {}}
      />
    )

    const mealTypesButton = screen.getByRole('button', { name: /meal types/i })
    fireEvent.click(mealTypesButton)

    expect(mockOnEditItem).toHaveBeenCalledWith('mealTypes')
  })

  it('should integrate with green theme', async () => {
    render(
      <ProgressTracker 
        preferences={mockPreferences} 
        onEditItem={mockOnEditItem}
        isCollapsed={false}
        onToggleCollapse={() => {}}
      />
    )

    const tracker = screen.getByRole('complementary')
    expect(tracker).toHaveClass('bg-white', 'border-brand-200')
    
    // Check for green theme classes
    const completedItem = screen.getByTestId('progress-item-mealTypes')
    expect(completedItem.querySelector('.text-brand-600')).toBeInTheDocument()
  })

  it('should be responsive for mobile as bottom sheet', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    })

    render(
      <ProgressTracker 
        preferences={mockPreferences} 
        onEditItem={mockOnEditItem}
        isCollapsed={false}
        onToggleCollapse={() => {}}
        isMobile={true}
      />
    )

    const tracker = screen.getByRole('complementary')
    expect(tracker).toHaveClass('bottom-0', 'left-0', 'right-0')
  })

  it('should be collapsible', async () => {
    const mockOnToggleCollapse = vi.fn()
    
    render(
      <ProgressTracker 
        preferences={mockPreferences} 
        onEditItem={mockOnEditItem}
        isCollapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
      />
    )

    const collapseButton = screen.getByRole('button', { name: /collapse/i })
    fireEvent.click(collapseButton)

    expect(mockOnToggleCollapse).toHaveBeenCalled()
  })

  it('should show completion percentage', async () => {
    render(
      <ProgressTracker 
        preferences={mockPreferences} 
        onEditItem={mockOnEditItem}
        isCollapsed={false}
        onToggleCollapse={() => {}}
      />
    )

    // Should calculate and display completion percentage
    expect(screen.getByText(/100%/)).toBeInTheDocument() // All fields are filled
  })

  it('should show warning status for incomplete but started items', async () => {
    const incompletePreferences = {
      mealTypes: [{ type: 'dinner', days: [], adults: 2, kids: 0 }], // Started but incomplete
      diets: [],
    }

    render(
      <ProgressTracker 
        preferences={incompletePreferences} 
        onEditItem={mockOnEditItem}
        isCollapsed={false}
        onToggleCollapse={() => {}}
      />
    )

    const mealTypesItem = screen.getByTestId('progress-item-mealTypes')
    expect(mealTypesItem).toHaveAttribute('data-status', 'warning')
  })
})