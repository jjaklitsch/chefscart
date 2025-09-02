"use client"

import React from 'react'
import { ChefHat } from 'lucide-react'

interface Ingredient {
  name: string
  cooking_quantity: number
  cooking_unit: string
  scales_with_servings: boolean
}

interface InstructionStep {
  step: number
  instruction: string
  time_minutes: number
  dynamic_ingredients?: string[]
}

interface RecipeInstructionsProps {
  instructions: InstructionStep[]
  ingredients: Ingredient[]
  originalServings: number
  adjustedServings: number
  title: string
}

const RecipeInstructions: React.FC<RecipeInstructionsProps> = ({
  instructions,
  ingredients,
  originalServings,
  adjustedServings,
  title
}) => {
  const scalingFactor = adjustedServings / originalServings
  
  // Helper function to format ingredient amounts nicely
  const formatIngredientAmount = (quantity: number, unit: string): string => {
    // Handle fractional displays
    if (quantity < 1 && quantity > 0) {
      // Convert decimals to fractions for common cooking amounts
      const fractions: { [key: number]: string } = {
        0.125: '1/8',
        0.25: '1/4', 
        0.33: '1/3',
        0.5: '1/2',
        0.67: '2/3',
        0.75: '3/4'
      };
      
      const rounded = Math.round(quantity * 100) / 100;
      for (const [decimal, fraction] of Object.entries(fractions)) {
        if (Math.abs(rounded - Number(decimal)) < 0.02) {
          return fraction;
        }
      }
    }

    // Round to reasonable precision
    if (quantity < 10) {
      return (Math.round(quantity * 10) / 10).toString();
    }
    
    return Math.round(quantity).toString();
  }
  
  // Process instructions with dynamic ingredient scaling
  const processInstruction = (instruction: string, dynamicIngredients: string[] = []) => {
    let processed = instruction
    
    // Replace ingredient placeholders with scaled amounts
    dynamicIngredients.forEach((ingredientName: string) => {
      const ingredient = ingredients.find(ing => ing.name.toLowerCase() === ingredientName.toLowerCase())
      if (ingredient) {
        // Scale the cooking quantity
        const scaledQuantity = ingredient.scales_with_servings 
          ? ingredient.cooking_quantity * scalingFactor
          : ingredient.cooking_quantity
        
        const amountText = formatIngredientAmount(scaledQuantity, ingredient.cooking_unit)
        const fullAmount = `${amountText} ${ingredient.cooking_unit}`
        
        const placeholder = `{${ingredientName}}`
        processed = processed.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
          fullAmount
        )
      }
    })
    
    // Remove any remaining equipment or unmatched placeholders
    processed = processed.replace(/\{[^}]*\}/g, '')
    
    return processed
  }


  const highlightKeywords = (instruction: string) => {
    if (typeof instruction !== 'string') return instruction
    const keywords = [
      // Time keywords
      /(\d+\s*(?:minutes?|mins?|hours?|hrs?))/gi,
      // Temperature keywords  
      /(\d+°[CF]|\d+\s*degrees?)/gi,
      // Cooking actions
      /(preheat|heat|boil|simmer|sauté|fry|bake|roast|grill|season|mix|stir|whisk|fold|add|combine|serve)/gi
    ]

    let highlighted = instruction
    keywords.forEach((regex) => {
      highlighted = highlighted.replace(regex, '<strong class="text-brand-700 font-semibold">$1</strong>')
    })
    
    return highlighted
  }

  // Process all instructions with dynamic scaling
  const processedInstructions = instructions.map(step => ({
    ...step,
    processed_instruction: processInstruction(step.instruction, step.dynamic_ingredients)
  }))

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-50 to-orange-50 px-6 py-4 border-b border-brand-200">
        <h2 className="text-xl font-display font-bold text-neutral-800 flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-brand-600" />
          Cooking Instructions
        </h2>
        <p className="text-sm text-brand-700 mt-1">
          {processedInstructions.length} step{processedInstructions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Instructions List */}
      <div className="p-6">
        {processedInstructions.length > 0 ? (
          <div className="space-y-4">
            {processedInstructions.map((step, index) => (
              <div
                key={step.step}
                className="bg-white border border-neutral-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-sm transition-all duration-200"
              >
                <div className="flex gap-4">
                  {/* Step Number */}
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold">
                      {step.step}
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <p 
                      className="text-base leading-relaxed text-neutral-800"
                      dangerouslySetInnerHTML={{ 
                        __html: highlightKeywords(step.processed_instruction) 
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ChefHat className="w-6 h-6 text-neutral-400" />
            </div>
            <p className="text-neutral-600">No cooking instructions available for this recipe</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default RecipeInstructions