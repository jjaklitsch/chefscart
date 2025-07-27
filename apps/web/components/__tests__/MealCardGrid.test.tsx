import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MealCardGrid from '../MealCardGrid'
import { Recipe } from '../../types'

// Mock recipe data for testing
const mockRecipes: Recipe[] = [
  {
    id: 'recipe-1',
    title: 'Test Pasta',
    description: 'Delicious pasta dish',
    ingredients: [{ name: 'Pasta', amount: 200, unit: 'g' }],
    instructions: ['Cook pasta'],
    nutrition: { calories: 450, protein: 15, carbs: 65, fat: 12, fiber: 4, sugar: 8 },
    estimatedCost: 8.50,
    cookTime: 25,
    prepTime: 10,
    servings: 4,
    difficulty: 'easy' as const,
    cuisine: 'Italian',
    tags: ['pasta']
  },
  {
    id: 'recipe-2',
    title: 'Test Salad',
    description: 'Fresh green salad',
    ingredients: [{ name: 'Lettuce', amount: 100, unit: 'g' }],
    instructions: ['Mix salad'],
    nutrition: { calories: 120, protein: 3, carbs: 15, fat: 2, fiber: 8, sugar: 5 },
    estimatedCost: 5.00,
    cookTime: 5,
    prepTime: 10,
    servings: 2,
    difficulty: 'easy' as const,
    cuisine: 'Mediterranean',
    tags: ['salad', 'healthy']
  }
]

describe('MealCardGrid', () => {
  it('renders meal cards for all recipes', () => {
    const onSelectionChange = vi.fn()

    render(
      <MealCardGrid
        recipes={mockRecipes}
        selectedRecipes={[]}
        onSelectionChange={onSelectionChange}
      />
    )

    expect(screen.getByText('Test Pasta')).toBeInTheDocument()
    expect(screen.getByText('Test Salad')).toBeInTheDocument()
  })

  it('displays selection status with correct messaging', () => {
    const onSelectionChange = vi.fn()

    render(
      <MealCardGrid
        recipes={mockRecipes}
        selectedRecipes={[]}
        onSelectionChange={onSelectionChange}
        minSelections={2}
        maxSelections={5}
      />
    )

    expect(screen.getByText(/Select 2-5 meals for your plan/)).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument() // selection counter
    expect(screen.getByText('of 5 selected')).toBeInTheDocument()
  })

  it('updates selection status when meals are selected', () => {
    const onSelectionChange = vi.fn()

    render(
      <MealCardGrid
        recipes={mockRecipes}
        selectedRecipes={[mockRecipes[0]]}
        onSelectionChange={onSelectionChange}
        minSelections={2}
        maxSelections={5}
      />
    )

    expect(screen.getByText(/Select 1 more meal/)).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument() // selection counter
  })

  it('shows completion state when minimum selections met', () => {
    const onSelectionChange = vi.fn()

    render(
      <MealCardGrid
        recipes={mockRecipes}
        selectedRecipes={mockRecipes}
        onSelectionChange={onSelectionChange}
        minSelections={2}
        maxSelections={5}
      />
    )

    expect(screen.getByText(/Perfect! You can add/)).toBeInTheDocument()
    expect(screen.getByText('Continue with 2 meals')).toBeInTheDocument()
  })

  it('handles selection changes correctly', () => {
    const onSelectionChange = vi.fn()

    const { rerender } = render(
      <MealCardGrid
        recipes={mockRecipes}
        selectedRecipes={[]}
        onSelectionChange={onSelectionChange}
      />
    )

    // Click on first recipe card
    const firstCard = screen.getAllByRole('button')[1] // Skip the status card button
    fireEvent.click(firstCard)

    expect(onSelectionChange).toHaveBeenCalledWith([mockRecipes[0]])

    // Rerender with the selected recipe
    rerender(
      <MealCardGrid
        recipes={mockRecipes}
        selectedRecipes={[mockRecipes[0]]}
        onSelectionChange={onSelectionChange}
      />
    )

    // Click on the same card to deselect
    fireEvent.click(firstCard)
    expect(onSelectionChange).toHaveBeenCalledWith([])
  })

  it('prevents selection when at maximum limit', () => {
    const onSelectionChange = vi.fn()

    render(
      <MealCardGrid
        recipes={mockRecipes}
        selectedRecipes={mockRecipes}
        onSelectionChange={onSelectionChange}
        minSelections={1}
        maxSelections={2}
      />
    )

    expect(screen.getByText(/Maximum reached/)).toBeInTheDocument()
  })

  it('displays loading state correctly', () => {
    const onSelectionChange = vi.fn()

    render(
      <MealCardGrid
        recipes={[]}
        selectedRecipes={[]}
        onSelectionChange={onSelectionChange}
        isLoading={true}
      />
    )

    expect(screen.getByText(/Generating your personalized meals/)).toBeInTheDocument()
    // Should show skeleton cards
    expect(screen.getAllByRole('generic')).toHaveLength(7) // 6 skeleton cards + container
  })

  it('shows empty state when no recipes', () => {
    const onSelectionChange = vi.fn()

    render(
      <MealCardGrid
        recipes={[]}
        selectedRecipes={[]}
        onSelectionChange={onSelectionChange}
        isLoading={false}
      />
    )

    expect(screen.getByText('No meals found')).toBeInTheDocument()
    expect(screen.getByText(/We couldn't generate meals/)).toBeInTheDocument()
  })

  it('calls onRequestMore when generate more button is clicked', () => {
    const onSelectionChange = vi.fn()
    const onRequestMore = vi.fn()

    render(
      <MealCardGrid
        recipes={mockRecipes}
        selectedRecipes={[]}
        onSelectionChange={onSelectionChange}
        onRequestMore={onRequestMore}
      />
    )

    const generateMoreButton = screen.getByText('Generate More Options')
    fireEvent.click(generateMoreButton)

    expect(onRequestMore).toHaveBeenCalled()
  })

  it('has proper accessibility attributes', () => {
    const onSelectionChange = vi.fn()

    render(
      <MealCardGrid
        recipes={mockRecipes}
        selectedRecipes={[]}
        onSelectionChange={onSelectionChange}
      />
    )

    // Check that meal cards have proper button roles and aria attributes
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-pressed')
    })
  })
})