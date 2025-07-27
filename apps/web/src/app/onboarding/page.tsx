"use client"

import { useState, Suspense, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import GuidedOnboarding from '../../../components/GuidedOnboarding'
import MealPlanPreview from '../../../components/MealPlanPreview'
import CartPreparation from '../../../components/CartPreparation'
import { UserPreferences, MealPlan } from '../../../types'

function OnboardingPageContent() {
  const [step, setStep] = useState<'preferences' | 'mealplan' | 'cartprep' | 'cart'>('preferences')
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handlePreferencesComplete = async (userPreferences: UserPreferences) => {
    setPreferences(userPreferences)
    setIsLoading(true)
    setError(null)

    try {
      // Generate a temporary user ID for anonymous users
      const userId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      console.log('Calling GPT meal plan generation...')
      
      // Get zipCode from localStorage
      const zipCode = localStorage.getItem('chefscart_zipcode') || ''
      
      // Call the direct OpenAI API for testing
      const response = await fetch('/api/generate-mealplan-mock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          preferences: userPreferences,
          zipCode
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate meal plan')
      }

      const data = await response.json()
      console.log('Meal plan generated:', data)
      
      setMealPlan(data.mealPlan)
      setStep('mealplan')

    } catch (err) {
      console.error('Error generating meal plan:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate meal plan')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMealPlanApprove = () => {
    setStep('cartprep')
  }

  const handleCartPreparation = async (email: string, additionalItems: string[]) => {
    if (!mealPlan) return

    setIsLoading(true)
    setError(null)

    try {
      console.log('Creating Instacart cart...')
      
      // Call the mock cart creation API with email and additional items
      const response = await fetch('/api/create-cart-mock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: mealPlan.id,
          userId: mealPlan.userId,
          email,
          additionalItems
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create cart')
      }

      const data = await response.json()
      console.log('Cart created:', data)
      
      // Redirect to Instacart cart
      if (data.cartUrl) {
        window.open(data.cartUrl, '_blank')
      }
      
      setStep('cart')

    } catch (err) {
      console.error('Error creating cart:', err)
      setError(err instanceof Error ? err.message : 'Failed to create cart')
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
      />
    )
  }

  if (step === 'mealplan' && mealPlan) {
    return (
      <MealPlanPreview 
        mealPlan={mealPlan} 
        onApprove={handleMealPlanApprove}
        onBack={() => setStep('preferences')}
        preferences={preferences}
      />
    )
  }

  if (step === 'cartprep') {
    return (
      <CartPreparation 
        onContinue={handleCartPreparation}
        onBack={() => setStep('mealplan')}
      />
    )
  }

  if (step === 'cart') {
    return (
      <div className="min-h-screen bg-health-gradient flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="alert-success mb-4">
            <h2 className="text-xl font-bold mb-2">🎉 Success!</h2>
            <p>Your cart has been created and opened in Instacart. Check your email for the confirmation and shopping details.</p>
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