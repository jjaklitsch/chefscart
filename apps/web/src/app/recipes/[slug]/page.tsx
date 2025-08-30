'use client'

import { useState, useEffect } from 'react'
import { useParams, notFound } from 'next/navigation'
import { ArrowLeft, Clock, Users, ChefHat, ShoppingCart, Share2, Heart, Star } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '../../../../lib/supabase'
import RecipeIngredients from '../../../../components/RecipeIngredients'
import RecipeInstructions from '../../../../components/RecipeInstructions'
import RelatedRecipes from '../../../../components/RelatedRecipes'
import InstacartInstructionsModal from '../../../../components/InstacartInstructionsModal'
import Header from '../../../../components/Header'
import Footer from '../../../../components/Footer'

interface Recipe {
  id: string
  title: string
  description: string
  prep_time?: number
  cook_time?: number
  time_total_min: number
  cooking_difficulty?: string
  cuisines: string[]
  diets_supported: string[]
  courses: string[]
  allergens_present: string[]
  primary_ingredient: string
  ingredients_json: {
    servings: number
    ingredients: Array<{
      display_name: string
      quantity?: number
      unit?: string
      category?: string
      shoppable_name?: string
    }>
  }
  instructions_json: {
    time_total_min: number
    steps: Array<{
      text: string
      step_no?: number
      time_min?: number
    }>
  }
  image_url?: string
  servings_default: number
  calories_per_serving?: number
}

export default function RecipePage() {
  const params = useParams()
  const slug = params.slug as string
  
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [servings, setServings] = useState(2)
  const [creatingCart, setCreatingCart] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [cartUrl, setCartUrl] = useState<string | null>(null)

  useEffect(() => {
    if (slug) {
      loadRecipe()
    }
  }, [slug])

  const loadRecipe = async () => {
    try {
      const supabase = createClient()
      
      // Get all meals and find by slug matching
      const { data: allMeals, error } = await supabase
        .from('meals')
        .select('*') as { data: any[] | null, error: any }
      
      if (error) {
        throw error
      }

      if (!allMeals) {
        notFound()
        return
      }

      // Find meal by generating slug from title
      const matchingMeal = allMeals.find(meal => {
        const mealSlug = meal.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        return mealSlug === slug
      })
      
      if (!matchingMeal) {
        notFound()
        return
      }

      
      setRecipe(matchingMeal)
      setServings(matchingMeal.servings_default || 2)
    } catch (err) {
      console.error('Error loading recipe:', err)
      notFound()
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCart = async () => {
    if (!recipe) return

    setCreatingCart(true)
    try {
      // Create a single-recipe "meal plan" for cart creation
      const singleRecipePlan = {
        recipes: [{
          ...recipe,
          ingredients: recipe.ingredients_json?.ingredients || [],
          servings: servings
        }]
      }

      // Call the create cart API
      const response = await fetch('/api/create-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: `recipe_${recipe.id}_${Date.now()}`,
          mealPlanData: {
            mealPlan: singleRecipePlan,
            consolidatedCart: recipe.ingredients_json?.ingredients?.map((ingredient: any) => ({
              name: ingredient.display_name || ingredient.name,
              shoppableName: ingredient.shoppable_name || ingredient.display_name || ingredient.name,
              amount: (ingredient.quantity || ingredient.amount || 1) * (servings / (recipe.servings_default || 2)),
              unit: ingredient.unit || 'each',
              category: ingredient.category || 'Other',
              shoppingQuantity: (ingredient.quantity || ingredient.amount || 1) * (servings / (recipe.servings_default || 2)),
              shoppingUnit: ingredient.unit || 'each'
            })) || []
          }
        })
      })

      const result = await response.json()
      
      if (result.success && result.cartUrl) {
        // Show instructions before redirecting to Instacart
        setCartUrl(result.cartUrl)
        setShowInstructions(true)
      } else {
        throw new Error(result.error || 'Failed to create cart')
      }
    } catch (error) {
      console.error('Error creating cart:', error)
      alert('Sorry, there was an error creating your shopping cart. Please try again.')
    } finally {
      setCreatingCart(false)
    }
  }

  const handleShare = () => {
    setShowShareModal(true)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      // Show success message briefly
      const button = document.querySelector('[data-copy-button]') as HTMLElement
      if (button) {
        const originalText = button.textContent
        button.textContent = 'Copied!'
        setTimeout(() => {
          button.textContent = originalText
        }, 2000)
      }
    } catch (err) {
      console.error('Failed to copy link:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = window.location.href
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-neutral-800">Loading recipe...</h2>
        </div>
      </div>
    )
  }

  if (!recipe) {
    return notFound()
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'challenging': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-neutral-100 text-neutral-800 border-neutral-200'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50 pb-20">
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
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-3 py-2 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Hero Section */}
          <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 overflow-hidden mb-8">
            {/* Recipe Image */}
            <div className="relative h-64 md:h-80 bg-gradient-to-br from-sage-100 to-cream-100">
              {recipe.image_url ? (
                <img 
                  src={recipe.image_url} 
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-lg p-6 shadow-lg">
                    <ShoppingCart className="w-12 h-12 text-white" />
                  </div>
                </div>
              )}

            </div>

            {/* Hero Content */}
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1">
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-neutral-800 mb-4">
                    {recipe.title}
                  </h1>
                  <p className="text-lg text-neutral-600 leading-relaxed mb-6">
                    {recipe.description}
                  </p>

                  {/* Recipe Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="text-center p-3 bg-neutral-50 rounded-lg">
                      <Clock className="w-5 h-5 mx-auto mb-1 text-neutral-600" />
                      <p className="text-sm font-medium text-neutral-800">{recipe.prep_time || 'N/A'}{recipe.prep_time ? 'min' : ''}</p>
                      <p className="text-xs text-neutral-500">Prep Time</p>
                    </div>
                    <div className="text-center p-3 bg-neutral-50 rounded-lg">
                      <ChefHat className="w-5 h-5 mx-auto mb-1 text-neutral-600" />
                      <p className="text-sm font-medium text-neutral-800">{recipe.cook_time || 'N/A'}{recipe.cook_time ? 'min' : ''}</p>
                      <p className="text-xs text-neutral-500">Cook Time</p>
                    </div>
                    <div className="text-center p-3 bg-neutral-50 rounded-lg">
                      <Users className="w-5 h-5 mx-auto mb-1 text-neutral-600" />
                      <p className="text-sm font-medium text-neutral-800">{recipe.servings_default || 2}</p>
                      <p className="text-xs text-neutral-500">Servings</p>
                    </div>
                    <div className="text-center p-3 bg-neutral-50 rounded-lg">
                      <ChefHat className="w-5 h-5 mx-auto mb-1 text-neutral-600" />
                      <p className="text-sm font-medium text-neutral-800">{recipe.cuisines?.[0] || 'International'}</p>
                      <p className="text-xs text-neutral-500">Cuisine</p>
                    </div>
                    {recipe.cooking_difficulty && (
                      <div className="text-center p-3 bg-neutral-50 rounded-lg">
                        <div className={`w-5 h-5 mx-auto mb-1 rounded-full flex items-center justify-center text-xs font-bold ${
                          recipe.cooking_difficulty.toLowerCase() === 'easy' ? 'bg-green-500 text-white' :
                          recipe.cooking_difficulty.toLowerCase() === 'medium' ? 'bg-yellow-500 text-white' :
                          'bg-red-500 text-white'
                        }`}>
                          {recipe.cooking_difficulty.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-sm font-medium text-neutral-800">{recipe.cooking_difficulty}</p>
                        <p className="text-xs text-neutral-500">Difficulty</p>
                      </div>
                    )}
                  </div>

                  {/* Diet Tags */}
                  {recipe.diets_supported && recipe.diets_supported.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {recipe.diets_supported.map((diet, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-sage-100 text-sage-800 text-sm rounded-full font-medium"
                        >
                          {diet}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Servings Adjuster & CTA */}
                <div className="flex-shrink-0 w-full md:w-64">
                  <div className="bg-gradient-to-br from-sage-50 to-cream-50 rounded-xl p-6 border border-sage-200">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Adjust Servings:
                      </label>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => setServings(Math.max(1, servings - 1))}
                          className="w-8 h-8 rounded-full bg-white border border-neutral-300 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 transition-colors"
                        >
                          -
                        </button>
                        <span className="text-lg font-semibold text-neutral-800 w-8 text-center">
                          {servings}
                        </span>
                        <button
                          onClick={() => setServings(servings + 1)}
                          className="w-8 h-8 rounded-full bg-white border border-neutral-300 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleCreateCart}
                      disabled={creatingCart}
                      className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white px-4 py-3 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                    >
                      {creatingCart ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Creating Cart...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          Shop Ingredients
                        </>
                      )}
                    </button>
                    <p className="text-xs text-neutral-500 text-center mt-2">
                      Opens Instacart with all ingredients
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recipe Content */}
          <div className="space-y-8">
            
            {/* Ingredients */}
            <div>
              <RecipeIngredients 
                ingredients={recipe.ingredients_json?.ingredients || []}
                originalServings={recipe.servings_default}
                adjustedServings={servings}
              />
            </div>

            {/* Instructions */}
            <div>
              <RecipeInstructions 
                instructions={recipe.instructions_json?.steps || []}
                title={recipe.title}
              />
            </div>
          </div>

          {/* Related Recipes */}
          <div className="mt-12">
            <RelatedRecipes 
              currentRecipe={{ ...recipe, cooking_difficulty: recipe.cooking_difficulty || 'medium' }}
              cuisine={recipe.cuisines?.[0] || 'International'}
              course={recipe.courses?.[0] || 'Main Course'}
            />
          </div>

          {/* Recipe Tags */}
          <div className="mt-8">
            <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 overflow-hidden">
              <div className="bg-gradient-to-r from-neutral-50 to-sage-50 px-6 py-4 border-b border-neutral-200">
                <h3 className="text-lg font-display font-bold text-neutral-800">Recipe Tags</h3>
                <p className="text-sm text-neutral-600 mt-1">Cuisines, dietary preferences, and meal types</p>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {/* Cuisines */}
                  {recipe.cuisines && recipe.cuisines.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-700 mb-2">Cuisines</h4>
                      <div className="flex flex-wrap gap-2">
                        {recipe.cuisines.map((cuisine, idx) => (
                          <Link
                            key={idx}
                            href={`/recipes?cuisine=${encodeURIComponent(cuisine)}`}
                            className="px-3 py-1 bg-sage-100 text-sage-800 text-sm rounded-full font-medium hover:bg-sage-200 transition-colors cursor-pointer"
                          >
                            {cuisine.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Courses */}
                  {recipe.courses && recipe.courses.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-700 mb-2">Meal Types</h4>
                      <div className="flex flex-wrap gap-2">
                        {recipe.courses.map((course, idx) => (
                          <Link
                            key={idx}
                            href={`/recipes?course=${encodeURIComponent(course)}`}
                            className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium hover:bg-blue-200 transition-colors cursor-pointer"
                          >
                            {course.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dietary Preferences */}
                  {recipe.diets_supported && recipe.diets_supported.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-700 mb-2">Dietary Preferences</h4>
                      <div className="flex flex-wrap gap-2">
                        {recipe.diets_supported.map((diet, idx) => (
                          <Link
                            key={idx}
                            href={`/recipes?diet=${encodeURIComponent(diet)}`}
                            className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium hover:bg-green-200 transition-colors cursor-pointer"
                          >
                            {diet.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Main Ingredient */}
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-700 mb-2">Main Ingredient</h4>
                    <Link
                      href={`/recipes?ingredient=${encodeURIComponent(recipe.primary_ingredient)}`}
                      className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full font-medium hover:bg-orange-200 transition-colors cursor-pointer"
                    >
                      {recipe.primary_ingredient.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                    </Link>
                  </div>

                  {/* All Ingredients */}
                  {recipe.ingredients_json?.ingredients && recipe.ingredients_json.ingredients.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-700 mb-2">All Ingredients</h4>
                      <div className="flex flex-wrap gap-2">
                        {recipe.ingredients_json.ingredients.map((ingredient, idx) => (
                          <Link
                            key={idx}
                            href={`/recipes?ingredient=${encodeURIComponent(ingredient.shoppable_name || ingredient.display_name)}`}
                            className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-full font-medium hover:bg-neutral-200 transition-colors cursor-pointer"
                          >
                            {(ingredient.shoppable_name || ingredient.display_name).split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cooking Difficulty */}
                  {recipe.cooking_difficulty && (
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-700 mb-2">Cooking Difficulty</h4>
                      <span className={`inline-block px-3 py-1 text-sm rounded-full font-medium ${getDifficultyColor(recipe.cooking_difficulty)}`}>
                        {recipe.cooking_difficulty}
                      </span>
                    </div>
                  )}

                  {/* Allergens */}
                  {recipe.allergens_present && recipe.allergens_present.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-700 mb-2">Allergen Information</h4>
                      <div className="flex flex-wrap gap-2">
                        {recipe.allergens_present.map((allergen, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full font-medium"
                          >
                            Contains {allergen}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Fixed Upsell Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 shadow-lg z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-brand-100 rounded-lg p-2">
                <ShoppingCart className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-800">Get all ingredients delivered</p>
                <p className="text-xs text-neutral-600">Shop this recipe with one click</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Servings Adjuster */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-600">Servings:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setServings(Math.max(1, servings - 1))}
                    className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-300 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors text-sm"
                  >
                    -
                  </button>
                  <span className="text-sm font-semibold text-neutral-800 w-6 text-center">
                    {servings}
                  </span>
                  <button
                    onClick={() => setServings(servings + 1)}
                    className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-300 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
              
              <button
                onClick={handleCreateCart}
                disabled={creatingCart}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:cursor-not-allowed"
              >
                {creatingCart ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    Shop Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-sage-50 to-cream-50 px-6 py-4 border-b border-sage-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-display font-bold text-neutral-800">Share Recipe</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <span className="text-xl">&times;</span>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <h4 className="text-lg font-semibold text-neutral-800 mb-2">{recipe?.title}</h4>
                <p className="text-sm text-neutral-600">{recipe?.description}</p>
              </div>

              <div className="space-y-4">
                {/* Copy Link Button */}
                <button
                  onClick={handleCopyLink}
                  data-copy-button
                  className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Copy Link
                </button>

                {/* URL Display */}
                <div className="bg-neutral-50 rounded-lg p-3">
                  <p className="text-xs text-neutral-500 mb-1">Recipe URL:</p>
                  <p className="text-sm text-neutral-700 break-all font-mono bg-white px-2 py-1 rounded border">
                    {typeof window !== 'undefined' ? window.location.href : ''}
                  </p>
                </div>

                {/* Native Share (if available) */}
                {typeof navigator !== 'undefined' && navigator.share && (
                  <button
                    onClick={async () => {
                      try {
                        await navigator.share({
                          title: recipe?.title,
                          text: recipe?.description,
                          url: window.location.href
                        })
                        setShowShareModal(false)
                      } catch (err) {
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-4 py-3 rounded-lg font-medium transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Share via System
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instacart Instructions Modal */}
      <InstacartInstructionsModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        onContinue={() => {
          if (cartUrl) {
            window.open(cartUrl, '_blank')
          }
          setShowInstructions(false)
        }}
      />
    </div>
  )
}