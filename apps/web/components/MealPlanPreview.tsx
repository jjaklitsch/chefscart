"use client"

import { useState, useEffect, useRef } from 'react'
import { Clock, Users, DollarSign, ChefHat, ArrowLeft, ShoppingCart, ChevronDown, ChevronUp, X, RefreshCw } from 'lucide-react'
import { MealPlan, Recipe } from '../types'

interface MealPlanPreviewProps {
  mealPlan: MealPlan
  onApprove: () => void
  onBack: () => void
  preferences?: any // Add preferences prop
}

// Expandable section component for mobile-friendly design
function ExpandableSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex justify-between items-center"
      >
        <span className="font-semibold text-gray-900">{title}</span>
        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>
      {isOpen && (
        <div className="p-4 bg-white">
          {children}
        </div>
      )}
    </div>
  )
}

// Modal component for full recipe details
function RecipeModal({ recipe, isOpen, onClose }: { recipe: Recipe; isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:p-6 flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">{recipe.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-4 md:p-6 space-y-6 md:space-y-8">
          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
            <p className="text-gray-600 text-base md:text-lg leading-relaxed">{recipe.description}</p>
          </div>

          {/* Ingredients */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingredients</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recipe.ingredients?.map((ingredient, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{ingredient.name}</span>
                  <span className="text-gray-600">{ingredient.amount} {ingredient.unit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cooking Instructions</h3>
            <div className="space-y-4">
              {recipe.instructions?.map((instruction, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </div>
                  <p className="text-gray-700 leading-relaxed pt-1">{instruction}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Nutrition */}
          {recipe.nutrition && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Nutrition Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{recipe.nutrition.calories}</p>
                  <p className="text-sm text-gray-600">Calories</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{recipe.nutrition.protein}g</p>
                  <p className="text-sm text-gray-600">Protein</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{recipe.nutrition.carbs}g</p>
                  <p className="text-sm text-gray-600">Carbs</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{recipe.nutrition.fat}g</p>
                  <p className="text-sm text-gray-600">Fat</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{recipe.nutrition.fiber}g</p>
                  <p className="text-sm text-gray-600">Fiber</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{recipe.nutrition.sugar}g</p>
                  <p className="text-sm text-gray-600">Sugar</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MealPlanPreview({ mealPlan, onApprove, onBack, preferences }: MealPlanPreviewProps) {
  const [selectedRecipes, setSelectedRecipes] = useState<Recipe[]>(mealPlan.recipes)
  const [expandedIngredients, setExpandedIngredients] = useState<Record<string, boolean>>({})
  const [expandedInstructions, setExpandedInstructions] = useState<Record<string, boolean>>({})
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({})
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [modalRecipe, setModalRecipe] = useState<Recipe | null>(null)
  const [replacingRecipes, setReplacingRecipes] = useState<Set<string>>(new Set())
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const generatedImages = useRef<Set<string>>(new Set())

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Group recipes by meal type
  const groupedRecipes = selectedRecipes.reduce((groups: Record<string, Recipe[]>, recipe) => {
    const mealType = recipe.tags?.find(tag => 
      ['breakfast', 'lunch', 'dinner', 'snack'].includes(tag.toLowerCase())
    ) || 'other'
    
    if (!groups[mealType]) {
      groups[mealType] = []
    }
    groups[mealType].push(recipe)
    return groups
  }, {})

  // Order meal types
  const mealTypeOrder = ['breakfast', 'lunch', 'dinner', 'snack', 'other']
  const orderedMealTypes = mealTypeOrder.filter(type => groupedRecipes[type]?.length > 0)

  const handleReplaceRecipe = async (recipeToReplace: Recipe) => {
    // Mark recipe as being replaced
    setReplacingRecipes(prev => new Set(prev).add(recipeToReplace.id))
    
    try {
      // Generate a new recipe by calling the API
      const response = await fetch('/api/generate-replacement-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipeToReplace,
          currentRecipes: selectedRecipes,
          preferences: mealPlan.preferences || preferences
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate replacement recipe')
      }

      const { recipe: newRecipe } = await response.json()
      
      // Replace the recipe
      setSelectedRecipes(prev => 
        prev.map(recipe => 
          recipe.id === recipeToReplace.id ? newRecipe : recipe
        )
      )
    } catch (error) {
      console.error('Error replacing recipe:', error)
      showToast('Failed to generate a replacement recipe. Please try again.')
    } finally {
      setReplacingRecipes(prev => {
        const next = new Set(prev)
        next.delete(recipeToReplace.id)
        return next
      })
    }
  }

  // Generate images for all recipes on component mount (only once per recipe)
  useEffect(() => {
    const generateImages = async () => {
      for (const recipe of selectedRecipes) {
        // Skip if image already generated for this recipe ID
        if (generatedImages.current.has(recipe.id)) {
          continue
        }
        
        // Skip if image already exists, is loading, or has error
        if (imageUrls[recipe.id] || imageLoading[recipe.id] || imageErrors[recipe.id]) {
          continue
        }

        // Mark as generated to prevent regeneration
        generatedImages.current.add(recipe.id)
        setImageLoading(prev => ({ ...prev, [recipe.id]: true }))

        try {
          const response = await fetch('/api/generate-dish-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              dishName: recipe.title,
              description: recipe.description,
              cuisine: recipe.cuisine
            })
          })

          if (!response.ok) {
            throw new Error('Failed to generate image')
          }

          const data = await response.json()
          setImageUrls(prev => ({ ...prev, [recipe.id]: data.imageUrl }))
        } catch (error) {
          console.error('Error generating image for', recipe.title, ':', error)
          setImageErrors(prev => ({ ...prev, [recipe.id]: true }))
        } finally {
          setImageLoading(prev => ({ ...prev, [recipe.id]: false }))
        }
      }
    }

    generateImages()
  }, [selectedRecipes])

  // Calculate totals
  const totalCost = selectedRecipes.reduce((sum, recipe) => sum + ((recipe.estimatedCost || 0) * (recipe.servings || 1)), 0)
  const totalServings = selectedRecipes.reduce((sum, recipe) => sum + (recipe.servings || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 pb-32">
      <div className="max-w-4xl mx-auto px-4 py-4 md:py-8">
        
        {/* Back button - top left */}
        <div className="mb-4 md:mb-6">
          <button
            onClick={onBack}
            className="flex items-center px-3 md:px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm md:text-base"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Preferences
          </button>
        </div>

        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Your Meal Plan</h1>
          <p className="text-gray-600 text-sm md:text-base">Review and customize your recipes</p>
        </div>

        {/* Summary Stats - reordered: meals, servings, cost */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10">
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="bg-orange-100 rounded-full p-2 md:p-3 mr-3 md:mr-4">
                <ChefHat className="h-5 w-5 md:h-6 md:w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wide">Meals</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{selectedRecipes.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-full p-2 md:p-3 mr-3 md:mr-4">
                <Users className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wide">Servings</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{totalServings}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-full p-2 md:p-3 mr-3 md:mr-4">
                <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wide">Est. Cost</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">${Math.max(totalCost - 20, 0).toFixed(0)} - ${(totalCost + 25).toFixed(0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grouped Recipe Cards */}
        <div className="space-y-8 md:space-y-12 mb-8 md:mb-12">
          {orderedMealTypes.map((mealType) => (
            <div key={mealType}>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6 capitalize">
                {mealType === 'other' ? 'Other Meals' : `${mealType}s`}
              </h2>
              <div className="space-y-4 md:space-y-6">
                {groupedRecipes[mealType].map((recipe) => (
                  <div key={recipe.id} className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
                    {/* Mobile Layout */}
                    <div className="md:hidden">
                      {/* Recipe Image */}
                      <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center overflow-hidden">
                        {imageLoading[recipe.id] ? (
                          <div className="flex flex-col items-center text-center p-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mb-2"></div>
                            <p className="text-xs text-gray-600">Generating image...</p>
                          </div>
                        ) : imageUrls[recipe.id] ? (
                          <img 
                            src={imageUrls[recipe.id]} 
                            alt={recipe.title}
                            className="w-full h-full object-cover"
                            onError={() => setImageErrors(prev => ({ ...prev, [recipe.id]: true }))}
                          />
                        ) : imageErrors[recipe.id] ? (
                          <div className="flex flex-col items-center text-center p-4">
                            <div className="text-4xl opacity-60 mb-1">🍽️</div>
                            <p className="text-xs text-gray-500">Image unavailable</p>
                          </div>
                        ) : (
                          <div className="text-6xl opacity-60">
                            {recipe.cuisine === 'Asian' ? '🥢' : 
                             recipe.cuisine === 'Italian' ? '🍝' :
                             recipe.cuisine === 'Mexican' ? '🌮' :
                             recipe.title.toLowerCase().includes('chicken') ? '🐔' :
                             recipe.title.toLowerCase().includes('pasta') ? '🍝' :
                             recipe.title.toLowerCase().includes('salad') ? '🥗' :
                             recipe.title.toLowerCase().includes('soup') ? '🍲' : '🍽️'}
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{recipe.title}</h3>
                        <p className="text-gray-600 mb-3 text-sm leading-relaxed">{recipe.description}</p>
                        
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {recipe.prepTime + recipe.cookTime}min
                          </span>
                          <span className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {recipe.servings} servings
                          </span>
                          <span className="flex items-center">
                            <DollarSign className="h-3 w-3 mr-1" />
                            ${((recipe.estimatedCost || 0) * (recipe.servings || 1)).toFixed(2)} total
                          </span>
                        </div>

                        <div className="space-y-3">
                          <ExpandableSection title="Ingredients">
                            <div className="space-y-2">
                              {recipe.ingredients?.map((ingredient, idx) => (
                                <div key={idx} className="flex justify-between items-center py-1">
                                  <span className="text-sm">{ingredient.name}</span>
                                  <span className="text-sm text-gray-600">{ingredient.amount} {ingredient.unit}</span>
                                </div>
                              ))}
                            </div>
                          </ExpandableSection>
                          
                          <ExpandableSection title="Cooking Instructions">
                            <div className="space-y-3">
                              {recipe.instructions?.map((instruction, idx) => (
                                <div key={idx} className="flex gap-3">
                                  <div className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                    {idx + 1}
                                  </div>
                                  <p className="text-sm text-gray-700 leading-relaxed">{instruction}</p>
                                </div>
                              ))}
                            </div>
                          </ExpandableSection>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleReplaceRecipe(recipe)}
                            disabled={replacingRecipes.has(recipe.id)}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                          >
                            {replacingRecipes.has(recipe.id) ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
                                Replacing...
                              </>
                            ) : (
                              'Replace Recipe'
                            )}
                          </button>
                          <button
                            onClick={() => setModalRecipe(recipe)}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:flex">
                      {/* Recipe Image */}
                      <div className="w-48 h-48 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {imageLoading[recipe.id] ? (
                          <div className="flex flex-col items-center text-center p-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mb-2"></div>
                            <p className="text-xs text-gray-600">Generating image...</p>
                          </div>
                        ) : imageUrls[recipe.id] ? (
                          <img 
                            src={imageUrls[recipe.id]} 
                            alt={recipe.title}
                            className="w-full h-full object-cover"
                            onError={() => setImageErrors(prev => ({ ...prev, [recipe.id]: true }))}
                          />
                        ) : imageErrors[recipe.id] ? (
                          <div className="flex flex-col items-center text-center p-4">
                            <div className="text-4xl opacity-60 mb-1">🍽️</div>
                            <p className="text-xs text-gray-500">Image unavailable</p>
                          </div>
                        ) : (
                          <div className="text-6xl opacity-60">
                            {recipe.cuisine === 'Asian' ? '🥢' : 
                             recipe.cuisine === 'Italian' ? '🍝' :
                             recipe.cuisine === 'Mexican' ? '🌮' :
                             recipe.title.toLowerCase().includes('chicken') ? '🐔' :
                             recipe.title.toLowerCase().includes('pasta') ? '🍝' :
                             recipe.title.toLowerCase().includes('salad') ? '🥗' :
                             recipe.title.toLowerCase().includes('soup') ? '🍲' : '🍽️'}
                          </div>
                        )}
                      </div>
                      
                      <div className="p-8 flex-1">
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">{recipe.title}</h3>
                            <p className="text-gray-600 mb-4 text-lg leading-relaxed">{recipe.description}</p>
                            <div className="flex flex-wrap gap-6 text-sm text-gray-500">
                              <span className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {recipe.prepTime + recipe.cookTime}min
                              </span>
                              <span className="flex items-center">
                                <Users className="h-4 w-4 mr-1" />
                                {recipe.servings} servings
                              </span>
                              <span className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-1" />
                                ${((recipe.estimatedCost || 0) * (recipe.servings || 1)).toFixed(2)} total
                              </span>
                              <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                                {recipe.difficulty}
                              </span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                {recipe.cuisine}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-6">
                            <button
                              onClick={() => handleReplaceRecipe(recipe)}
                              disabled={replacingRecipes.has(recipe.id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              {replacingRecipes.has(recipe.id) ? (
                                <>
                                  <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
                                  Replacing...
                                </>
                              ) : (
                                'Replace Recipe'
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Recipe details - vertical collapsed sections */}
                        <div className="mt-6 space-y-4">
                          {/* Ingredients Section */}
                          <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <button
                              onClick={() => setExpandedIngredients(prev => ({ ...prev, [recipe.id]: !prev[recipe.id] }))}
                              className="w-full p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 flex items-center justify-between hover:from-green-100 hover:to-emerald-100 transition-colors"
                            >
                              <div className="flex items-center">
                                <span className="text-2xl mr-3">🛒</span>
                                <h4 className="text-lg font-bold text-green-800">Complete Ingredients</h4>
                                <span className="ml-3 text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full">
                                  {recipe.ingredients?.length} items
                                </span>
                              </div>
                              {expandedIngredients[recipe.id] ? (
                                <ChevronUp className="w-5 h-5 text-green-600" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-green-600" />
                              )}
                            </button>
                            {expandedIngredients[recipe.id] && (
                              <div className="p-4 bg-white">
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                  {recipe.ingredients?.map((ingredient, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                                      <span className="font-medium text-gray-800">{ingredient.name}</span>
                                      <span className="text-green-700 font-semibold">{ingredient.amount} {ingredient.unit}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Instructions Section */}
                          <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <button
                              onClick={() => setExpandedInstructions(prev => ({ ...prev, [recipe.id]: !prev[recipe.id] }))}
                              className="w-full p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 flex items-center justify-between hover:from-orange-100 hover:to-amber-100 transition-colors"
                            >
                              <div className="flex items-center">
                                <span className="text-2xl mr-3">👨‍🍳</span>
                                <h4 className="text-lg font-bold text-orange-800">Cooking Steps</h4>
                                <span className="ml-3 text-sm text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                                  {recipe.instructions?.length} steps
                                </span>
                              </div>
                              {expandedInstructions[recipe.id] ? (
                                <ChevronUp className="w-5 h-5 text-orange-600" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-orange-600" />
                              )}
                            </button>
                            {expandedInstructions[recipe.id] && (
                              <div className="p-4 bg-white">
                                <div className="space-y-4 max-h-64 overflow-y-auto">
                                  {recipe.instructions?.map((instruction, idx) => (
                                    <div key={idx} className="flex gap-4 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                                      <div className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                        {idx + 1}
                                      </div>
                                      <p className="text-sm text-gray-700 leading-relaxed pt-1">{instruction}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Simplified Action Buttons */}
        <div className="flex flex-col gap-3 md:gap-4 justify-center items-center mb-8">
          <button
            onClick={() => showToast('Generate more ideas feature coming soon!')}
            className="px-6 md:px-8 py-2.5 md:py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm md:text-base"
          >
            Generate More Ideas
          </button>
          <button
            onClick={onBack}
            className="px-6 md:px-8 py-2.5 md:py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 border border-gray-300 text-sm md:text-base"
          >
            Modify Preferences
          </button>
        </div>

        {/* Footer Note */}
        <div className="p-4 md:p-6 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs md:text-sm text-amber-800 leading-relaxed">
            <strong>Note:</strong> Prices and availability may vary in Instacart. 
            Ingredient costs are estimated ranges and may differ based on store location and brand preferences.
          </p>
        </div>
      </div>

      {/* Fixed Bottom Footer for Cart CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-3 md:p-4">
        <div className="max-w-4xl mx-auto flex justify-center">
          <button
            onClick={onApprove}
            className="flex items-center justify-center px-6 md:px-8 py-3 md:py-4 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl text-base md:text-lg"
          >
            <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 mr-2 md:mr-3" />
            Build My Instacart Cart
          </button>
        </div>
      </div>

      {/* Recipe Modal */}
      <RecipeModal 
        recipe={modalRecipe!} 
        isOpen={!!modalRecipe} 
        onClose={() => setModalRecipe(null)} 
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {toastMessage}
        </div>
      )}
    </div>
  )
}