"use client"

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '../lib/supabase'
import RecipeCard from './RecipeCard'

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
  allergens_present: string[]
  image_url?: string
  slug?: string
  primary_ingredient?: string
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

interface RecipeCarouselProps {
  title: string
  subtitle?: string
  filterType: 'cuisine' | 'course' | 'diet' | 'difficulty' | 'ingredient'
  filterValue: string
  viewAllLink?: string
  className?: string
}

const RecipeCarousel: React.FC<RecipeCarouselProps> = ({
  title,
  subtitle,
  filterType,
  filterValue,
  viewAllLink,
  className = ""
}) => {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [itemsPerView, setItemsPerView] = useState(3)

  // Update items per view based on screen size
  useEffect(() => {
    const updateItemsPerView = () => {
      if (window.innerWidth >= 1280) setItemsPerView(4)  // xl
      else if (window.innerWidth >= 1024) setItemsPerView(3)  // lg
      else if (window.innerWidth >= 768) setItemsPerView(2)   // md
      else setItemsPerView(1)  // sm and below
    }
    
    updateItemsPerView()
    window.addEventListener('resize', updateItemsPerView)
    return () => window.removeEventListener('resize', updateItemsPerView)
  }, [])

  useEffect(() => {
    loadRecipes()
  }, [filterType, filterValue])

  const loadRecipes = async () => {
    try {
      const supabase = createClient()
      
      // Get more recipes initially to ensure we have enough after filtering
      let query = supabase
        .from('meals')
        .select('id, title, description, prep_time, cook_time, time_total_min, cooking_difficulty, cuisines, diets_supported, courses, allergens_present, image_url, primary_ingredient, ingredients_json, servings_default')
        .limit(50) // Increased limit to ensure we get enough valid recipes

      // Apply basic database filters where possible
      switch (filterType) {
        case 'cuisine':
          query = query.contains('cuisines', [filterValue])
          break
        case 'course':
          query = query.contains('courses', [filterValue])
          break
        case 'diet':
          query = query.contains('diets_supported', [filterValue])
          break
        case 'difficulty':
          query = query.eq('cooking_difficulty', filterValue)
          break
        case 'ingredient':
          // For ingredient search, we'll filter in JavaScript since primary_ingredient might not match exactly
          break
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading recipes for carousel:', error)
        throw error
      }

      if (!data || data.length === 0) {
        console.warn(`No recipes found for ${filterType}: ${filterValue}`)
        setRecipes([])
        return
      }

      // Format recipes with slugs
      let formattedRecipes = (data || []).map((recipe: any) => ({
        ...recipe,
        slug: recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      }))

      // Additional JavaScript filtering for ingredient searches
      if (filterType === 'ingredient') {
        formattedRecipes = formattedRecipes.filter(recipe => {
          const titleMatch = recipe.title.toLowerCase().includes(filterValue.toLowerCase())
          const primaryMatch = recipe.primary_ingredient?.toLowerCase().includes(filterValue.toLowerCase())
          const ingredientsMatch = recipe.ingredients_json?.ingredients?.some((ingredient: any) => 
            ingredient.display_name?.toLowerCase().includes(filterValue.toLowerCase()) ||
            ingredient.shoppable_name?.toLowerCase().includes(filterValue.toLowerCase())
          )
          return titleMatch || primaryMatch || ingredientsMatch
        })
      }

      // Filter out recipes without essential data
      formattedRecipes = formattedRecipes.filter(recipe => 
        recipe.title && recipe.description && (recipe.cuisines?.length > 0)
      )

      // Randomize the order to show variety
      const shuffledRecipes = formattedRecipes.sort(() => Math.random() - 0.5)
      
      // Take only the first 12 for display
      setRecipes(shuffledRecipes.slice(0, 12))
      
      console.log(`Loaded ${shuffledRecipes.slice(0, 12).length} recipes for ${filterType}: ${filterValue}`)
    } catch (error) {
      console.error('Error loading recipes for carousel:', error)
      setRecipes([])
    } finally {
      setLoading(false)
    }
  }

  const maxIndex = Math.max(0, recipes.length - itemsPerView)
  const canScrollLeft = currentIndex > 0
  const canScrollRight = currentIndex < maxIndex
  const showNavigation = recipes.length > itemsPerView

  const scrollLeft = () => {
    if (canScrollLeft) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const scrollRight = () => {
    if (canScrollRight) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl shadow-soft border border-neutral-200 p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mr-3"></div>
          <span className="text-neutral-600">Loading recipes...</span>
        </div>
      </div>
    )
  }

  if (recipes.length === 0) {
    return null
  }

  return (
    <section className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-neutral-800">{title}</h2>
          {subtitle && <p className="text-neutral-600 mt-2">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {/* Navigation Arrows */}
          {showNavigation && (
            <div className="flex gap-2">
              <button
                onClick={scrollLeft}
                disabled={!canScrollLeft}
                className={`p-2 rounded-full border transition-all ${
                  canScrollLeft
                    ? 'border-neutral-300 hover:border-brand-400 hover:bg-brand-50 text-neutral-600 hover:text-brand-600'
                    : 'border-neutral-200 text-neutral-300 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={scrollRight}
                disabled={!canScrollRight}
                className={`p-2 rounded-full border transition-all ${
                  canScrollRight
                    ? 'border-neutral-300 hover:border-brand-400 hover:bg-brand-50 text-neutral-600 hover:text-brand-600'
                    : 'border-neutral-200 text-neutral-300 cursor-not-allowed'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
          
          {/* View All Link */}
          {viewAllLink && (
            <Link
              href={viewAllLink}
              className="text-brand-600 hover:text-brand-700 font-medium transition-colors"
            >
              View All →
            </Link>
          )}
        </div>
      </div>

      {/* Carousel */}
      <div className="overflow-hidden">
        <div 
          className="flex transition-transform duration-300 ease-in-out"
          style={{ 
            transform: `translateX(-${(currentIndex * 100) / itemsPerView}%)`,
            width: `${(recipes.length * 100) / itemsPerView}%`
          }}
        >
          {recipes.map((recipe) => (
            <div 
              key={recipe.id}
              className="px-4 flex-shrink-0"
              style={{ width: `${100 / recipes.length}%` }}
            >
              <RecipeCard
                recipe={recipe}
                href={`/recipes/${recipe.slug}`}
                className="h-full"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dots Indicator */}
      {showNavigation && maxIndex > 0 && (
        <div className="flex justify-center mt-6 gap-2">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-brand-600' : 'bg-neutral-300'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default RecipeCarousel