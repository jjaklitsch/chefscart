"use client"

import { useState, useEffect, useRef } from 'react'
import { Clock, Users, DollarSign, ShoppingCart, ArrowLeft, ChevronDown, ChevronUp, X, RefreshCw } from 'lucide-react'
import { MealPlan, Recipe } from '../types'

interface MealPlanPreviewProps {
  mealPlan: MealPlan
  onApprove: () => void
  onBack: () => void
  preferences?: any // Add preferences prop
}

// Helper function to get emoji for ingredient
function getIngredientEmoji(ingredientName: string): string {
  const name = ingredientName.toLowerCase()
  
  // Proteins
  if (name.includes('chicken')) return '🍗'
  if (name.includes('beef') || name.includes('steak')) return '🥩'
  if (name.includes('pork') || name.includes('bacon')) return '🥓'
  if (name.includes('fish') || name.includes('salmon') || name.includes('tuna')) return '🐟'
  if (name.includes('shrimp') || name.includes('prawn')) return '🦐'
  if (name.includes('egg')) return '🥚'
  if (name.includes('tofu')) return '🧈'
  
  // Vegetables
  if (name.includes('tomato')) return '🍅'
  if (name.includes('lettuce') || name.includes('salad')) return '🥬'
  if (name.includes('onion')) return '🧅'
  if (name.includes('garlic')) return '🧄'
  if (name.includes('carrot')) return '🥕'
  if (name.includes('pepper') && !name.includes('black')) return '🌶️'
  if (name.includes('broccoli')) return '🥦'
  if (name.includes('mushroom')) return '🍄'
  if (name.includes('corn')) return '🌽'
  if (name.includes('potato')) return '🥔'
  if (name.includes('zucchini')) return '🥒'
  if (name.includes('spinach')) return '🥬'
  if (name.includes('kimchi')) return '🥬'
  
  // Grains & Carbs
  if (name.includes('rice')) return '🍚'
  if (name.includes('bread')) return '🍞'
  if (name.includes('pasta') || name.includes('noodle')) return '🍝'
  
  // Dairy
  if (name.includes('cheese')) return '🧀'
  if (name.includes('milk')) return '🥛'
  if (name.includes('butter')) return '🧈'
  
  // Fruits
  if (name.includes('lemon')) return '🍋'
  if (name.includes('apple')) return '🍎'
  if (name.includes('banana')) return '🍌'
  
  // Seasonings & Others
  if (name.includes('salt') || name.includes('pepper') && name.includes('black')) return '🧂'
  if (name.includes('oil')) return '🫒'
  if (name.includes('sauce') || name.includes('soy')) return '🥫'
  if (name.includes('herb') || name.includes('basil') || name.includes('parsley')) return '🌿'
  if (name.includes('gochugaru') || name.includes('gochujang') || name.includes('chili') && name.includes('paste')) return '🌶️'
  if (name.includes('sesame')) return '🌰'
  if (name.includes('scallion') || name.includes('green onion')) return '🥬'
  if (name.includes('broth') || name.includes('stock')) return '🍲'
  if (name.includes('clam') || name.includes('mussel')) return '🦪'
  
  // Default
  return '🥗'
}

// Meal Replacement Carousel Modal
function MealReplacementModal({ 
  isOpen, 
  onClose, 
  currentRecipe, 
  backupMeals, 
  onReplace,
  replacedRecipes = []
}: { 
  isOpen: boolean
  onClose: () => void
  currentRecipe: Recipe | null
  backupMeals: Recipe[]
  onReplace: (newRecipe: Recipe) => void
  replacedRecipes?: Recipe[]
}) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [expandedIngredients, setExpandedIngredients] = useState(false)
  const [expandedInstructions, setExpandedInstructions] = useState(false)

  if (!isOpen || !currentRecipe) return null

  const handleReplace = () => {
    if (backupMeals[selectedIndex]) {
      onReplace(backupMeals[selectedIndex])
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4 md:p-6 flex justify-between items-center z-10 flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            Replace "{currentRecipe.title}"
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {backupMeals.length > 0 ? (
            <div className="p-4 md:p-6">
            <p className="text-gray-600 mb-6">Choose a replacement meal from the options below:</p>
            
            {/* Carousel */}
            <div className="relative">
              {/* Navigation Arrows */}
              {backupMeals.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 z-20 bg-white border border-gray-300 rounded-full p-3 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={selectedIndex === 0}
                  >
                    <ChevronUp className="h-5 w-5 -rotate-90" />
                  </button>
                  <button
                    onClick={() => setSelectedIndex(Math.min(backupMeals.length - 1, selectedIndex + 1))}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 z-20 bg-white border border-gray-300 rounded-full p-3 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={selectedIndex === backupMeals.length - 1}
                  >
                    <ChevronUp className="h-5 w-5 rotate-90" />
                  </button>
                </>
              )}

              {/* Selected Meal Display */}
              <div className="mx-4 md:mx-8">
                {backupMeals[selectedIndex] && (
                  <div className="border border-gray-200 rounded-xl p-4 md:p-6 bg-gray-50">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                      {/* Meal Image */}
                      <div className="w-full md:w-32 h-32 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {backupMeals[selectedIndex].imageUrl ? (
                          <img 
                            src={backupMeals[selectedIndex].imageUrl} 
                            alt={backupMeals[selectedIndex].title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-3 shadow-lg">
                            <ShoppingCart className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Meal Details */}
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                          {backupMeals[selectedIndex].title}
                        </h3>
                        <p className="text-gray-600 mb-4 leading-relaxed line-clamp-3">
                          {backupMeals[selectedIndex].description}
                        </p>
                        <div className="flex gap-4 text-sm text-gray-500 mb-4">
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {backupMeals[selectedIndex].prepTime || 0}m prep + {backupMeals[selectedIndex].cookTime || 0}m cook
                          </span>
                          <span className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {backupMeals[selectedIndex].servings} {backupMeals[selectedIndex].servings === 1 ? 'person' : 'people'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {backupMeals[selectedIndex].tags?.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                        {/* Show indicator if this is a previously replaced meal */}
                        {backupMeals[selectedIndex] && replacedRecipes.some(replaced => replaced.id === backupMeals[selectedIndex]!.id) && (
                          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                            <RefreshCw className="h-3 w-3" />
                            <span>Previously replaced option</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Expandable Ingredients Section */}
                    <div className="mt-4">
                      <button
                        onClick={() => setExpandedIngredients(!expandedIngredients)}
                        className="w-full flex justify-between items-center p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                      >
                        <span className="font-semibold text-green-900">
                          🥗 Ingredients ({backupMeals[selectedIndex].ingredients?.length || 0})
                        </span>
                        {expandedIngredients ? <ChevronUp className="h-5 w-5 text-green-600" /> : <ChevronDown className="h-5 w-5 text-green-600" />}
                      </button>
                      {expandedIngredients && (
                        <div className="mt-2 p-4 bg-white border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                          <div className="space-y-2">
                            {backupMeals[selectedIndex].ingredients?.map((ingredient, idx) => (
                              <div key={idx} className="flex justify-between items-center py-2.5 px-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                                <div className="flex items-center gap-3 flex-1">
                                  <span className="text-xl">{getIngredientEmoji(ingredient.name)}</span>
                                  <span className="font-medium text-gray-800">{ingredient.name}</span>
                                </div>
                                <span className="text-green-700 font-semibold whitespace-nowrap ml-4">
                                  {ingredient.amount} {ingredient.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expandable Instructions Section */}
                    <div className="mt-4">
                      <button
                        onClick={() => setExpandedInstructions(!expandedInstructions)}
                        className="w-full flex justify-between items-center p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors border border-orange-200"
                      >
                        <span className="font-semibold text-orange-900">
                          📝 Instructions ({backupMeals[selectedIndex].instructions?.length || 0} steps)
                        </span>
                        {expandedInstructions ? <ChevronUp className="h-5 w-5 text-orange-600" /> : <ChevronDown className="h-5 w-5 text-orange-600" />}
                      </button>
                      {expandedInstructions && (
                        <div className="mt-2 p-4 bg-white border border-gray-200 rounded-lg">
                          <ol className="space-y-3">
                            {backupMeals[selectedIndex].instructions?.map((instruction, idx) => (
                              <li key={idx} className="flex gap-3">
                                <span className="bg-orange-100 text-orange-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <span className="text-gray-900 leading-relaxed">{instruction}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Dots Indicator */}
              {backupMeals.length > 1 && (
                <div className="flex justify-center mt-4 space-x-2">
                  {backupMeals.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedIndex(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === selectedIndex ? 'bg-orange-600' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReplace}
                className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
              >
                Replace Meal
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500 mb-4">No backup meals available for this course.</p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

// Expandable section component for mobile-friendly design
function ExpandableSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden -mx-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-10 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex justify-between items-center"
      >
        <span className="font-semibold text-gray-900">{title}</span>
        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>
      {isOpen && (
        <div className="px-10 py-4 bg-white">
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
  const [backupRecipes] = useState<Recipe[]>(mealPlan.backupRecipes || [])
  const [expandedIngredients, setExpandedIngredients] = useState<Record<string, boolean>>({})
  const [expandedInstructions, setExpandedInstructions] = useState<Record<string, boolean>>({})
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({})
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [modalRecipe, setModalRecipe] = useState<Recipe | null>(null)
  const [replacementModalOpen, setReplacementModalOpen] = useState(false)
  const [recipeToReplace, setRecipeToReplace] = useState<Recipe | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [replacedRecipes, setReplacedRecipes] = useState<Recipe[]>([]) // Track meals that were replaced
  const [numberOfPeople, setNumberOfPeople] = useState(preferences?.peoplePerMeal || 2)
  const generatedImages = useRef<Set<string>>(new Set())

  // Sync selectedRecipes with mealPlan prop changes (for image updates from parent)
  useEffect(() => {
    setSelectedRecipes(mealPlan.recipes)
  }, [mealPlan.recipes])

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Group recipes by meal type
  const groupedRecipes = selectedRecipes.reduce((groups: Record<string, Recipe[]>, recipe) => {
    // Use the mealType property directly, fallback to tags, then 'other'
    let mealType = recipe.mealType?.toLowerCase() || recipe.tags?.find(tag => 
      ['breakfast', 'lunch', 'dinner', 'snack'].includes(tag.toLowerCase())
    ) || 'other'
    
    // Normalize meal type names
    if (mealType === 'snacks') mealType = 'snack'
    
    if (!groups[mealType]) {
      groups[mealType] = []
    }
    groups[mealType]!.push(recipe)
    return groups
  }, {})

  // Order meal types
  const mealTypeOrder = ['breakfast', 'lunch', 'dinner', 'snack', 'other']
  const orderedMealTypes = mealTypeOrder.filter(type => groupedRecipes && groupedRecipes[type] && groupedRecipes[type].length > 0)

  const handleReplaceRecipe = (recipeToReplace: Recipe) => {
    // Open modal with backup meals for the same course
    setRecipeToReplace(recipeToReplace)
    setReplacementModalOpen(true)
  }

  const handleModalReplace = (newRecipe: Recipe) => {
    if (recipeToReplace) {
      // Add the replaced recipe to our tracking list
      setReplacedRecipes(prev => {
        // Avoid duplicates
        if (prev.some(r => r.id === recipeToReplace.id)) {
          return prev
        }
        return [...prev, recipeToReplace]
      })

      // Replace the recipe in selected recipes
      setSelectedRecipes(prev => 
        prev.map(recipe => 
          recipe.id === recipeToReplace.id ? newRecipe : recipe
        )
      )

      // Generate image for new recipe in background
      generateSingleImageInBackground(newRecipe)
      
      showToast(`Replaced "${recipeToReplace.title}" with "${newRecipe.title}"`)
    }
  }

  // Get backup meals for the current recipe's course (smart filtering + replaced meals)
  const getBackupMealsForCourse = (recipe: Recipe): Recipe[] => {
    const courseType = recipe.mealType?.toLowerCase() || 'other'
    
    console.log(`📊 Backup recipes by type:`, backupRecipes.map(b => `${b.title} (${b.mealType})`))
    
    // Get available backup meals that aren't currently selected
    const availableBackups = backupRecipes.filter(backup => 
      backup.mealType?.toLowerCase() === courseType &&
      backup.id !== recipe.id &&
      !selectedRecipes.some(selected => selected.id === backup.id)
    )
    

    // Get replaced meals from the same course that could be reused
    const relevantReplacedMeals = replacedRecipes.filter(replaced =>
      replaced.mealType?.toLowerCase() === courseType &&
      replaced.id !== recipe.id &&
      !selectedRecipes.some(selected => selected.id === replaced.id)
    )

    // Combine backup meals with replaced meals (backups first, replaced at end)
    const allOptions = [...availableBackups, ...relevantReplacedMeals]
    
    // Return all available options (no artificial limit)
    return allOptions
  }

  const generateSingleImageInBackground = async (recipe: any) => {
    try {
      // Race against timeout for single image generation
      const response = await Promise.race([
        fetch('/api/generate-dish-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dishName: recipe.title,
            description: recipe.description,
            cuisine: recipe.cuisine,
            thumbnail: true // Flag for optimized thumbnail prompts
          })
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Replacement image timeout')), 45000) // 45s timeout for DALLE
        )
      ])

      if (response.ok) {
        const data = await response.json()
        setSelectedRecipes(prev => 
          prev.map(r => 
            r.id === recipe.id 
              ? { ...r, imageUrl: data.imageUrl, imageLoading: false }
              : r
          )
        )
      } else {
        console.warn(`❌ Failed to generate replacement image for ${recipe.title}`)
        setSelectedRecipes(prev => 
          prev.map(r => 
            r.id === recipe.id 
              ? { ...r, imageLoading: false, imageError: true }
              : r
          )
        )
      }
    } catch (error) {
      console.warn(`❌ Replacement image timeout for ${recipe.title}:`, error instanceof Error ? error.message : error)
      setSelectedRecipes(prev => 
        prev.map(r => 
          r.id === recipe.id 
            ? { ...r, imageLoading: false, imageError: true }
            : r
        )
      )
    }
  }

  // Generate images for recipes that don't have them yet (only on initial load)
  useEffect(() => {
    const abortController = new AbortController()
    const startTime = Date.now()
    
    const generateImages = async () => {
      // Only generate images for recipes that truly don't have them and aren't already being generated
      const recipesNeedingImages = selectedRecipes.filter(recipe => 
        !recipe.imageUrl && 
        !recipe.imageLoading && 
        !recipe.imageError && 
        !imageUrls[recipe.id] && 
        !imageLoading[recipe.id] && 
        !imageErrors[recipe.id] &&
        !generatedImages.current.has(recipe.id)
      )

      if (recipesNeedingImages.length === 0) {
        return
      }


      for (const recipe of recipesNeedingImages) {
        if (abortController.signal.aborted) break
        
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
              cuisine: recipe.cuisine,
              thumbnail: true
            }),
            signal: abortController.signal
          })

          if (!response.ok) {
            throw new Error('Failed to generate image')
          }

          const data = await response.json()
          
          if (!abortController.signal.aborted) {
            setImageUrls(prev => ({ ...prev, [recipe.id]: data.imageUrl }))
            // Update the recipe's imageLoading state
            setSelectedRecipes(prev => 
              prev.map(r => 
                r.id === recipe.id 
                  ? { ...r, imageUrl: data.imageUrl, imageLoading: false }
                  : r
              )
            )
          }
        } catch (error) {
          if (!abortController.signal.aborted) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error(`❌ Failed to generate image for ${recipe.title}: ${errorMessage}`)
            setImageErrors(prev => ({ ...prev, [recipe.id]: true }))
            // Update the recipe's imageLoading state on error
            setSelectedRecipes(prev => 
              prev.map(r => 
                r.id === recipe.id 
                  ? { ...r, imageLoading: false, imageError: true }
                  : r
              )
            )
          }
        } finally {
          if (!abortController.signal.aborted) {
            setImageLoading(prev => ({ ...prev, [recipe.id]: false }))
          }
        }
      }
    }

    generateImages().then(() => {
      // Log final results
      const totalRecipes = selectedRecipes.length
      const successfulImages = selectedRecipes.filter(r => r.imageUrl || imageUrls[r.id]).length
      const failedImages = Object.keys(imageErrors).length + selectedRecipes.filter(r => r.imageError).length
      
      if (selectedRecipes.length > 0) {
        console.log(`🎨 MealPlanPreview image generation complete: ${successfulImages}/${totalRecipes} successful in ${Date.now() - startTime}ms`)
        if (failedImages > 0) {
          console.warn(`⚠️  ${failedImages} images failed to generate`)
        }
      }
    })
    
    return () => {
      abortController.abort()
    }
  }, [selectedRecipes.length]) // Only trigger when number of recipes changes, not on recipe updates

  // Calculate totals (people only now)
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

        {/* Summary Stats - meals, people, and servings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10">
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="bg-orange-100 rounded-full p-2 md:p-3 mr-3 md:mr-4">
                <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-orange-600" />
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
                <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wide">People</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{numberOfPeople}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-full p-2 md:p-3 mr-3 md:mr-4">
                <Users className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wide">Servings</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{selectedRecipes.length * numberOfPeople}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grouped Recipe Cards */}
        <div className="space-y-8 md:space-y-12 mb-8 md:mb-12">
          {orderedMealTypes.length > 0 ? orderedMealTypes.map((mealType) => (
            <div key={mealType}>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6 capitalize">
                {mealType === 'breakfast' ? '🥞 Breakfast' :
                 mealType === 'lunch' ? '🥙 Lunch' :
                 mealType === 'dinner' ? '🍽️ Dinner' :
                 '🍽️ Other Meals'}
              </h2>
              <div className="space-y-4 md:space-y-6">
                {groupedRecipes[mealType]?.map((recipe) => (
                  <div key={recipe.id} className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
                    {/* Mobile Layout */}
                    <div className="md:hidden">
                      {/* Recipe Image */}
                      <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center overflow-hidden">
                        {recipe.imageLoading || imageLoading[recipe.id] ? (
                          <div className="flex flex-col items-center text-center p-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mb-2"></div>
                            <p className="text-xs text-gray-600">Generating image...</p>
                          </div>
                        ) : recipe.imageUrl || imageUrls[recipe.id] ? (
                          <img 
                            src={recipe.imageUrl || imageUrls[recipe.id]} 
                            alt={recipe.title}
                            className="w-full h-full object-cover"
                            onError={() => setImageErrors(prev => ({ ...prev, [recipe.id]: true }))}
                          />
                        ) : recipe.imageError || imageErrors[recipe.id] ? (
                          <div className="flex flex-col items-center text-center p-4">
                            <div className="text-4xl opacity-60 mb-1">🍽️</div>
                            <p className="text-xs text-gray-500">Image unavailable</p>
                          </div>
                        ) : (
                          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-4 shadow-lg">
                            <ShoppingCart className="w-8 h-8 text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{recipe.title}</h3>
                        <p className="text-gray-600 mb-3 text-sm leading-relaxed">{recipe.description}</p>
                        
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {recipe.prepTime || 0}m prep + {recipe.cookTime || 0}m cook
                          </span>
                          <span className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {recipe.servings} {recipe.servings === 1 ? 'person' : 'people'}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <ExpandableSection title={`Ingredients ${recipe.ingredients?.length ? `(${recipe.ingredients.length})` : '(Loading...)'}`}>
                            {recipe.ingredients?.length ? (
                              <div className="space-y-2">
                                {recipe.ingredients.map((ingredient, idx) => (
                                  <div key={idx} className="flex justify-between items-center py-1">
                                    <span className="text-sm">{ingredient.name}</span>
                                    <span className="text-sm text-gray-600">{ingredient.amount} {ingredient.unit}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center py-6">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600 mr-2"></div>
                                <span className="text-green-600 text-sm">Loading ingredients...</span>
                              </div>
                            )}
                          </ExpandableSection>
                          
                          <ExpandableSection title={`Cooking Instructions ${recipe.instructions?.length ? `(${recipe.instructions.length})` : '(Loading...)'}`}>
                            {recipe.instructions?.length ? (
                              <div className="space-y-3">
                                {recipe.instructions.map((instruction, idx) => (
                                  <div key={idx} className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                      {idx + 1}
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed">{instruction}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center py-6">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600 mr-2"></div>
                                <span className="text-orange-600 text-sm">Loading instructions...</span>
                              </div>
                            )}
                          </ExpandableSection>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleReplaceRecipe(recipe)}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
                          >
                            Replace Meal
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
                        {recipe.imageLoading || imageLoading[recipe.id] ? (
                          <div className="flex flex-col items-center text-center p-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mb-2"></div>
                            <p className="text-xs text-gray-600">Generating image...</p>
                          </div>
                        ) : recipe.imageUrl || imageUrls[recipe.id] ? (
                          <img 
                            src={recipe.imageUrl || imageUrls[recipe.id]} 
                            alt={recipe.title}
                            className="w-full h-full object-cover"
                            onError={() => setImageErrors(prev => ({ ...prev, [recipe.id]: true }))}
                          />
                        ) : recipe.imageError || imageErrors[recipe.id] ? (
                          <div className="flex flex-col items-center text-center p-4">
                            <div className="text-4xl opacity-60 mb-1">🍽️</div>
                            <p className="text-xs text-gray-500">Image unavailable</p>
                          </div>
                        ) : (
                          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-4 shadow-lg">
                            <ShoppingCart className="w-8 h-8 text-white" />
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
                                {recipe.prepTime || 0}m prep + {recipe.cookTime || 0}m cook
                              </span>
                              <span className="flex items-center">
                                <Users className="h-4 w-4 mr-1" />
                                {recipe.servings} {recipe.servings === 1 ? 'person' : 'people'}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-6">
                            <button
                              onClick={() => handleReplaceRecipe(recipe)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                            >
                              Replace Meal
                            </button>
                          </div>
                        </div>

                        {/* Recipe details - vertical collapsed sections */}
                        <div className="mt-6 space-y-4">
                          {/* Ingredients Section */}
                          <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <button
                              onClick={() => setExpandedIngredients(prev => ({ ...prev, [recipe.id]: !prev[recipe.id] }))}
                              className="w-full px-8 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 flex items-center justify-between hover:from-green-100 hover:to-emerald-100 transition-colors"
                            >
                              <div className="flex items-center">
                                <span className="text-2xl mr-3">🛒</span>
                                <h4 className="text-lg font-bold text-green-800">Complete Ingredients</h4>
                                {recipe.ingredients?.length ? (
                                  <span className="ml-3 text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full">
                                    {recipe.ingredients.length} items
                                  </span>
                                ) : (
                                  <span className="ml-3 text-xs text-green-500">Loading...</span>
                                )}
                              </div>
                              {expandedIngredients[recipe.id] ? (
                                <ChevronUp className="w-5 h-5 text-green-600" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-green-600" />
                              )}
                            </button>
                            {expandedIngredients[recipe.id] && (
                              <div className="px-8 py-4 bg-white">
                                {recipe.ingredients?.length ? (
                                  <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {recipe.ingredients.filter(ingredient => ingredient.name && ingredient.name.trim() !== '').map((ingredient, idx) => (
                                      <div key={idx} className="flex justify-between items-center py-2 px-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                                        <span className="font-medium text-gray-800 flex-1">{ingredient.name}</span>
                                        <span className="text-green-700 font-semibold ml-4 whitespace-nowrap">
                                          {ingredient.amount} {ingredient.unit}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mr-3"></div>
                                    <span className="text-green-600">Loading ingredients...</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Instructions Section */}
                          <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <button
                              onClick={() => setExpandedInstructions(prev => ({ ...prev, [recipe.id]: !prev[recipe.id] }))}
                              className="w-full px-8 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 flex items-center justify-between hover:from-orange-100 hover:to-amber-100 transition-colors"
                            >
                              <div className="flex items-center">
                                <span className="text-2xl mr-3">👨‍🍳</span>
                                <h4 className="text-lg font-bold text-orange-800">Cooking Steps</h4>
                                {recipe.instructions?.length ? (
                                  <span className="ml-3 text-sm text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                                    {recipe.instructions.length} steps
                                  </span>
                                ) : (
                                  <span className="ml-3 text-xs text-orange-500">Loading...</span>
                                )}
                              </div>
                              {expandedInstructions[recipe.id] ? (
                                <ChevronUp className="w-5 h-5 text-orange-600" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-orange-600" />
                              )}
                            </button>
                            {expandedInstructions[recipe.id] && (
                              <div className="px-8 py-4 bg-white">
                                {recipe.instructions?.length ? (
                                  <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {recipe.instructions.filter(instruction => instruction && instruction.trim() !== '').map((instruction, idx) => (
                                      <div key={idx} className="flex gap-4 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                                        <div className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                          {idx + 1}
                                        </div>
                                        <p className="text-gray-700 leading-relaxed pt-1 flex-1">{instruction}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mr-3"></div>
                                    <span className="text-orange-600">Loading cooking instructions...</span>
                                  </div>
                                )}
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
          )) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No meals available. Please adjust your preferences and try again.</p>
            </div>
          )}
        </div>

        {/* Simplified Action Buttons */}
        <div className="flex flex-col gap-3 md:gap-4 justify-center items-center mb-8">
          <button
            onClick={onBack}
            className="px-6 md:px-8 py-2.5 md:py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 border border-gray-300 text-sm md:text-base"
          >
            Edit Preferences
          </button>
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

      {/* Meal Replacement Modal */}
      <MealReplacementModal
        isOpen={replacementModalOpen}
        onClose={() => {
          setReplacementModalOpen(false)
          setRecipeToReplace(null)
        }}
        currentRecipe={recipeToReplace}
        backupMeals={recipeToReplace ? getBackupMealsForCourse(recipeToReplace) : []}
        onReplace={handleModalReplace}
        replacedRecipes={replacedRecipes}
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