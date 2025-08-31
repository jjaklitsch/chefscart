"use client"

import { useState, Suspense, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import GuidedOnboarding from '../../../components/GuidedOnboarding'
import MealPlanPreview from '../../../components/MealPlanPreview'
import CartBuilder from '../../../components/CartBuilder'
import CartPreparation from '../../../components/CartPreparation'
import InstacartInstructionsModal from '../../../components/InstacartInstructionsModal'
import { UserPreferences, MealPlan } from '../../../types'

function OnboardingPageContent() {
  const [step, setStep] = useState<'preferences' | 'mealplan' | 'cartbuilder' | 'cartprep' | 'cart'>('preferences')
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [consolidatedCart, setConsolidatedCart] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [cartUrl, setCartUrl] = useState<string | null>(null)
  const router = useRouter()

  // Load existing preferences from localStorage when component mounts
  useEffect(() => {
    try {
      const currentUser = localStorage.getItem('chefscart_current_user')
      if (currentUser) {
        const userData = localStorage.getItem(`chefscart_user_${currentUser}`)
        if (userData) {
          const parsedData = JSON.parse(userData)
          if (parsedData.preferences) {
            setPreferences(parsedData.preferences)
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load existing preferences:', error)
    }
  }, [])

  const handlePreferencesComplete = async (userPreferences: UserPreferences) => {
    setPreferences(userPreferences)
    setIsLoading(true)
    setError(null)

    try {
      // Calculate meals needed by course based on user selection
      const courseMealCounts = {
        breakfast: userPreferences.breakfastsPerWeek || 0,
        lunch: userPreferences.lunchesPerWeek || 0,
        dinner: userPreferences.dinnersPerWeek || 0
      }
      
      const totalMealsNeeded = courseMealCounts.breakfast + courseMealCounts.lunch + courseMealCounts.dinner
      
      // Call the meal recommendation API to get personalized meals from Supabase
      const response = await fetch('/api/recommend-meals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: userPreferences,
          courseMealCounts: courseMealCounts, // Pass course-specific counts
          limit: Math.max(totalMealsNeeded * 2, 15), // Get 2x meals for variety + backups
          includeBackups: true // Flag to generate backup meals
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch meal recommendations')
      }

      const data = await response.json()
      
      if (!data.success || !data.meals || data.meals.length === 0) {
        throw new Error('No suitable meals found for your preferences')
      }

      // Transform Supabase meals to our Recipe format and organize by course
      const transformMeal = (meal: any, mealType: string) => {
        const defaultServings = meal.servings_default || 4
        const userServings = userPreferences.peoplePerMeal || 4
        const scalingFactor = userServings / defaultServings

        return {
          id: meal.id,
          title: meal.title,
          description: meal.description,
          mealType: mealType, // Explicitly set the meal type
          cuisine: meal.cuisines[0] || 'international',
          imageUrl: meal.image_url,
          ingredients: (meal.ingredients_json?.ingredients || []).map((ing: any) => ({
            name: ing.shoppable_name || ing.display_name, // Use shoppable name for shopping list clarity
            amount: Math.round((ing.quantity * scalingFactor) * 100) / 100, // Scale and round to 2 decimals
            unit: ing.unit
          })),
          // IMPORTANT: Preserve the full ingredients_json for CartBuilder to use shoppable names
          ingredients_json: meal.ingredients_json ? {
            servings: meal.ingredients_json.servings,
            ingredients: meal.ingredients_json.ingredients.map((ing: any) => ({
              ...ing,
              quantity: Math.round((ing.quantity * scalingFactor) * 100) / 100 // Scale quantities for cart
            }))
          } : undefined,
          difficulty: meal.cooking_difficulty === 'challenging' ? 'hard' : meal.cooking_difficulty as 'easy' | 'medium' | 'hard',
          cookTime: meal.cook_time || 15,
          prepTime: meal.prep_time || 10,
          servings: userServings, // Use user's desired servings
          estimatedCost: (meal.cost_per_serving === '$' ? 8 : meal.cost_per_serving === '$$' ? 15 : 25) * scalingFactor,
          tags: meal.diets_supported || [],
          nutrition: {
            calories: 0, // Nutrition info not in current schema
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0
          },
          instructions: (meal.instructions_json?.steps || []).map((step: any) => step.text)
        }
      }

      // Organize meals by course from API response
      const mealsByCourse = data.mealsByType || {}
      const backupMealsByType = data.backupMealsByType || {}
      
      // Build selected recipes respecting user's meal counts per course
      const selectedRecipes: any[] = []
      const backupRecipes: any[] = []
      
      // Add meals by course up to the user's requested count
      for (const [courseType, meals] of Object.entries(mealsByCourse) as [string, any[]][]) {
        const requestedCount = courseMealCounts[courseType as keyof typeof courseMealCounts] || 0
        
        // Take only the requested number of meals for each course
        const selectedMealsForCourse = meals.slice(0, requestedCount).map(meal => transformMeal(meal, courseType))
        selectedRecipes.push(...selectedMealsForCourse)
        
        // Add backup meals for this course
        const backupMealsForCourse = (backupMealsByType[courseType] || []).map((meal: any) => transformMeal(meal, courseType))
        backupRecipes.push(...backupMealsForCourse)
      }

      // Create meal plan with properly organized recipes
      const mealPlan: MealPlan = {
        id: `mealplan_${Date.now()}`,
        userId: `temp_${Date.now()}`,
        recipes: selectedRecipes,
        backupRecipes: backupRecipes, // Include backup meals organized by course
        subtotalEstimate: selectedRecipes.reduce((sum: number, r: any) => sum + (r.estimatedCost || 15), 0),
        ingredientMatchPct: 95,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      setMealPlan(mealPlan)
      setStep('mealplan')
      setIsLoading(false)

    } catch (err) {
      console.error('Error creating meal plan:', err)
      setError('We\'re having trouble creating your meal plan. Please try again.')
      setIsLoading(false)
    }
  }

  // Removed AI image generation - using curated meals with pre-existing images

  const handleMealPlanApprove = () => {
    setStep('cartbuilder')
  }

  const handleCartBuilderComplete = (finalCart: any[]) => {
    setConsolidatedCart(finalCart)
    setStep('cartprep')
  }

  const handleCartPreparation = async (email: string) => {
    if (!mealPlan || !preferences) return

    setIsLoading(true)
    setError(null)

    try {
      
      // Get zipCode from localStorage
      const zipCode = localStorage.getItem('chefscart_zipcode') || ''
      
      // Create user ID locally (will migrate to Supabase later)
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      
      // Also save user data locally for login system
      const userData = {
        email,
        zipCode,
        preferences,
        completedOnboarding: true,
        lastLogin: new Date().toISOString()
      }
      localStorage.setItem(`chefscart_user_${email}`, JSON.stringify(userData))
      localStorage.setItem('chefscart_current_user', email)
      
      // Save meal plan locally (will migrate to Supabase later)
      const mealPlanId = `mealplan_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      const mealPlanData = {
        id: mealPlanId,
        userId,
        email,
        zipCode,
        mealPlan,
        consolidatedCart,
        createdAt: new Date().toISOString()
      }
      localStorage.setItem(`chefscart_mealplan_${mealPlanId}`, JSON.stringify(mealPlanData))
      

      // Save user data to Supabase asynchronously (don't wait for it)
      fetch('/api/save-user-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          preferences,
          zipCode,
          mealPlan,
          consolidatedCart
        })
      }).then(response => {
        if (response.ok) {
        } else {
          console.error('Failed to save user data to Supabase')
        }
      }).catch(error => {
        console.error('Error saving user data to Supabase:', error)
      })
      
      // Call the production cart creation API
      const response = await fetch('/api/create-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: mealPlanId, // Use the generated meal plan ID
          userId: userId,
          email,
          zipCode,
          userPreferences: preferences,
          mealPlanData: {
            mealPlan,
            consolidatedCart
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create cart')
      }

      const data = await response.json()
      
      // Update meal plan status locally (will migrate to Supabase later)
      const updatedMealPlanData = { ...mealPlanData, status: 'cart_created', updatedAt: new Date().toISOString() }
      localStorage.setItem(`chefscart_mealplan_${mealPlanId}`, JSON.stringify(updatedMealPlanData))
      
      // Store data and redirect to cart-success page for better UX
      if (data.cartUrl) {
        const successPlanId = mealPlanId
        const successData = {
          mealPlan,
          cartUrl: data.cartUrl,
          email,
          consolidatedCart
        }
        localStorage.setItem(`chefscart_mealplan_${successPlanId}`, JSON.stringify(successData))
        
        // Redirect to cart-success page which has proper modal and flow
        router.push(`/cart-success/${successPlanId}`)
      } else {
        setStep('cart')
      }

    } catch (err) {
      console.error('Error in cart preparation:', err)
      setError('Unable to create your Instacart cart. Please try again or contact support if the problem persists.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-health-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4 w-12 h-12"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {step === 'preferences' ? 'Generating your meal plan...' : 
             step === 'cartbuilder' ? 'Building your cart...' :
             step === 'cartprep' ? 'Creating your cart...' : 'Creating your cart...'}
          </h2>
          <p className="text-gray-600">This may take a few moments</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-health-gradient flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="alert-error mb-4">
            <strong className="font-bold">Error: </strong>
            <span>{error}</span>
          </div>
          <button
            onClick={() => {
              setError(null)
              setStep('preferences')
              setMealPlan(null)
              setPreferences(null)
            }}
            className="btn-primary-new"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (step === 'preferences') {
    return (
      <GuidedOnboarding 
        onComplete={handlePreferencesComplete}
        onBack={() => router.push('/')}
        initialPreferences={preferences}
      />
    )
  }

  if (step === 'mealplan' && mealPlan) {
    return (
      <MealPlanPreview 
        mealPlan={mealPlan} 
        onApprove={handleMealPlanApprove}
        onBack={() => {
          setStep('preferences')
          // Clear meal plan so user can regenerate with updated preferences
          setMealPlan(null)
        }}
        preferences={preferences}
      />
    )
  }

  if (step === 'cartbuilder' && mealPlan) {
    if (!preferences) {
      return <div>Loading preferences...</div>
    }
    
    return (
      <CartBuilder
        recipes={mealPlan.recipes}
        pantryItems={preferences.pantryItems || []}
        preferences={preferences}
        onProceedToCheckout={handleCartBuilderComplete}
        onBack={() => setStep('mealplan')}
      />
    )
  }

  if (step === 'cartprep') {
    return (
      <CartPreparation 
        onContinue={handleCartPreparation}
        onBack={() => setStep('cartbuilder')}
      />
    )
  }

  if (step === 'cart') {
    return (
      <div className="min-h-screen bg-health-gradient flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
            <h2 className="text-xl font-bold mb-2 text-green-800">🎉 Success!</h2>
            <p className="text-green-700">Your cart has been created and opened in Instacart. Check your email for the confirmation and shopping details.</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="btn-primary-new"
          >
            Start Over
          </button>
        </div>
      </div>
    )
  }

  const handleInstructionsContinue = () => {
    if (cartUrl) {
      window.open(cartUrl, '_blank')
    }
    setShowInstructions(false)
  }

  const handleInstructionsClose = () => {
    setShowInstructions(false)
    setStep('cartprep') // Go back to cart prep step
  }

  return (
    <>
      <InstacartInstructionsModal
        isOpen={showInstructions}
        onClose={handleInstructionsClose}
        onContinue={handleInstructionsContinue}
      />
      {null}
    </>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-health-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4 w-12 h-12"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
        </div>
      </div>
    }>
      <OnboardingPageContent />
    </Suspense>
  )
}