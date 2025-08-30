import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MealCard from '../MealCard'
import { Recipe } from '../../types'

// Mock recipe data for testing
const mockRecipe: Recipe = {
  id: 'test-recipe-1',
  title: 'Delicious Test Pasta',
  description: 'A mouth-watering pasta dish perfect for testing our meal card component.',
  ingredients: [
    { name: 'Pasta', amount: 200, unit: 'g' },
    { name: 'Tomatoes', amount: 3, unit: 'pcs' },
    { name: 'Garlic', amount: 2, unit: 'cloves' }
  ],
  instructions: [
    'Boil water for pasta',
    'Cook pasta until al dente',
    'Prepare sauce with tomatoes and garlic'
  ],
  nutrition: {
    calories: 450,
    protein: 15,
    carbs: 65,
    fat: 12,
    fiber: 4,
    sugar: 8
  },
  estimatedCost: 8.50,
  cookTime: 25,
  prepTime: 10,
  servings: 4,
  difficulty: 'easy' as const,
  cuisine: 'Italian',
  tags: ['pasta', 'vegetarian', 'quick'],
  imageUrl: 'https://example.com/pasta-image.jpg'
}

describe('MealCard', () => {
  it('renders meal card with recipe information', () => {
    const onSelect = vi.fn()
    const onDeselect = vi.fn()

    render(
      <MealCard
        recipe={mockRecipe}
        isSelected={false}
        onSelect={onSelect}
        onDeselect={onDeselect}
      />
    )

    // Check that recipe information is displayed
    expect(screen.getByText('Delicious Test Pasta')).toBeInTheDocument()
    expect(screen.getByText('A mouth-watering pasta dish perfect for testing our meal card component.')).toBeInTheDocument()
    expect(screen.getByText('10m prep + 25m cook')).toBeInTheDocument() // separate prep and cook time
    expect(screen.getByText('4 servings')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument() // rounded estimatedCost (without $ symbol)
    expect(screen.getByText('easy')).toBeInTheDocument()
    expect(screen.getByText('Italian')).toBeInTheDocument()
  })

  it('displays nutrition information when showNutrition is true', () => {
    const onSelect = vi.fn()
    const onDeselect = vi.fn()

    render(
      <MealCard
        recipe={mockRecipe}
        isSelected={false}
        onSelect={onSelect}
        onDeselect={onDeselect}
        showNutrition={true}
      />
    )

    expect(screen.getByText('450')).toBeInTheDocument() // calories
    expect(screen.getByText('15g')).toBeInTheDocument() // protein
    expect(screen.getByText('65g')).toBeInTheDocument() // carbs
    expect(screen.getByText('12g')).toBeInTheDocument() // fat
  })

  it('displays key ingredients when showIngredients is true', () => {
    const onSelect = vi.fn()
    const onDeselect = vi.fn()

    render(
      <MealCard
        recipe={mockRecipe}
        isSelected={false}
        onSelect={onSelect}
        onDeselect={onDeselect}
        showIngredients={true}
      />
    )

    expect(screen.getByText('Pasta')).toBeInTheDocument()
    expect(screen.getByText('Tomatoes')).toBeInTheDocument()
    expect(screen.getByText('Garlic')).toBeInTheDocument()
  })

  it('calls onSelect when clicked and not selected', () => {
    const onSelect = vi.fn()
    const onDeselect = vi.fn()

    render(
      <MealCard
        recipe={mockRecipe}
        isSelected={false}
        onSelect={onSelect}
        onDeselect={onDeselect}
      />
    )

    const card = screen.getByRole('button')
    fireEvent.click(card)

    expect(onSelect).toHaveBeenCalledWith(mockRecipe)
    expect(onDeselect).not.toHaveBeenCalled()
  })

  it('calls onDeselect when clicked and already selected', () => {
    const onSelect = vi.fn()
    const onDeselect = vi.fn()

    render(
      <MealCard
        recipe={mockRecipe}
        isSelected={true}
        onSelect={onSelect}
        onDeselect={onDeselect}
      />
    )

    const card = screen.getByRole('button')
    fireEvent.click(card)

    expect(onDeselect).toHaveBeenCalledWith(mockRecipe)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('shows selection indicator when selected', () => {
    const onSelect = vi.fn()
    const onDeselect = vi.fn()

    render(
      <MealCard
        recipe={mockRecipe}
        isSelected={true}
        onSelect={onSelect}
        onDeselect={onDeselect}
      />
    )

    const card = screen.getByRole('button')
    expect(card).toHaveAttribute('aria-pressed', 'true')
  })

  it('supports keyboard navigation', () => {
    const onSelect = vi.fn()
    const onDeselect = vi.fn()

    render(
      <MealCard
        recipe={mockRecipe}
        isSelected={false}
        onSelect={onSelect}
        onDeselect={onDeselect}
      />
    )

    const card = screen.getByRole('button')
    
    // Test Enter key
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith(mockRecipe)
    
    // Test Space key
    fireEvent.keyDown(card, { key: ' ' })
    expect(onSelect).toHaveBeenCalledTimes(2)
  })

  it('handles missing optional data gracefully', () => {
    const minimalRecipe: Recipe = {
      ...mockRecipe,
      nutrition: undefined as any,
      ingredients: []
      // imageUrl omitted (optional property)
    }

    const onSelect = vi.fn()
    const onDeselect = vi.fn()

    render(
      <MealCard
        recipe={minimalRecipe}
        isSelected={false}
        onSelect={onSelect}
        onDeselect={onDeselect}
      />
    )

    // Should still render basic information
    expect(screen.getByText('Delicious Test Pasta')).toBeInTheDocument()
    expect(screen.getByText('10m prep + 25m cook')).toBeInTheDocument() // separate prep and cook time
  })
})