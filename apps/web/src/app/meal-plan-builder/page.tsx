'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { ArrowLeft, Clock, Users, ShoppingCart, Edit2, ChefHat, Sparkles, Timer, Utensils, CheckCircle, Globe, Search, Plus } from 'lucide-react'
import Link from 'next/link'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import { UserPreferences, MealPlan } from '../../../types'
import { toTitleCase } from '../../../utils/textUtils'

interface QuickPlanOptions {
  breakfastsPerWeek: number
  lunchesPerWeek: number
  dinnersPerWeek: number
  peoplePerMeal: number
}

export default function QuickPlanPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [savedPreferences, setSavedPreferences] = useState<UserPreferences | null>(null)
  const [planOptions, setPlanOptions] = useState<QuickPlanOptions>({
    breakfastsPerWeek: 0,
    lunchesPerWeek: 3,
    dinnersPerWeek: 4,
    peoplePerMeal: 2
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAIFlow, setShowAIFlow] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    loadUserPreferences()
  }, [user])

  const loadUserPreferences = async () => {
    try {
      // Try to load from user metadata first
      if (user?.user_metadata?.preferences) {
        setSavedPreferences(user.user_metadata.preferences)
        setPlanOptions({
          breakfastsPerWeek: user.user_metadata.preferences.breakfastsPerWeek || 0,
          lunchesPerWeek: user.user_metadata.preferences.lunchesPerWeek || 3,
          dinnersPerWeek: user.user_metadata.preferences.dinnersPerWeek || 4,
          peoplePerMeal: user.user_metadata.preferences.peoplePerMeal || 2
        })
        return
      }

      // Fallback to localStorage for existing users
      if (user?.email) {
        const userData = localStorage.getItem(`chefscart_user_${user.email}`)
        if (userData) {
          const parsedData = JSON.parse(userData)
          if (parsedData.preferences) {
            setSavedPreferences(parsedData.preferences)
            setPlanOptions({
              breakfastsPerWeek: parsedData.preferences.breakfastsPerWeek || 0,
              lunchesPerWeek: parsedData.preferences.lunchesPerWeek || 3,
              dinnersPerWeek: parsedData.preferences.dinnersPerWeek || 4,
              peoplePerMeal: parsedData.preferences.peoplePerMeal || 2
            })
          }
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    }
  }

  const generateMealPlan = async () => {
    if (!savedPreferences) {
      setError('No saved preferences found. Please complete onboarding first.')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // Update preferences with new meal counts
      const updatedPreferences = {
        ...savedPreferences,
        ...planOptions
      }

      // Calculate total meals needed
      const totalMealsNeeded = planOptions.breakfastsPerWeek + planOptions.lunchesPerWeek + planOptions.dinnersPerWeek

      // Call meal recommendation API
      const response = await fetch('/api/recommend-meals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: updatedPreferences,
          courseMealCounts: {
            breakfast: planOptions.breakfastsPerWeek,
            lunch: planOptions.lunchesPerWeek,
            dinner: planOptions.dinnersPerWeek
          },
          limit: Math.max(totalMealsNeeded * 2, 15),
          includeBackups: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate meal plan')
      }

      const data = await response.json()
      
      if (!data.success || !data.meals || data.meals.length === 0) {
        throw new Error('No suitable meals found for your preferences')
      }

      // Transform and create meal plan (similar to onboarding logic)
      const transformMeal = (meal: any, mealType: string) => {
        const defaultServings = meal.servings_default || 4
        const userServings = planOptions.peoplePerMeal
        const scalingFactor = userServings / defaultServings

        return {
          id: meal.id,
          title: meal.title,
          description: meal.description,
          mealType: mealType,
          cuisine: meal.cuisines[0] || 'international',
          imageUrl: meal.image_url,
          ingredients: (meal.ingredients_json || []).map((ing: any) => ({
            name: toTitleCase(ing.name || ing.display_name || ing.shoppable_name),
            amount: Math.round((ing.quantity * scalingFactor) * 100) / 100,
            unit: ing.unit
          })),
          ingredients_json: meal.ingredients_json ? (meal.ingredients_json || []).map((ing: any) => ({
            ...ing,
            quantity: Math.round((ing.quantity * scalingFactor) * 100) / 100
          })) : undefined,
          difficulty: meal.cooking_difficulty === 'challenging' ? 'hard' : meal.cooking_difficulty as 'easy' | 'medium' | 'hard',
          cookTime: meal.cook_time || 15,
          prepTime: meal.prep_time || 10,
          servings: userServings,
          estimatedCost: (meal.cost_per_serving === '$' ? 8 : meal.cost_per_serving === '$$' ? 15 : 25) * scalingFactor,
          tags: meal.diets_supported || [],
          nutrition: {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0
          },
          instructions: (meal.instructions_json?.steps || []).map((step: any) => step.instruction || step.text)
        }
      }

      // Organize meals by course
      const mealsByCourse = data.mealsByType || {}
      const backupMealsByType = data.backupMealsByType || {}
      
      const selectedRecipes: any[] = []
      const backupRecipes: any[] = []
      
      // Process each meal type (breakfast, lunch, dinner)
      const mealTypes = ['breakfast', 'lunch', 'dinner'] as const
      
      for (const courseType of mealTypes) {
        const mealsForType = mealsByCourse[courseType] || []
        const requestedCount = courseType === 'breakfast' ? planOptions.breakfastsPerWeek :
                             courseType === 'lunch' ? planOptions.lunchesPerWeek :
                             planOptions.dinnersPerWeek
        
        // Select the requested number of meals
        const selectedMealsForCourse = mealsForType.slice(0, requestedCount).map((meal: any) => transformMeal(meal, courseType))
        selectedRecipes.push(...selectedMealsForCourse)
        
        // Add backup meals if available
        const backupMealsForCourse = (backupMealsByType[courseType] || []).slice(0, 3).map((meal: any) => transformMeal(meal, courseType))
        backupRecipes.push(...backupMealsForCourse)
      }

      // Create meal plan
      const mealPlan: MealPlan = {
        id: `quickplan_${Date.now()}`,
        userId: user?.id || `temp_${Date.now()}`,
        recipes: selectedRecipes,
        backupRecipes: backupRecipes,
        subtotalEstimate: selectedRecipes.reduce((sum: number, r: any) => sum + (r.estimatedCost || 15), 0),
        ingredientMatchPct: 95,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Save to localStorage
      const mealPlanId = `quickplan_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      const mealPlanData = {
        id: mealPlanId,
        userId: user?.id || `temp_${Date.now()}`,
        email: user?.email,
        zipCode: localStorage.getItem('chefscart_zipcode') || (savedPreferences as any).zipCode,
        mealPlan,
        consolidatedCart: [],
        createdAt: new Date().toISOString(),
        quickPlan: true
      }
      localStorage.setItem(`chefscart_mealplan_${mealPlanId}`, JSON.stringify(mealPlanData))

      // Navigate to meal plan preview
      router.push(`/meal-plan/${mealPlanId}`)

    } catch (err) {
      console.error('Error generating quick meal plan:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate meal plan. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50">
        <Header />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!savedPreferences) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50">
        <Header />
        <div className="flex items-center justify-center px-4 min-h-[50vh]">
          <div className="max-w-md w-full text-center">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Complete Your Profile</h2>
              <p className="text-gray-600 mb-6">
                Set up your dietary preferences and cooking style to create personalized meal plans.
              </p>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Complete Setup
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-green-600 to-green-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-12">
          <div className="text-center">
            <div className="bg-white/20 rounded-full p-3 sm:p-4 w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
              <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">Create Your Meal Plan</h1>
            <p className="text-green-100 text-sm sm:text-base lg:text-lg mb-4 sm:mb-6 px-2">
              Choose how you want to build your perfect meal plan
            </p>
          </div>
        </div>
      </div>

      {/* Two Options */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          
          {/* Option 1: Browse & Build */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="text-center mb-6">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Search className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Browse & Build</h2>
              <p className="text-gray-600 mb-6">
                Search, filter, and hand-pick exactly the meals you want. Perfect for when you know what you're craving.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">Browse 500+ curated recipes</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">Filter by cuisine, diet, difficulty</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">Add meals to your cart as you go</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">Full control over your selection</span>
              </div>
            </div>

            <button
              onClick={() => router.push('/recipes')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Start Browsing Recipes
            </button>

            <div className="text-center mt-4">
              <span className="text-xs text-gray-500">Best for: Picky eaters, specific cravings</span>
            </div>
          </div>

          {/* Option 2: AI Generate */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="text-center mb-6">
              <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">AI-Generated Plan</h2>
              <p className="text-gray-600 mb-6">
                Let our AI create a personalized meal plan based on your preferences. Quick and perfectly tailored.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">Ready in under 30 seconds</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">Matches your dietary preferences</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">Balanced variety across cuisines</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">Option to swap any meal</span>
              </div>
            </div>

            <button
              onClick={() => setShowAIFlow(true)}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Generate AI Meal Plan
            </button>

            <div className="text-center mt-4">
              <span className="text-xs text-gray-500">Best for: Quick planning, trying new things</span>
            </div>
          </div>

        </div>

        {/* Link back to preferences */}
        <div className="text-center mt-8">
          <Link
            href="/preferences" 
            className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Update your dietary preferences
          </Link>
        </div>
      </div>

      {/* AI Flow Configuration (shown when user selects AI Generate) */}
      {showAIFlow && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="mb-6">
            <button
              onClick={() => setShowAIFlow(false)}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to options
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Main Configuration */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Customize Your Plan</h2>
              
              {/* People Count */}
              <div className="mb-4 sm:mb-6">
                <label className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-800 mb-3">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  <span className="text-sm sm:text-base">How many people are you cooking for?</span>
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <button
                      key={num}
                      onClick={() => setPlanOptions({ ...planOptions, peoplePerMeal: num })}
                      className={`p-2 sm:p-3 rounded-lg border-2 transition-all touch-target ${
                        planOptions.peoplePerMeal === num
                          ? 'border-green-600 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-green-300 text-gray-700'
                      }`}
                    >
                      <div className="font-semibold text-sm sm:text-base">{num}</div>
                      <div className="text-xs hidden sm:block">{num === 1 ? 'person' : 'people'}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Meal Types */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Utensils className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  <span className="text-sm sm:text-base">Meals per week</span>
                </h3>
                
                <div className="space-y-3 sm:space-y-4">
                  {/* Breakfast */}
                  <div className="bg-orange-50 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="font-semibold text-gray-800 text-sm sm:text-base">Breakfasts</span>
                      </div>
                      <span className="text-xs sm:text-sm text-gray-600">{planOptions.breakfastsPerWeek} meals</span>
                    </div>
                    <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
                      {[0, 1, 2, 3, 4, 5, 6, 7].map(num => (
                        <button
                          key={num}
                          onClick={() => setPlanOptions({ ...planOptions, breakfastsPerWeek: num })}
                          className={`p-1.5 sm:p-2 rounded-lg text-xs sm:text-sm font-medium transition-all touch-target ${
                            planOptions.breakfastsPerWeek === num
                              ? 'bg-orange-500 text-white'
                              : 'bg-white border border-orange-200 text-orange-700 hover:bg-orange-100'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lunch */}
                  <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="font-semibold text-gray-800 text-sm sm:text-base">Lunches</span>
                      </div>
                      <span className="text-xs sm:text-sm text-gray-600">{planOptions.lunchesPerWeek} meals</span>
                    </div>
                    <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
                      {[0, 1, 2, 3, 4, 5, 6, 7].map(num => (
                        <button
                          key={num}
                          onClick={() => setPlanOptions({ ...planOptions, lunchesPerWeek: num })}
                          className={`p-1.5 sm:p-2 rounded-lg text-xs sm:text-sm font-medium transition-all touch-target ${
                            planOptions.lunchesPerWeek === num
                              ? 'bg-blue-500 text-white'
                              : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dinner */}
                  <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="font-semibold text-gray-800 text-sm sm:text-base">Dinners</span>
                      </div>
                      <span className="text-xs sm:text-sm text-gray-600">{planOptions.dinnersPerWeek} meals</span>
                    </div>
                    <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
                      {[0, 1, 2, 3, 4, 5, 6, 7].map(num => (
                        <button
                          key={num}
                          onClick={() => setPlanOptions({ ...planOptions, dinnersPerWeek: num })}
                          className={`p-1.5 sm:p-2 rounded-lg text-xs sm:text-sm font-medium transition-all touch-target ${
                            planOptions.dinnersPerWeek === num
                              ? 'bg-purple-500 text-white'
                              : 'bg-white border border-purple-200 text-purple-700 hover:bg-purple-100'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 sm:mt-6 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                  <p className="text-red-700 text-xs sm:text-sm">{error}</p>
                </div>
              )}

              {/* Generate Button */}
              <div className="mt-6 sm:mt-8 text-center">
                <div className="mb-3 sm:mb-4">
                  <span className="text-xl sm:text-2xl font-bold text-gray-900">
                    {planOptions.breakfastsPerWeek + planOptions.lunchesPerWeek + planOptions.dinnersPerWeek}
                  </span>
                  <span className="text-gray-600 ml-2 text-sm sm:text-base">total meals this week</span>
                </div>
                
                <button
                  onClick={generateMealPlan}
                  disabled={isGenerating || (planOptions.breakfastsPerWeek + planOptions.lunchesPerWeek + planOptions.dinnersPerWeek === 0)}
                  className="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none touch-target"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="hidden sm:inline">Generating Your Perfect Plan...</span>
                      <span className="sm:hidden">Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span className="hidden sm:inline">Generate My Meal Plan</span>
                      <span className="sm:hidden">Generate Plan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Your Preferences */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Your Preferences</h3>
                <Link
                  href="/preferences"
                  className="text-green-600 hover:text-green-700 text-xs sm:text-sm font-medium transition-colors touch-target"
                >
                  Edit
                </Link>
              </div>
              
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 mt-0.5" />
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-gray-900">Cuisines</div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      {savedPreferences.preferredCuisines?.slice(0, 3).join(', ') || 'All cuisines'}
                      {savedPreferences.preferredCuisines && savedPreferences.preferredCuisines.length > 3 && 
                        ` +${savedPreferences.preferredCuisines.length - 3} more`}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 sm:gap-3">
                  <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 mt-0.5" />
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-gray-900">Diet</div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      {savedPreferences.dietaryStyle?.join(', ') || 'No restrictions'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3">
                  <ChefHat className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 mt-0.5" />
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-gray-900">Spice Level</div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      {savedPreferences.spiceTolerance === '1' ? 'Mild' : 
                       savedPreferences.spiceTolerance === '3' ? 'Medium' : 'Hot'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* What You'll Get */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-green-200">
              <h3 className="text-base sm:text-lg font-bold text-green-800 mb-3 sm:mb-4">What You'll Get</h3>
              
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  <span className="text-xs sm:text-sm text-green-800">Personalized recipe selection</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  <span className="text-xs sm:text-sm text-green-800">Scaled ingredients for your group</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  <span className="text-xs sm:text-sm text-green-800">Complete shopping list</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  <span className="text-xs sm:text-sm text-green-800">Step-by-step cooking instructions</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  <span className="text-xs sm:text-sm text-green-800">Instacart cart integration</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
      
      <Footer />
    </div>
  )
}