"use client"

import { useState, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ConversationalChat from '../../../components/ConversationalChat/ConversationalChat'
import MealPlanPreview from '../../../components/MealPlanPreview'
import ProgressTracker from '../../../components/ProgressTracker'
import { UserPreferences, MealPlan } from '../../../types'

function ChatPageContent() {
  const [step, setStep] = useState<'preferences' | 'mealplan' | 'cart'>('preferences')
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProgressTrackerCollapsed, setIsProgressTrackerCollapsed] = useState(false)
  const [currentPreferences, setCurrentPreferences] = useState<Partial<UserPreferences>>({})
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const zipCode = searchParams?.get('zip') || ''

  const handleProgressUpdate = useCallback((newPreferences: Partial<UserPreferences>) => {
    setCurrentPreferences(newPreferences)
  }, [])

  const handleEditProgressItem = useCallback((itemKey: string) => {
    // This would trigger the ConversationalChat component to jump to the specific step
    // For now, just log - would need to implement step navigation in ConversationalChat
    console.log('Edit progress item:', itemKey)
  }, [])

  const handlePreferencesComplete = async (userPreferences: UserPreferences) => {
    setPreferences(userPreferences)
    setCurrentPreferences(userPreferences)
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
      <div className="min-h-screen bg-health-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4 w-12 h-12"></div>
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
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (step === 'preferences') {
    return (
      <div className="relative">
        <ConversationalChat 
          onPreferencesComplete={handlePreferencesComplete}
          onProgressUpdate={handleProgressUpdate}
        />
        <ProgressTracker
          preferences={currentPreferences}
          onEditItem={handleEditProgressItem}
          isCollapsed={isProgressTrackerCollapsed}
          onToggleCollapse={() => setIsProgressTrackerCollapsed(!isProgressTrackerCollapsed)}
        />
      </div>
    )
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
      <div className="min-h-screen bg-health-gradient flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="alert-success mb-4">
            <h2 className="text-xl font-bold mb-2">🎉 Success!</h2>
            <p>Your cart has been created and opened in Instacart. Check your email for the confirmation and shopping details.</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="btn-primary"
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
      <div className="min-h-screen bg-health-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4 w-12 h-12"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
        </div>
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  )
}