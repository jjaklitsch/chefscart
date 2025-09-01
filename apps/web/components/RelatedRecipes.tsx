"use client"

import React, { useState, useEffect } from 'react'
import { ChefHat, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { getSupabaseClient } from '../lib/supabase'
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
  image_url?: string
  slug?: string
}

interface RelatedRecipesProps {
  currentRecipe: Recipe
  cuisine?: string
  course?: string
}

const RelatedRecipes: React.FC<RelatedRecipesProps> = ({
  currentRecipe,
  cuisine,
  course
}) => {
  const [relatedRecipes, setRelatedRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRelatedRecipes()
  }, [currentRecipe.id, cuisine, course])

  const loadRelatedRecipes = async () => {
    try {
      const supabase = getSupabaseClient()
      
      // First try to find recipes with same cuisine
      let { data: cuisineRecipesData } = await supabase
        .from('meals')
        .select('id, title, description, prep_time, cook_time, time_total_min, cooking_difficulty, cuisines, diets_supported, courses, image_url')
        .contains('cuisines', [cuisine])
        .neq('id', currentRecipe.id)
        .limit(6)
      
      let cuisineRecipes: any[] = cuisineRecipesData || []

      // If not enough cuisine matches, also get same course recipes
      if ((cuisineRecipes?.length || 0) < 4 && course) {
        const { data: courseRecipes } = await supabase
          .from('meals')
          .select('id, title, description, prep_time, cook_time, time_total_min, cooking_difficulty, cuisines, diets_supported, courses, image_url')
          .contains('courses', [course])
          .neq('id', currentRecipe.id)
          .not('cuisines', 'cs', `{${cuisine}}`) // Exclude already fetched cuisine recipes
          .limit(6)

        cuisineRecipes = [...(cuisineRecipes || []), ...(courseRecipes || [])]
      }

      // If still not enough, get random popular recipes
      if ((cuisineRecipes?.length || 0) < 3) {
        const { data: randomRecipes } = await supabase
          .from('meals')
          .select('id, title, description, prep_time, cook_time, time_total_min, cooking_difficulty, cuisines, diets_supported, courses, image_url')
          .neq('id', currentRecipe.id)
          .order('title')
          .limit(6)

        const existingIds = new Set(cuisineRecipes.map((r: any) => r.id))
        const newRandomRecipes = (randomRecipes as any[])?.filter((r: any) => !existingIds.has(r.id)) || []
        
        cuisineRecipes = [...cuisineRecipes, ...newRandomRecipes]
      }

      // Add slugs and limit to 8 for carousel
      const recipesWithSlugs = (cuisineRecipes || [])
        .slice(0, 8)
        .map(recipe => ({
          ...recipe,
          slug: recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        }))

      setRelatedRecipes(recipesWithSlugs)
    } catch (error) {
      console.error('Error loading related recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mr-3"></div>
          <span className="text-neutral-600">Loading related recipes...</span>
        </div>
      </div>
    )
  }

  if (relatedRecipes.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-neutral-50 to-sage-50 px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold text-neutral-800 flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-neutral-600" />
              You Might Also Like
            </h2>
            <p className="text-sm text-neutral-600 mt-1">
              Similar recipes based on cuisine and meal type
            </p>
          </div>
          <Link 
            href="/recipes"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            View All Recipes
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Related Recipes Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {relatedRecipes.slice(0, 4).map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              href={`/recipes/${recipe.slug}`}
              className="transform hover:scale-[1.02] transition-transform duration-200"
            />
          ))}
        </div>
        
        {relatedRecipes.length > 4 && (
          <div className="text-center mt-6">
            <Link 
              href="/recipes"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg font-medium transition-colors"
            >
              View More Recipes
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default RelatedRecipes