"use client"

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PreferencesChat from '../../../components/PreferencesChat'
import MealPlanPreview from '../../../components/MealPlanPreview'
import { UserPreferences, MealPlan } from '../../../types'

function ChatPageContent() {
  const [step, setStep] = useState<'preferences' | 'mealplan' | 'cart'>('preferences')
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const zipCode = searchParams?.get('zip') || ''

  const handlePreferencesComplete = async (userPreferences: UserPreferences) => {
    setPreferences(userPreferences)
    setIsLoading(true)
    setError(null)

    try {
      // Generate a temporary user ID for anonymous users
      const userId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      console.log('Calling GPT meal plan generation...')
      
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

  const handleMealPlanApprove = async () => {
    if (!mealPlan) return

    setIsLoading(true)
    setError(null)

    try {
      console.log('Creating Instacart cart...')
      
      // Call the mock cart creation API
      const response = await fetch('/api/create-cart-mock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: mealPlan.id,
          userId: mealPlan.userId
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {step === 'preferences' ? 'Generating your meal plan...' : 'Creating your cart...'}
          </h2>
          <p className="text-gray-600">This may take a few moments</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
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
            className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (step === 'preferences') {
    return <PreferencesChat onPreferencesComplete={handlePreferencesComplete} />
  }

  if (step === 'mealplan' && mealPlan) {
    return (
      <MealPlanPreview 
        mealPlan={mealPlan} 
        onApprove={handleMealPlanApprove}
        onBack={() => setStep('preferences')}
      />
    )
  }

  if (step === 'cart') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            <h2 className="text-xl font-bold mb-2">🎉 Success!</h2>
            <p>Your cart has been created and opened in Instacart. Check your email for the confirmation and shopping details.</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
        </div>
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  )
}