'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { ArrowLeft, Clock, Users, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { UserPreferences, MealPlan } from '../../../types'

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
          ingredients: (meal.ingredients_json?.ingredients || []).map((ing: any) => ({
            name: ing.shoppable_name || ing.display_name,
            amount: Math.round((ing.quantity * scalingFactor) * 100) / 100,
            unit: ing.unit
          })),
          ingredients_json: meal.ingredients_json ? {
            servings: meal.ingredients_json.servings,
            ingredients: meal.ingredients_json.ingredients.map((ing: any) => ({
              ...ing,
              quantity: Math.round((ing.quantity * scalingFactor) * 100) / 100
            }))
          } : undefined,
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
          instructions: (meal.instructions_json?.steps || []).map((step: any) => step.text)
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
        zipCode: savedPreferences.zipCode || localStorage.getItem('chefscart_zipcode'),
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
      <div className="min-h-screen bg-health-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4 w-12 h-12"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!savedPreferences) {
    return (
      <div className="min-h-screen bg-health-gradient flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Preferences Found</h2>
            <p className="text-gray-600 mb-6">
              You need to complete the onboarding process first to set up your dietary preferences and cooking style.
            </p>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 bg-brand-green hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Complete Onboarding
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-health-gradient">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/dashboard"
            className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="bg-green-600 rounded-full p-3 w-14 h-14 mx-auto mb-4 flex items-center justify-center">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Quick Meal Plan</h1>
            <p className="text-gray-600">Create a new meal plan with your saved preferences</p>
          </div>

          {/* Saved Preferences Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="mb-2">
              <h3 className="font-semibold text-gray-900">Your Saved Preferences</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Cuisines:</span> {savedPreferences.cuisinePreferences?.join(', ') || 'All'}
              </div>
              <div>
                <span className="font-medium">Diet:</span> {savedPreferences.dietaryStyle?.join(', ') || 'No restrictions'}
              </div>
              <div>
                <span className="font-medium">Spice Level:</span> {savedPreferences.spiceTolerance === '1' ? 'Mild' : savedPreferences.spiceTolerance === '3' ? 'Medium' : 'Hot'}
              </div>
              <div>
                <span className="font-medium">Avoided:</span> {savedPreferences.ingredientsToAvoid?.join(', ') || 'None'}
              </div>
            </div>
          </div>

          {/* Meal Plan Configuration */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                People per meal
              </label>
              <select
                value={planOptions.peoplePerMeal}
                onChange={(e) => setPlanOptions({ ...planOptions, peoplePerMeal: parseInt(e.target.value) })}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent appearance-none bg-white"
                style={{ backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"%3e%3cpolyline points=\"6 9 12 15 18 9\"%3e%3c/polyline%3e%3c/svg%3e')", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em' }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                  <option key={num} value={num}>{num} {num === 1 ? 'person' : 'people'}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Breakfasts/week</label>
                <select
                  value={planOptions.breakfastsPerWeek}
                  onChange={(e) => setPlanOptions({ ...planOptions, breakfastsPerWeek: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent appearance-none bg-white"
                  style={{ backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"%3e%3cpolyline points=\"6 9 12 15 18 9\"%3e%3c/polyline%3e%3c/svg%3e')", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em' }}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lunches/week</label>
                <select
                  value={planOptions.lunchesPerWeek}
                  onChange={(e) => setPlanOptions({ ...planOptions, lunchesPerWeek: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent appearance-none bg-white"
                  style={{ backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"%3e%3cpolyline points=\"6 9 12 15 18 9\"%3e%3c/polyline%3e%3c/svg%3e')", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em' }}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dinners/week</label>
                <select
                  value={planOptions.dinnersPerWeek}
                  onChange={(e) => setPlanOptions({ ...planOptions, dinnersPerWeek: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent appearance-none bg-white"
                  style={{ backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"%3e%3cpolyline points=\"6 9 12 15 18 9\"%3e%3c/polyline%3e%3c/svg%3e')", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em' }}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Total meals: {planOptions.breakfastsPerWeek + planOptions.lunchesPerWeek + planOptions.dinnersPerWeek}
              </p>
              
              <button
                onClick={generateMealPlan}
                disabled={isGenerating || (planOptions.breakfastsPerWeek + planOptions.lunchesPerWeek + planOptions.dinnersPerWeek === 0)}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating Plan...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    Generate Meal Plan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}