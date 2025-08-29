"use client"

import React from 'react'
import { ChefHat } from 'lucide-react'

interface RecipeInstructionsProps {
  instructions: Array<{ text: string; step_no?: number; time_min?: number } | string>
  title: string
}

const RecipeInstructions: React.FC<RecipeInstructionsProps> = ({
  instructions,
  title
}) => {


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

  // Extract text from instruction objects and filter out invalid instructions
  const validInstructions = instructions
    .map(instruction => {
      if (typeof instruction === 'string') return instruction
      if (typeof instruction === 'object' && instruction?.text) return instruction.text
      return null
    })
    .filter((text): text is string => typeof text === 'string' && text.length > 0)

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-50 to-orange-50 px-6 py-4 border-b border-brand-200">
        <h2 className="text-xl font-display font-bold text-neutral-800 flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-brand-600" />
          Cooking Instructions
        </h2>
        <p className="text-sm text-brand-700 mt-1">
          {validInstructions.length} step{validInstructions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Instructions List */}
      <div className="p-6">
        {validInstructions.length > 0 ? (
          <div className="space-y-4">
            {validInstructions.map((instruction, index) => (
              <div
                key={index}
                className="bg-white border border-neutral-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-sm transition-all duration-200"
              >
                <div className="flex gap-4">
                  {/* Step Number */}
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <p 
                      className="text-base leading-relaxed text-neutral-800"
                      dangerouslySetInnerHTML={{ 
                        __html: highlightKeywords(instruction) 
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