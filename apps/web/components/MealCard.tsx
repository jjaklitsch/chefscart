"use client"

import React from 'react'
import { Clock, Users, DollarSign, ChefHat, Check } from 'lucide-react'
import { MealCardProps } from '../types'

const MealCard: React.FC<MealCardProps> = ({
  recipe,
  isSelected,
  onSelect,
  onDeselect,
  showNutrition = true,
  showIngredients = true
}) => {
  const handleClick = () => {
    if (isSelected) {
      onDeselect(recipe)
    } else {
      onSelect(recipe)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-sage-100 text-sage-800 border-sage-200'
      case 'medium':
        return 'bg-cream-100 text-cream-800 border-cream-200'
      case 'hard':
        return 'bg-earth-100 text-earth-800 border-earth-200'
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200'
    }
  }

  return (
    <div
      className={`
        relative bg-white rounded-xl shadow-soft border-2 transition-all duration-300 cursor-pointer
        hover:shadow-medium hover:scale-[1.02] transform
        ${isSelected 
          ? 'border-brand-500 ring-2 ring-brand-200 shadow-brand' 
          : 'border-neutral-200 hover:border-sage-300'
        }
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${isSelected ? 'Deselect' : 'Select'} ${recipe.title} recipe`}
    >
      {/* Selection Indicator */}
      <div className={`
        absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 z-10
        ${isSelected 
          ? 'bg-brand-500 border-brand-500 text-white' 
          : 'bg-white border-neutral-300 hover:border-sage-400'
        }
      `}>
        {isSelected && <Check className="w-4 h-4" />}
      </div>

      {/* Recipe Image Placeholder */}
      <div className="relative h-48 bg-gradient-to-br from-sage-100 to-cream-100 rounded-t-xl overflow-hidden">
        {recipe.imageUrl ? (
          <img 
            src={recipe.imageUrl} 
            alt={`${recipe.title} recipe`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat className="w-12 h-12 text-sage-400" />
          </div>
        )}
        
        {/* Difficulty Badge */}
        <div className={`
          absolute bottom-3 left-3 px-2 py-1 rounded-lg text-xs font-medium border
          ${getDifficultyColor(recipe.difficulty)}
        `}>
          {recipe.difficulty}
        </div>
      </div>

      {/* Recipe Content */}
      <div className="p-6">
        {/* Title and Description */}
        <div className="mb-4">
          <h3 className="text-lg font-display font-bold text-neutral-800 mb-2 line-clamp-2">
            {recipe.title}
          </h3>
          <p className="text-sm text-neutral-600 line-clamp-2 leading-relaxed">
            {recipe.description}
          </p>
        </div>

        {/* Recipe Stats */}
        <div className="flex items-center justify-between text-xs text-neutral-500 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{recipe.prepTime + recipe.cookTime}min</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{recipe.servings} servings</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            <span>${recipe.estimatedCost?.toFixed(0)}</span>
          </div>
        </div>

        {/* Nutrition Info */}
        {showNutrition && recipe.nutrition && (
          <div className="grid grid-cols-4 gap-2 p-3 bg-gradient-to-r from-sage-50 to-cream-50 rounded-lg mb-4">
            <div className="text-center">
              <p className="text-xs font-medium text-neutral-500 mb-1">Cal</p>
              <p className="text-sm font-bold text-neutral-800">{recipe.nutrition.calories}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-neutral-500 mb-1">Protein</p>
              <p className="text-sm font-bold text-neutral-800">{recipe.nutrition.protein}g</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-neutral-500 mb-1">Carbs</p>
              <p className="text-sm font-bold text-neutral-800">{recipe.nutrition.carbs}g</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-neutral-500 mb-1">Fat</p>
              <p className="text-sm font-bold text-neutral-800">{recipe.nutrition.fat}g</p>
            </div>
          </div>
        )}

        {/* Key Ingredients */}
        {showIngredients && recipe.ingredients && recipe.ingredients.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-neutral-700 mb-2 uppercase tracking-wide">
              Key Ingredients:
            </h4>
            <div className="flex flex-wrap gap-1">
              {recipe.ingredients.slice(0, 3).map((ingredient, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-sage-100 text-sage-800 text-xs rounded-md font-medium"
                >
                  {ingredient.name}
                </span>
              ))}
              {recipe.ingredients.length > 3 && (
                <span className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-md font-medium">
                  +{recipe.ingredients.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Cuisine Tag */}
        {recipe.cuisine && (
          <div className="mt-3 pt-3 border-t border-neutral-100">
            <span className="inline-flex items-center px-2 py-1 bg-cream-100 text-cream-800 text-xs font-medium rounded-md border border-cream-200">
              {recipe.cuisine}
            </span>
          </div>
        )}
      </div>

      {/* Selection Overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-brand-500 bg-opacity-5 rounded-xl pointer-events-none" />
      )}
    </div>
  )
}

export default MealCard