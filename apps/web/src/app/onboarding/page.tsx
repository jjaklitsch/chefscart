"use client"

import { useState, Suspense, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import GuidedOnboarding from '../../../components/GuidedOnboarding'
import MealPlanPreview from '../../../components/MealPlanPreview'
import CartBuilder from '../../../components/CartBuilder'
import CartPreparation from '../../../components/CartPreparation'
import { UserPreferences, MealPlan } from '../../../types'
import { FirestoreService } from '../../../lib/firestore'

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
      
      // Show meal plan immediately with loading states for images
      const mealPlanWithLoadingImages = {
        ...data.mealPlan,
        recipes: data.mealPlan.recipes.map((recipe: any) => {
          console.log(`🔍 Recipe from API:`, { id: recipe.id, title: recipe.title })
          return {
            ...recipe,
            imageLoading: true,
            imageError: false
          }
        })
      }
      
      setMealPlan(mealPlanWithLoadingImages)
      setStep('mealplan')
      setIsLoading(false)

      // Step 2: Generate images in background (non-blocking)
      generateImagesInBackground(data.mealPlan.recipes)

    } catch (err) {
      console.error('Error generating meal plan:', err)
      setError('We\'re having trouble creating your meal plan. Please check your internet connection and try again.')
      setIsLoading(false)
    }
  }

  const generateImagesInBackground = async (recipes: any[]) => {
    try {
      console.log('Generating images in background...')
      
      // Generate all images in true parallel with aggressive timeouts
      console.log(`Starting parallel image generation for ${recipes.length} recipes...`)
      const imageStartTime = Date.now()
      
      console.log(`🔍 All recipes being processed for images:`, recipes.map(r => ({ id: r.id, title: r.title })))
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
              setTimeout(() => reject(new Error('Individual image timeout')), 45000) // 45s timeout to match replacement images
            )
          ])
          
          if (response.ok) {
            const data = await response.json()
            console.log(`✅ Generated image for ${recipe.title}`)
            return { id: recipe.id, url: data.imageUrl, success: true }
          }
        } catch (error) {
          console.warn(`❌ Failed to generate image for ${recipe.title}:`, error instanceof Error ? error.message : error)
        }
        return { id: recipe.id, url: '/images/placeholder-meal.webp', success: false }
      })

      // Process ALL images simultaneously (true parallel execution)
      console.log(`🚀 Starting ${imagePromises.length} parallel image requests simultaneously...`)
      
      imagePromises.forEach((imagePromise, index) => {
        // Don't await here - let all promises run simultaneously
        imagePromise
          .then(result => {
            console.log(`✅ Image ${index + 1}/${recipes.length} completed for: ${recipes[index].title}`)
            console.log(`🔗 Image URL:`, result.url)
            console.log(`🆔 Recipe ID:`, result.id)
            
            // Update this specific recipe's image immediately
            setMealPlan(prevPlan => {
              if (!prevPlan) return null
              
              console.log(`🔍 Trying to update recipe with ID: ${result.id}`)
              console.log(`🔍 Available recipe IDs:`, prevPlan.recipes.map(r => r.id))
              
              let foundMatch = false
              const updatedPlan = {
                ...prevPlan,
                recipes: prevPlan.recipes.map(recipe => {
                  const isMatch = recipe.id === result.id
                  if (isMatch) {
                    foundMatch = true
                    console.log(`✅ Found matching recipe: ${recipe.title} (ID: ${recipe.id})`)
                  }
                  return isMatch 
                    ? { ...recipe, imageUrl: result.url, imageLoading: false }
                    : recipe
                })
              }
              
              if (!foundMatch) {
                console.warn(`❌ No matching recipe found for ID: ${result.id}`)
              }
              
              console.log(`🔄 Updated recipe ${result.id} with image in meal plan`)
              return updatedPlan
            })
          })
          .catch(error => {
            console.warn(`❌ Image ${index + 1} failed for ${recipes[index].title}:`, error.message)
            
            // Mark this specific recipe's image as failed
            setMealPlan(prevPlan => {
              if (!prevPlan) return null
              
              return {
                ...prevPlan,
                recipes: prevPlan.recipes.map(recipe => 
                  recipe.id === recipes[index].id 
                    ? { ...recipe, imageLoading: false, imageError: true }
                    : recipe
                )
              }
            })
          })
      })

      // Log the start of parallel processing
      const imageTime = Date.now() - imageStartTime
      console.log(`🎨 Started ${recipes.length} parallel image generations at ${imageTime}ms`)
      
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

  const handleCartPreparation = async (email: string) => {
    if (!mealPlan || !preferences) return

    setIsLoading(true)
    setError(null)

    try {
      console.log('Saving user data to Firestore...')
      
      // Get zipCode from localStorage
      const zipCode = localStorage.getItem('chefscart_zipcode') || ''
      
      // Create user and save data to Firestore
      const userId = await FirestoreService.createUser(email, zipCode, preferences)
      
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
      
      // Save meal plan and shopping list
      const mealPlanId = await FirestoreService.saveMealPlan(
        userId, 
        email, 
        zipCode, 
        mealPlan, 
        consolidatedCart
      )
      
      console.log('User data saved successfully. Creating Instacart cart...')
      
      // Call the mock cart creation API
      const response = await fetch('/api/create-cart-mock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: mealPlan.id,
          userId: userId,
          email,
          firestoreMealPlanId: mealPlanId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create cart')
      }

      const data = await response.json()
      console.log('Cart created:', data)
      
      // Update meal plan status to indicate cart was created
      await FirestoreService.updateMealPlanStatus(mealPlanId, 'cart_created')
      
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