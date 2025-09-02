"use client"

import React from 'react'
import { ShoppingCart } from 'lucide-react'
import { toTitleCase } from '../utils/textUtils'

interface Ingredient {
  name: string
  quantity: number
  unit?: string
  category?: string
  health_filters?: string[]
  brand_filters?: string[]
  scales_with_servings?: boolean
  // Legacy support for old schema
  display_name?: string
  shoppable_name?: string
  amount?: number
}

interface RecipeIngredientsProps {
  ingredients: Ingredient[]
  originalServings: number
  adjustedServings: number
  // When true, ingredients are already scaled from API
  preScaled?: boolean
}

const RecipeIngredients: React.FC<RecipeIngredientsProps> = ({
  ingredients,
  originalServings,
  adjustedServings,
  preScaled = false
}) => {
  const scalingFactor = adjustedServings / originalServings

  const scaleAmount = (ingredient: Ingredient) => {
    const amount = ingredient.quantity || ingredient.amount || 0
    if (!amount) return null
    
    // If ingredients are pre-scaled from API, use them directly
    if (preScaled) {
      return amount
    }
    
    // Check if this ingredient should scale with servings
    const shouldScale = ingredient.scales_with_servings !== false // default to true for legacy support
    
    if (!shouldScale) {
      return amount // Don't scale (e.g., "1 lemon" stays "1 lemon" regardless of servings)
    }
    
    // Otherwise apply scaling
    const scaled = amount * scalingFactor
    // Round to reasonable precision
    if (scaled < 0.1) return Math.round(scaled * 100) / 100
    if (scaled < 1) return Math.round(scaled * 10) / 10
    if (scaled < 10) return Math.round(scaled * 4) / 4 // Quarter precision
    return Math.round(scaled)
  }

  const formatAmount = (ingredient: Ingredient) => {
    const scaledAmount = scaleAmount(ingredient)
    if (!scaledAmount) return ''
    
    let formattedAmount: string
    
    // If pre-scaled, the API already formatted fractions
    if (preScaled && typeof scaledAmount === 'string') {
      formattedAmount = scaledAmount
    } else {
      formattedAmount = scaledAmount.toString()
      
      // Convert decimal amounts to fractions where appropriate
      if (scaledAmount === 0.25) formattedAmount = '¼'
      else if (scaledAmount === 0.33) formattedAmount = '⅓'
      else if (scaledAmount === 0.5) formattedAmount = '½'
      else if (scaledAmount === 0.67) formattedAmount = '⅔'
      else if (scaledAmount === 0.75) formattedAmount = '¾'
      else if (scaledAmount % 1 === 0.25) formattedAmount = `${Math.floor(scaledAmount)} ¼`
      else if (scaledAmount % 1 === 0.33) formattedAmount = `${Math.floor(scaledAmount)} ⅓`
      else if (scaledAmount % 1 === 0.5) formattedAmount = `${Math.floor(scaledAmount)} ½`
      else if (scaledAmount % 1 === 0.67) formattedAmount = `${Math.floor(scaledAmount)} ⅔`
      else if (scaledAmount % 1 === 0.75) formattedAmount = `${Math.floor(scaledAmount)} ¾`
    }
    
    return ingredient.unit ? `${formattedAmount} ${ingredient.unit}` : formattedAmount
  }


  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
      {/* Compact Header */}
      <div className="px-4 py-3 border-b border-neutral-200">
        <h2 className="text-lg font-semibold text-neutral-800 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-neutral-600" />
          Ingredients ({ingredients.length})
        </h2>
      </div>

      {/* Compact Ingredients Grid */}
      <div className="p-4">
        {ingredients.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {ingredients.map((ingredient, idx) => (
              <div 
                key={idx} 
                className="flex items-center py-2 text-sm"
              >
                <span className="text-neutral-700 flex-1 pr-3">
                  {toTitleCase(ingredient.name || ingredient.shoppable_name || ingredient.display_name || 'Unknown ingredient')}
                </span>
                <span className="font-medium text-neutral-900 whitespace-nowrap">
                  {formatAmount(ingredient)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <ShoppingCart className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
            <p className="text-neutral-600 text-sm">No ingredients listed for this recipe</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default RecipeIngredients