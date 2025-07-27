import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MealPlanPreview from '@/components/MealPlanPreview'
import { MealPlan, Recipe } from '@/types'

// Mock data
const mockRecipe: Recipe = {
  id: 'recipe-1',
  title: 'Chicken Tikka Masala',
  description: 'Creamy Indian chicken curry with aromatic spices',
  ingredients: [
    { name: 'Chicken breast', amount: 2, unit: 'lbs' },
    { name: 'Coconut milk', amount: 1, unit: 'can' },
    { name: 'Tikka masala sauce', amount: 1, unit: 'jar' }
  ],
  instructions: ['Step 1', 'Step 2'],
  nutrition: {
    calories: 450,
    protein: 35,
    carbs: 20,
    fat: 25,
    fiber: 3,
    sugar: 8
  },
  estimatedCost: 18.50,
  cookTime: 30,
  prepTime: 15,
  servings: 4,
  difficulty: 'medium',
  cuisine: 'Indian',
  tags: ['curry', 'chicken']
}

const mockBackupRecipe: Recipe = {
  ...mockRecipe,
  id: 'backup-1',
  title: 'Beef Stir Fry',
  description: 'Quick and easy beef stir fry',
  cuisine: 'Asian',
  estimatedCost: 16.75
}

const mockMealPlan: MealPlan = {
  id: 'plan-1',
  userId: 'user-1',
  recipes: [mockRecipe],
  backupRecipes: [mockBackupRecipe],
  subtotalEstimate: 50.00,
  ingredientMatchPct: 85,
  status: 'draft',
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('MealPlanPreview Component', () => {
  const mockOnApprove = vi.fn()
  const mockOnBack = vi.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the meal plan title and description', () => {
      render(
        <MealPlanPreview
          mealPlan={mockMealPlan}
          onApprove={mockOnApprove}
          onBack={mockOnBack}
        />
      )

      expect(screen.getByText('Your Meal Plan')).toBeInTheDocument()
      expect(screen.getByText('Review and customize your recipes')).toBeInTheDocument()
    })

    it('should display summary statistics correctly', () => {
      render(
        <MealPlanPreview
          mealPlan={mockMealPlan}
          onApprove={mockOnApprove}
          onBack={mockOnBack}
        />
      )

      expect(screen.getByText('1')).toBeInTheDocument() // Recipe count
      expect(screen.getByText('$9 - $34')).toBeInTheDocument() // Cost range
      expect(screen.getByText('0h 45m')).toBeInTheDocument() // Total cook time
    })

    it('should render recipe cards with all details', () => {
      render(
        <MealPlanPreview
          mealPlan={mockMealPlan}
          onApprove={mockOnApprove}
          onBack={mockOnBack}
        />
      )

      expect(screen.getByText('Chicken Tikka Masala')).toBeInTheDocument()
      expect(screen.getByText('Creamy Indian chicken curry with aromatic spices')).toBeInTheDocument()
      expect(screen.getByText('45min')).toBeInTheDocument()
      expect(screen.getByText('4 servings')).toBeInTheDocument()
      expect(screen.getByText('$18.50')).toBeInTheDocument()
      expect(screen.getByText('medium')).toBeInTheDocument()
      expect(screen.getByText('Indian')).toBeInTheDocument()
    })

    it('should display nutrition information when available', () => {
      render(
        <MealPlanPreview
          mealPlan={mockMealPlan}
          onApprove={mockOnApprove}
          onBack={mockOnBack}
        />
      )

      expect(screen.getByText('430 - 480')).toBeInTheDocument() // Calorie range
      expect(screen.getByText('35g+')).toBeInTheDocument() // Protein
      expect(screen.getByText('20g+')).toBeInTheDocument() // Carbs
      expect(screen.getByText('25g+')).toBeInTheDocument() // Fat
    })

    it('should display ingredient preview', () => {
      render(
        <MealPlanPreview
          mealPlan={mockMealPlan}
          onApprove={mockOnApprove}
          onBack={mockOnBack}
        />
      )

      expect(screen.getByText('Key Ingredients:')).toBeInTheDocument()
      expect(screen.getByText('Chicken breast')).toBeInTheDocument()
      expect(screen.getByText('Coconut milk')).toBeInTheDocument()
      expect(screen.getByText('Tikka masala sauce')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should call onBack when back button is clicked', async () => {
      render(
        <MealPlanPreview
          mealPlan={mockMealPlan}
          onApprove={mockOnApprove}
          onBack={mockOnBack}
        />
      )

      const backButton = screen.getByText('Back to Preferences')
      await user.click(backButton)

      expect(mockOnBack).toHaveBeenCalledTimes(1)
    })

    it('should call onApprove when approve button is clicked', async () => {
      render(
        <MealPlanPreview
          mealPlan={mockMealPlan}
          onApprove={mockOnApprove}
          onBack={mockOnBack}
        />
      )

      const approveButton = screen.getByText('Build My Instacart Cart')
      await user.click(approveButton)

      expect(mockOnApprove).toHaveBeenCalledTimes(1)
    })

    it('should swap recipe when swap button is clicked', async () => {
      render(
        <MealPlanPreview
          mealPlan={mockMealPlan}
          onApprove={mockOnApprove}
          onBack={mockOnBack}
        />
      )

      const swapButton = screen.getByText('Swap Recipe')
      await user.click(swapButton)

      // Should replace with backup recipe
      await waitFor(() => {
        expect(screen.getByText('Beef Stir Fry')).toBeInTheDocument()
      })
    })

    it('should remove recipe when remove button is clicked', async () => {
      render(
        <MealPlanPreview
          mealPlan={mockMealPlan}
          onApprove={mockOnApprove}
          onBack={mockOnBack}
        />
      )

      const removeButton = screen.getByText('Remove')
      await user.click(removeButton)

      // Recipe should be removed
      await waitFor(() => {
        expect(screen.queryByText('Chicken Tikka Masala')).not.toBeInTheDocument()
      })
    })
  })

  describe('Swap Functionality', () => {
    it('should prevent swapping when max swaps reached', async () => {
      // Create a plan with multiple backup recipes
      const planWithManyBackups = {
        ...mockMealPlan,
        backupRecipes: Array.from({ length: 15 }, (_, i) => ({
          ...mockBackupRecipe,
          id: `backup-${i}`,
          title: `Recipe ${i}`
        }))
      }

      render(
        <MealPlanPreview
          mealPlan={planWithManyBackups}
          onApprove={mockOnApprove}
          onBack={mockOnBack}
        />
      )

      const swapButton = screen.getByText('Swap Recipe')

      // Perform maximum swaps (10)
      for (let i = 0; i < 10; i++) {
        await user.click(swapButton)
      }

      // Mock window.alert for the next test
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      // 11th swap should trigger alert
      await user.click(swapButton)
      expect(alertSpy).toHaveBeenCalledWith("You've reached the maximum of 10 swaps per plan.")

      alertSpy.mockRestore()
    })

    it('should disable swap button when no backup recipes available', () => {
      const planWithNoBackups = {
        ...mockMealPlan,
        backupRecipes: []
      }

      render(
        <MealPlanPreview
          mealPlan={planWithNoBackups}
          onApprove={mockOnApprove}
          onBack={mockOnBack}
        />
      )

      const swapButton = screen.getByText('Swap Recipe')
      expect(swapButton).toBeDisabled()
    })

    it('should show alert when no alternative recipes available', async () => {
      const planWithOneBackup = {
        ...mockMealPlan,
        backupRecipes: [mockBackupRecipe]
      }

      render(
        <MealPlanPreview
          mealPlan={planWithOneBackup}
          onApprove={mockOnApprove}
          onBack={mockOnBack}
        />
      )

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      const swapButton = screen.getByText('Swap Recipe')
      
      // First swap should work
      await user.click(swapButton)
      
      // Second swap should show alert
      await user.click(swapButton)
      expect(alertSpy).toHaveBeenCalledWith('No more alternative recipes available. Try modifying your preferences for more options.')

      alertSpy.mockRestore()
    })
  })

  describe('Cost Calculations', () => {
    it('should calculate total cost correctly', () => {
      const multiRecipePlan = {
        ...mockMealPlan,
        recipes: [
          { ...mockRecipe, estimatedCost: 20.00 },
          { ...mockRecipe, id: 'recipe-2', estimatedCost: 15.50 }
        ]
      }

      render(
        <MealPlanPreview
          mealPlan={multiRecipePlan}
          onApprove={mockOnApprove}
          onBack={mockOnBack}
        />
      )

      // Total: 35.50, Range: 25.50 - 50.50
      expect(screen.getByText('$26 - $51')).toBeInTheDocument()
    })

    it('should handle zero cost gracefully', () => {
      const planWithZeroCost = {
        ...mockMealPlan,
        recipes: [{ ...mockRecipe, estimatedCost: 5.00 }]
      }

      render(
        <MealPlanPreview
          mealPlan={planWithZeroCost}
          onApprove={mockOnApprove}
          onBack={mockOnBack}
        />
      )

      // Should not show negative minimum
      expect(screen.getByText('$0 - $20')).toBeInTheDocument()
    })
  })

  describe('Cook Time Calculations', () => {
    it('should calculate total cook time correctly', () => {
      const multiRecipePlan = {
        ...mockMealPlan,
        recipes: [
          { ...mockRecipe, prepTime: 15, cookTime: 30 }, // 45 min
          { ...mockRecipe, id: 'recipe-2', prepTime: 10, cookTime: 20 } // 30 min
        ]
      }

      render(
        <MealPlanPreview
          mealPlan={multiRecipePlan}
          onApprove={mockOnApprove}
          onBack={mockOnBack}
        />
      )

      // Total: 75 minutes = 1h 15m
      expect(screen.getByText('1h 15m')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <MealPlanPreview
          mealPlan={mockMealPlan}
          onApprove={mockOnApprove}
          onBack={mockOnBack}
        />
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)

      const backButton = screen.getByText('Back to Preferences')
      expect(backButton).toBeInTheDocument()
    })

    it('should handle keyboard navigation', async () => {
      render(
        <MealPlanPreview
          mealPlan={mockMealPlan}
          onApprove={mockOnApprove}
          onBack={mockOnBack}
        />
      )

      const swapButton = screen.getByText('Swap Recipe')
      swapButton.focus()
      
      fireEvent.keyDown(swapButton, { key: 'Enter' })
      
      await waitFor(() => {
        expect(screen.getByText('Beef Stir Fry')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty meal plan gracefully', () => {
      const emptyPlan = {
        ...mockMealPlan,
        recipes: []
      }

      render(
        <MealPlanPreview
          mealPlan={emptyPlan}
          onApprove={mockOnApprove}
          onBack={mockOnBack}
        />
      )

      expect(screen.getByText('0')).toBeInTheDocument() // Recipe count
      expect(screen.getByText('$0 - $15')).toBeInTheDocument() // Cost range
      expect(screen.getByText('0h 0m')).toBeInTheDocument() // Cook time
    })

    it('should handle missing nutrition data', () => {
      const recipeWithoutNutrition = {
        ...mockRecipe,
        nutrition: undefined
      }
      
      const planWithoutNutrition = {
        ...mockMealPlan,
        recipes: [recipeWithoutNutrition]
      }

      render(
        <MealPlanPreview
          mealPlan={planWithoutNutrition}
          onApprove={mockOnApprove}
          onBack={mockOnBack}
        />
      )

      // Should not crash and should still render recipe
      expect(screen.getByText('Chicken Tikka Masala')).toBeInTheDocument()
    })

    it('should handle recipes with many ingredients', () => {
      const recipeWithManyIngredients = {
        ...mockRecipe,
        ingredients: Array.from({ length: 10 }, (_, i) => ({
          name: `Ingredient ${i + 1}`,
          amount: 1,
          unit: 'unit'
        }))
      }

      const planWithManyIngredients = {
        ...mockMealPlan,
        recipes: [recipeWithManyIngredients]
      }

      render(
        <MealPlanPreview
          mealPlan={planWithManyIngredients}
          onApprove={mockOnApprove}
          onBack={mockOnBack}
        />
      )

      // Should show first 6 ingredients and "+4 more"
      expect(screen.getByText('Ingredient 1')).toBeInTheDocument()
      expect(screen.getByText('Ingredient 6')).toBeInTheDocument()
      expect(screen.getByText('+4 more')).toBeInTheDocument()
    })
  })
})