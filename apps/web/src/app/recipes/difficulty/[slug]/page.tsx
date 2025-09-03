'use client'

import { useState, useEffect } from 'react'
import { useParams, notFound } from 'next/navigation'
import { ArrowLeft, ChefHat, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '../../../../../lib/supabase'
import RecipeCard from '../../../../../components/RecipeCard'
import Header from '../../../../../components/Header'
import Footer from '../../../../../components/Footer'

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
  allergens_present: string[]
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

export default function DifficultyPage() {
  const params = useParams()
  const slug = params.slug as string
  
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [difficultyName, setDifficultyName] = useState('')

  useEffect(() => {
    if (slug) {
      loadDifficultyRecipes()
    }
  }, [slug])

  const loadDifficultyRecipes = async () => {
    try {
      const supabase = createClient()
      
      // Map slug back to difficulty
      const difficultyMap: { [key: string]: string } = {
        'easy': 'easy',
        'medium': 'medium',
        'challenging': 'challenging'
      }

      const difficulty = difficultyMap[slug]
      
      if (!difficulty) {
        notFound()
        return
      }

      setDifficultyName(difficulty)

      // Get recipes for this difficulty
      const { data, error } = await supabase
        .from('meals')
        .select('id, title, description, prep_time, cook_time, time_total_min, cooking_difficulty, cuisines, diets_supported, courses, allergens_present, image_url, ingredients_json, servings_default')
        .eq('cooking_difficulty', difficulty)
        .order('title')

      if (error) throw error

      // Generate slugs and format data
      const formattedRecipes = (data || []).map((recipe: any) => ({
        ...recipe,
        slug: recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      }))

      setRecipes(formattedRecipes)
    } catch (error) {
      console.error('Error loading difficulty recipes:', error)
      notFound()
    } finally {
      setLoading(false)
    }
  }

  const getDifficultyInfo = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return {
          color: 'from-green-500 to-emerald-500',
          description: 'Quick and simple recipes perfect for beginners or busy weeknights.',
          textColor: 'text-green-100'
        }
      case 'medium':
        return {
          color: 'from-yellow-500 to-orange-500',
          description: 'Recipes that require some technique and attention but are very achievable.',
          textColor: 'text-yellow-100'
        }
      case 'challenging':
        return {
          color: 'from-red-500 to-pink-500',
          description: 'Advanced recipes for experienced cooks ready to take on a culinary challenge.',
          textColor: 'text-red-100'
        }
      default:
        return {
          color: 'from-blue-500 to-indigo-500',
          description: 'Discover recipes at this difficulty level.',
          textColor: 'text-blue-100'
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-neutral-800">Loading recipes...</h2>
        </div>
      </div>
    )
  }

  const difficultyInfo = getDifficultyInfo(difficultyName)

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50">
      <Header />
      
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/recipes"
              className="inline-flex items-center text-neutral-600 hover:text-neutral-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Recipes
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className={`bg-gradient-to-br ${difficultyInfo.color} text-white`}>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Difficulty</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-6">
              {toTitleCase(difficultyName)} Recipes
            </h1>
            <p className={`text-xl md:text-2xl ${difficultyInfo.textColor} mb-8 leading-relaxed`}>
              {difficultyInfo.description}
            </p>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 inline-block">
              <span className="text-lg font-semibold">{recipes.length} recipe{recipes.length !== 1 ? 's' : ''} available</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recipes Grid */}
      <div className="container mx-auto px-4 py-12">
        {recipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                href={`/recipes/${recipe.slug}`}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ChefHat className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-800 mb-2">No recipes found</h3>
            <p className="text-neutral-600 mb-6 max-w-md mx-auto">
              We couldn't find any recipes for this difficulty level. Please try browsing other categories.
            </p>
            <Link
              href="/recipes"
              className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-block"
            >
              Browse All Recipes
            </Link>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  )
}