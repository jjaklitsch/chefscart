"use client"

import React, { useState, useEffect } from 'react'
import { Loader2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import MealCard from './MealCard'
import { MealCardGridProps, Recipe } from '../types'

const MealCardGrid: React.FC<MealCardGridProps> = ({
  recipes,
  selectedRecipes,
  onSelectionChange,
  minSelections = 3,
  maxSelections = 7,
  isLoading = false,
  onRequestMore
}) => {
  const [localSelectedRecipes, setLocalSelectedRecipes] = useState<Recipe[]>(selectedRecipes)

  useEffect(() => {
    setLocalSelectedRecipes(selectedRecipes)
  }, [selectedRecipes])

  const handleRecipeSelect = (recipe: Recipe) => {
    if (localSelectedRecipes.length >= maxSelections) {
      return // Prevent selection if at max
    }
    
    const newSelection = [...localSelectedRecipes, recipe]
    setLocalSelectedRecipes(newSelection)
    onSelectionChange(newSelection)
  }

  const handleRecipeDeselect = (recipe: Recipe) => {
    const newSelection = localSelectedRecipes.filter(r => r.id !== recipe.id)
    setLocalSelectedRecipes(newSelection)
    onSelectionChange(newSelection)
  }

  const isRecipeSelected = (recipe: Recipe) => {
    return localSelectedRecipes.some(selected => selected.id === recipe.id)
  }

  const selectionCount = localSelectedRecipes.length
  const hasMinimumSelections = selectionCount >= minSelections
  const hasMaximumSelections = selectionCount >= maxSelections

  const getSelectionStatusMessage = () => {
    if (selectionCount === 0) {
      return `Select ${minSelections}-${maxSelections} meals for your plan`
    } else if (selectionCount < minSelections) {
      const remaining = minSelections - selectionCount
      return `Select ${remaining} more meal${remaining === 1 ? '' : 's'} (minimum ${minSelections})`
    } else if (selectionCount >= minSelections && selectionCount < maxSelections) {
      const remaining = maxSelections - selectionCount
      return `Perfect! You can add ${remaining} more meal${remaining === 1 ? '' : 's'} if you&apos;d like`
    } else {
      return `Maximum reached! You&apos;ve selected ${selectionCount} meals`
    }
  }

  const getSelectionStatusColor = () => {
    if (selectionCount === 0) return 'text-neutral-600'
    if (selectionCount < minSelections) return 'text-brand-600'
    if (hasMinimumSelections && !hasMaximumSelections) return 'text-sage-600'
    return 'text-success-600'
  }

  const getSelectionStatusIcon = () => {
    if (selectionCount === 0) return null
    if (selectionCount < minSelections) return <AlertCircle className="w-4 h-4" />
    return <CheckCircle className="w-4 h-4" />
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading Header */}
        <div className="text-center py-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
            <p className="text-lg font-medium text-neutral-700">
              Generating your personalized meals...
            </p>
          </div>
          <p className="text-sm text-neutral-500">
            This may take a moment while we create recipes just for you
          </p>
        </div>

        {/* Loading Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-soft border border-neutral-200 overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-neutral-100 to-neutral-200 animate-pulse" />
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <div className="h-6 bg-neutral-200 rounded animate-pulse" />
                  <div className="h-4 bg-neutral-200 rounded w-3/4 animate-pulse" />
                </div>
                <div className="flex justify-between">
                  <div className="h-4 bg-neutral-200 rounded w-16 animate-pulse" />
                  <div className="h-4 bg-neutral-200 rounded w-16 animate-pulse" />
                  <div className="h-4 bg-neutral-200 rounded w-16 animate-pulse" />
                </div>
                <div className="h-12 bg-neutral-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!recipes || recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-medium text-neutral-800 mb-2">
          No meals found
        </h3>
        <p className="text-neutral-600 mb-6">
          We couldn&apos;t generate meals matching your preferences. Let&apos;s try adjusting your requirements.
        </p>
        {onRequestMore && (
          <button
            onClick={onRequestMore}
            className="btn-primary inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Different Options
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Selection Status Header */}
      <div className="bg-gradient-to-r from-sage-50 to-cream-50 rounded-xl p-6 border border-sage-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {getSelectionStatusIcon()}
            <div>
              <h3 className="text-lg font-display font-bold text-neutral-800">
                Your Meal Selection
              </h3>
              <p className={`text-sm font-medium ${getSelectionStatusColor()}`}>
                {getSelectionStatusMessage()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Selection Counter */}
            <div className="text-center">
              <div className={`
                text-2xl font-bold 
                ${hasMinimumSelections ? 'text-sage-600' : 'text-neutral-600'}
              `}>
                {selectionCount}
              </div>
              <div className="text-xs text-neutral-500 font-medium">
                of {maxSelections} selected
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-24 h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div 
                className={`
                  h-full transition-all duration-300 rounded-full
                  ${hasMinimumSelections ? 'bg-sage-500' : 'bg-brand-500'}
                `}
                style={{ 
                  width: `${Math.min((selectionCount / maxSelections) * 100, 100)}%` 
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Meal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.map((recipe) => (
          <MealCard
            key={recipe.id}
            recipe={recipe}
            isSelected={isRecipeSelected(recipe)}
            onSelect={handleRecipeSelect}
            onDeselect={handleRecipeDeselect}
            showNutrition={true}
            showIngredients={true}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6 border-t border-neutral-200">
        {onRequestMore && (
          <button
            onClick={onRequestMore}
            className="btn-secondary inline-flex items-center gap-2"
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4" />
            Generate More Options
          </button>
        )}
        
        {hasMinimumSelections && (
          <button
            className="btn-primary inline-flex items-center gap-2 px-8"
            onClick={() => {
              // This will be handled by the parent component
              // The button is just for visual feedback
            }}
          >
            <CheckCircle className="w-5 h-5" />
            Continue with {selectionCount} meals
          </button>
        )}
      </div>

      {/* Helper Text */}
      <div className="text-center">
        <p className="text-xs text-neutral-500 leading-relaxed">
          You can always modify your selections or generate new options. 
          The meals you choose will be used to create your shopping cart.
        </p>
      </div>
    </div>
  )
}

export default MealCardGrid