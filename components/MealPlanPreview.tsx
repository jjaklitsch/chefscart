"use client"

import { useState } from 'react'
import { Clock, Users, DollarSign, ChefHat, ArrowLeft, ShoppingCart } from 'lucide-react'
import { MealPlan, Recipe } from '../types'

interface MealPlanPreviewProps {
  mealPlan: MealPlan
  onApprove: () => void
  onBack: () => void
}

export default function MealPlanPreview({ mealPlan, onApprove, onBack }: MealPlanPreviewProps) {
  const [selectedRecipes, setSelectedRecipes] = useState<Recipe[]>(mealPlan.recipes)
  const [swapCount, setSwapCount] = useState(0)
  const maxSwaps = 10

  const handleSwapRecipe = (recipeToReplace: Recipe) => {
    if (swapCount >= maxSwaps) {
      alert(`You've reached the maximum of ${maxSwaps} swaps per plan.`)
      return
    }

    // Find an unused backup recipe
    const usedRecipeIds = selectedRecipes.map(r => r.id)
    const availableBackup = mealPlan.backupRecipes.find(backup => 
      !usedRecipeIds.includes(backup.id)
    )

    if (!availableBackup) {
      alert('No more alternative recipes available. Try modifying your preferences for more options.')
      return
    }

    // Replace the recipe
    setSelectedRecipes(prev => 
      prev.map(recipe => 
        recipe.id === recipeToReplace.id ? availableBackup : recipe
      )
    )
    setSwapCount(prev => prev + 1)
  }

  const handleRemoveRecipe = (recipeToRemove: Recipe) => {
    setSelectedRecipes(prev => prev.filter(recipe => recipe.id !== recipeToRemove.id))
  }

  const totalCost = selectedRecipes.reduce((sum, recipe) => sum + (recipe.estimatedCost || 0), 0)
  const totalCookTime = selectedRecipes.reduce((sum, recipe) => sum + (recipe.cookTime || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-orange-600 hover:text-orange-700 mr-6"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Preferences
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Meal Plan</h1>
            <p className="text-gray-600">Review and customize your recipes</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="bg-orange-100 rounded-full p-3 mr-4">
                <ChefHat className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Recipes</p>
                <p className="text-2xl font-bold text-gray-900">{selectedRecipes.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-full p-3 mr-4">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Est. Cost Range</p>
                <p className="text-2xl font-bold text-gray-900">${Math.max(totalCost - 10, 0).toFixed(0)} - ${(totalCost + 15).toFixed(0)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-full p-3 mr-4">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Cook Time</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(totalCookTime/60)}h {totalCookTime%60}m</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recipe Cards */}
        <div className="space-y-8 mb-12">
          {selectedRecipes.map((recipe, index) => (
            <div key={recipe.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">{recipe.title}</h3>
                    <p className="text-gray-600 mb-4 text-lg leading-relaxed">{recipe.description}</p>
                    <div className="flex flex-wrap gap-6 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {recipe.prepTime + recipe.cookTime}min
                      </span>
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {recipe.servings} servings
                      </span>
                      <span className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        ${recipe.estimatedCost?.toFixed(2)}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                        {recipe.difficulty}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {recipe.cuisine}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 ml-6">
                    <button
                      onClick={() => handleSwapRecipe(recipe)}
                      disabled={swapCount >= maxSwaps || mealPlan.backupRecipes.length === 0}
                      className="px-4 py-2 text-sm font-medium bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Swap Recipe
                    </button>
                    <button
                      onClick={() => handleRemoveRecipe(recipe)}
                      className="px-4 py-2 text-sm font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Nutrition Info */}
                {recipe.nutrition && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl mt-4">
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Calories</p>
                      <p className="text-lg font-bold text-gray-900">{recipe.nutrition.calories - 20} - {recipe.nutrition.calories + 30}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Protein</p>
                      <p className="text-lg font-bold text-gray-900">{recipe.nutrition.protein}g+</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Carbs</p>
                      <p className="text-lg font-bold text-gray-900">{recipe.nutrition.carbs}g+</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Fat</p>
                      <p className="text-lg font-bold text-gray-900">{recipe.nutrition.fat}g+</p>
                    </div>
                  </div>
                )}

                {/* Ingredients Preview */}
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 mb-3 text-lg">Key Ingredients:</h4>
                  <div className="flex flex-wrap gap-3">
                    {recipe.ingredients?.slice(0, 6).map((ingredient, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-2 bg-green-100 text-green-800 text-sm rounded-lg font-medium"
                      >
                        {ingredient.name}
                      </span>
                    ))}
                    {recipe.ingredients && recipe.ingredients.length > 6 && (
                      <span className="px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg font-medium">
                        +{recipe.ingredients.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <button
            onClick={onApprove}
            className="flex items-center justify-center px-10 py-4 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
          >
            <ShoppingCart className="h-6 w-6 mr-3" />
            Build My Instacart Cart
          </button>
          <button
            onClick={onBack}
            className="px-10 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 border border-gray-300 text-lg"
          >
            Modify Preferences
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-12 p-6 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800 leading-relaxed">
            <strong>Note:</strong> Prices and availability may vary in Instacart. 
            Ingredient costs are estimated ranges and may differ based on store location and brand preferences.
          </p>
        </div>
      </div>
    </div>
  )
}