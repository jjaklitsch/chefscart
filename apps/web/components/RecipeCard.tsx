"use client"

import React from 'react'
import Link from 'next/link'
import { Clock, Users, ChefHat, ShoppingCart } from 'lucide-react'
import AddToMealCart from './AddToMealCart'

// Helper function to convert text to title case
const toTitleCase = (str: string): string => {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  )
}

interface Recipe {
  id: string
  title: string
  description: string
  prep_time?: number
  cook_time?: number
  time_total_min?: number
  cooking_difficulty: string
  cuisines: string[]
  diets_supported: string[]
  courses: string[]
  image_url?: string
  slug?: string
  servings_default?: number
  ingredients_json?: {
    servings?: number
    ingredients?: Array<{
      display_name: string
      quantity: number
      unit: string
    }>
  }
}

interface RecipeCardProps {
  recipe: Recipe
  href: string
  className?: string
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, href, className = '' }) => {

  const primaryCuisine = recipe.cuisines?.[0] || 'International'
  const prepTime = recipe.prep_time
  const cookTime = recipe.cook_time

  return (
    <Link href={href} className={`block group h-full ${className}`}>
      <article className="bg-white rounded-2xl shadow-soft border border-neutral-200 overflow-hidden transition-all duration-300 hover:shadow-medium hover:scale-[1.02] transform h-full flex flex-col">
        {/* Recipe Image */}
        <div className="relative h-56 bg-gradient-to-br from-sage-100 to-cream-100 overflow-hidden flex-shrink-0">
          {recipe.image_url ? (
            <img 
              src={recipe.image_url} 
              alt={`${recipe.title} recipe`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-lg p-4 shadow-lg">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
            </div>
          )}
          
        </div>

        {/* Content */}
        <div className="p-6 pb-5 flex flex-col flex-1 min-h-[280px]">
          {/* Title and Description */}
          <div className="mb-4">
            <h3 className="text-lg font-display font-bold text-neutral-800 mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-brand-700 transition-colors">
              {recipe.title}
            </h3>
            <p className="text-sm text-neutral-600 line-clamp-2 leading-relaxed min-h-[2.5rem]">
              {recipe.description}
            </p>
          </div>

          {/* Recipe Stats */}
          <div className="text-xs text-neutral-500 mb-4 flex-shrink-0">
            {/* Timing */}
            <div className="flex items-center gap-1 mb-2">
              <Clock className="w-3 h-3" />
              <span>
                {prepTime && cookTime 
                  ? `${prepTime}m prep + ${cookTime}m cook`
                  : prepTime 
                    ? `${prepTime}m prep`
                    : cookTime 
                      ? `${cookTime}m cook`
                      : 'N/A'
                }
              </span>
            </div>
            {/* Cuisine */}
            <div className="flex items-center gap-1">
              <ChefHat className="w-3 h-3" />
              <span>{toTitleCase(primaryCuisine)}</span>
            </div>
          </div>

          {/* Diet Tags */}
          <div className="mb-4 flex-1 flex flex-col justify-start">
            {recipe.diets_supported && recipe.diets_supported.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {recipe.diets_supported.slice(0, 2).map((diet, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-sage-100 text-sage-800 text-xs rounded-md font-medium"
                  >
                    {toTitleCase(diet)}
                  </span>
                ))}
                {recipe.diets_supported.length > 2 && (
                  <span className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-md font-medium">
                    +{recipe.diets_supported.length - 2} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="pt-3 border-t border-neutral-100 flex-shrink-0 mt-auto">
            <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              <AddToMealCart 
                meal={{
                  id: recipe.id,
                  title: recipe.title,
                  description: recipe.description,
                  ...(recipe.image_url && { imageUrl: recipe.image_url }),
                  cuisine: recipe.cuisines?.[0] || 'international',
                  difficulty: recipe.cooking_difficulty,
                  prepTime: recipe.prep_time || 0,
                  cookTime: recipe.cook_time || 0,
                  servings: recipe.ingredients_json?.servings || recipe.servings_default || 2,
                  ingredients: recipe.ingredients_json?.ingredients?.map((ing) => ({
                    name: ing.display_name,
                    amount: ing.quantity,
                    unit: ing.unit
                  })) || []
                }}
                size="md"
              />
            </div>
            <div className="text-center mt-2">
              <span className="text-xs text-neutral-500 group-hover:text-brand-600 transition-colors">
                Click card to view recipe
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}

export default RecipeCard