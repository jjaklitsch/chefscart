"use client"

import { useState, Suspense, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import GuidedOnboarding from '../../../components/GuidedOnboarding'
import MealPlanPreview from '../../../components/MealPlanPreview'
import CartBuilder from '../../../components/CartBuilder'
import CartPreparation from '../../../components/CartPreparation'
import { UserPreferences, MealPlan } from '../../../types'

function OnboardingPageContent() {
  const [step, setStep] = useState<'preferences' | 'mealplan' | 'cartbuilder' | 'cartprep' | 'cart'>('preferences')
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [consolidatedCart, setConsolidatedCart] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
            console.log('Loading existing preferences for user:', currentUser)
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
      // Call the meal recommendation API to get personalized meals from Supabase
      const response = await fetch('/api/recommend-meals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: userPreferences,
          limit: 10 // Get top 10 meals for the user to choose from
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

      // Transform Supabase meals to our Recipe format
      const recipes = data.meals.map((meal: any) => ({
        id: meal.id,
        title: meal.title,
        description: meal.description,
        cuisine: meal.cuisines[0] || 'international',
        imageUrl: meal.image_url || '/images/placeholder-meal.webp',
        ingredients: (meal.ingredients_json?.ingredients || []).map((ing: any) => ({
          name: ing.display_name,
          amount: ing.quantity,
          unit: ing.unit
        })),
        difficulty: 'easy', // Default since Supabase doesn't have difficulty levels
        cookTime: meal.time_total_min,
        prepTime: 15, // Default prep time
        servings: meal.servings_default,
        estimatedCost: meal.cost_per_serving === '$' ? 8 : meal.cost_per_serving === '$$' ? 15 : 25,
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
      }))

      // Create meal plan with selected recipes
      const mealPlan: MealPlan = {
        id: `mealplan_${Date.now()}`,
        userId: `temp_${Date.now()}`,
        recipes: recipes,
        backupRecipes: [],
        subtotalEstimate: recipes.reduce((sum: number, r: any) => sum + (r.estimatedCost || 15), 0),
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
      console.log('Saving user data locally...')
      
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
      
      console.log('User data saved successfully. Creating Instacart cart...')
      
      // Call the production cart creation API
      const response = await fetch('/api/create-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: mealPlan.id,
          userId: userId,
          email,
          mealPlanId: mealPlanId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create cart')
      }

      const data = await response.json()
      console.log('Cart created:', data)
      
      // Update meal plan status locally (will migrate to Supabase later)
      const updatedMealPlanData = { ...mealPlanData, status: 'cart_created', updatedAt: new Date().toISOString() }
      localStorage.setItem(`chefscart_mealplan_${mealPlanId}`, JSON.stringify(updatedMealPlanData))
      
      // Redirect to Instacart cart
      if (data.cartUrl) {
        window.open(data.cartUrl, '_blank')
      }
      
      setStep('cart')

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
    return (
      <CartBuilder
        recipes={mealPlan.recipes}
        pantryItems={preferences?.pantryItems || []}
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

  return null
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