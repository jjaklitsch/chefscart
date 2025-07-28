"use client"

import { useState, Suspense, useCallback } from 'react'
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

  const handlePreferencesComplete = async (userPreferences: UserPreferences) => {
    setPreferences(userPreferences)
    setIsLoading(true)
    setError(null)

    try {
      // Generate a temporary user ID for anonymous users
      const userId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      console.log('Starting progressive meal plan generation...')
      
      // Get zipCode from localStorage
      const zipCode = localStorage.getItem('chefscart_zipcode') || ''
      
      // Step 1: Generate basic meal plan (fast) - text only
      const response = await fetch('/api/generate-mealplan-fast', {
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
      console.log('Basic meal plan generated:', data)
      
      // Show meal plan immediately with loading states
      setMealPlan(data.mealPlan)
      setStep('mealplan')
      setIsLoading(false)

      // Step 2: Generate images in background (non-blocking)
      generateImagesInBackground(data.mealPlan.recipes)

    } catch (err) {
      console.error('Error generating meal plan:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate meal plan')
      setIsLoading(false)
    }
  }

  const generateImagesInBackground = async (recipes: any[]) => {
    try {
      console.log('Generating images in background...')
      
      // Generate all images in true parallel with aggressive timeouts
      console.log(`Starting parallel image generation for ${recipes.length} recipes...`)
      const imageStartTime = Date.now()
      
      const imagePromises = recipes.map(async (recipe) => {
        try {
          // Race against timeout for each individual image
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
                thumbnail: true
              })
            }),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Individual image timeout')), 12000) // 12s per image
            )
          ])
          
          if (response.ok) {
            const data = await response.json()
            console.log(`✅ Generated image for ${recipe.title}`)
            return { id: recipe.id, url: data.imageUrl, success: true }
          }
        } catch (error) {
          console.warn(`❌ Failed to generate image for ${recipe.title}:`, error.message)
        }
        return { id: recipe.id, url: '/images/placeholder-meal.webp', success: false }
      })

      // Wait for ALL images to complete or timeout (true parallel)
      const imageResults = await Promise.allSettled(imagePromises)
      const imageMap: Record<string, string> = {}
      let successCount = 0
      
      imageResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          imageMap[result.value.id] = result.value.url
          if (result.value.success) successCount++
        } else {
          imageMap[recipes[index].id] = '/images/placeholder-meal.webp'
        }
      })

      const imageTime = Date.now() - imageStartTime
      console.log(`🎨 Image generation complete: ${successCount}/${recipes.length} successful in ${imageTime}ms`)

      // Update meal plan with generated images
      setMealPlan(prevPlan => {
        if (!prevPlan) return null
        
        return {
          ...prevPlan,
          recipes: prevPlan.recipes.map(recipe => ({
            ...recipe,
            imageUrl: imageMap[recipe.id] || recipe.imageUrl,
            imageLoading: false
          }))
        }
      })
      
      console.log('Images loaded successfully')
    } catch (error) {
      console.error('Background image generation failed:', error)
      // Mark all images as failed to load
      setMealPlan(prevPlan => {
        if (!prevPlan) return null
        
        return {
          ...prevPlan,
          recipes: prevPlan.recipes.map(recipe => ({
            ...recipe,
            imageLoading: false,
            imageError: true
          }))
        }
      })
    }
  }

  const handleMealPlanApprove = () => {
    setStep('cartbuilder')
  }

  const handleCartBuilderComplete = (finalCart: any[]) => {
    setConsolidatedCart(finalCart)
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