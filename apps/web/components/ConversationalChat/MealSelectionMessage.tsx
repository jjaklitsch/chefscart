"use client"

import React, { useState, useEffect } from 'react'
import { Bot, CheckCircle } from 'lucide-react'
import MealCardGrid from '../MealCardGrid'
import { Recipe, MealCardSelectionState } from '../../types'

interface MealSelectionMessageProps {
  id: string
  recipes: Recipe[]
  onSelectionComplete: (selectedRecipes: Recipe[]) => void
  isLoading?: boolean
  timestamp?: Date
  minSelections?: number
  maxSelections?: number
}

export default function MealSelectionMessage({
  recipes,
  onSelectionComplete,
  isLoading = false,
  timestamp,
  minSelections = 3,
  maxSelections = 7
}: MealSelectionMessageProps) {
  const [selectionState, setSelectionState] = useState<MealCardSelectionState>({
    selectedMeals: [],
    availableMeals: recipes,
    minSelections,
    maxSelections,
    isLoading
  })

  const [hasUserInteracted, setHasUserInteracted] = useState(false)

  useEffect(() => {
    setSelectionState(prev => ({
      ...prev,
      availableMeals: recipes,
      isLoading
    }))
  }, [recipes, isLoading])

  const handleSelectionChange = (selectedRecipes: Recipe[]) => {
    setHasUserInteracted(true)
    setSelectionState(prev => ({
      ...prev,
      selectedMeals: selectedRecipes
    }))

    // Auto-advance if user has selected the minimum required
    if (selectedRecipes.length >= minSelections) {
      // Small delay to show the selection before advancing
      setTimeout(() => {
        onSelectionComplete(selectedRecipes)
      }, 800)
    }
  }

  const handleRequestMore = async () => {
    // This would trigger a new meal generation request
    // For now, we'll just indicate loading state
    setSelectionState(prev => ({ ...prev, isLoading: true }))
    
    try {
      // Call API to generate more meals with same preferences
      const response = await fetch('/api/generate-mealplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          regenerate: true,
          excludeIds: recipes.map(r => r.id)
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setSelectionState(prev => ({
          ...prev,
          availableMeals: [...prev.availableMeals, ...data.recipes],
          isLoading: false
        }))
      }
    } catch (error) {
      console.error('Error generating more meals:', error)
      setSelectionState(prev => ({ ...prev, isLoading: false }))
    }
  }

  const isComplete = selectionState.selectedMeals.length >= minSelections

  return (
    <div className="group flex items-start gap-3 mb-8 animate-fade-in">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-brand-100 to-sage-100 text-brand-700 border-2 border-brand-200">
        <Bot className="w-4 h-4" aria-hidden="true" />
      </div>

      {/* Message Content */}
      <div className="flex flex-col max-w-full w-full">
        {/* Introduction Message */}
        <div className="bg-white border border-brand-100 text-gray-900 rounded-2xl rounded-bl-lg px-4 py-3 shadow-sm mb-4 max-w-[80%]">
          <p className="text-sm leading-relaxed">
            Great! I&apos;ve created personalized meal options based on your preferences. 
            Please select {minSelections}-{maxSelections} meals you&apos;d like to include in your plan:
          </p>
        </div>

        {/* Meal Selection Grid */}
        <div className="w-full">
          <MealCardGrid
            recipes={selectionState.availableMeals}
            selectedRecipes={selectionState.selectedMeals}
            onSelectionChange={handleSelectionChange}
            minSelections={minSelections}
            maxSelections={maxSelections}
            isLoading={selectionState.isLoading}
            onRequestMore={handleRequestMore}
          />
        </div>

        {/* Completion Indicator */}
        {isComplete && hasUserInteracted && (
          <div className="mt-4 max-w-[80%]">
            <div className="bg-sage-50 border border-sage-200 text-sage-800 rounded-2xl rounded-bl-lg px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-sage-600" />
                <p className="text-sm leading-relaxed">
                  Perfect! I have your {selectionState.selectedMeals.length} selected meals. 
                  Let me create your shopping cart...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Timestamp */}
        {timestamp && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500 px-1">
              {timestamp.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}