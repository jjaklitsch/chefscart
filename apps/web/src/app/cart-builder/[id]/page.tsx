'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import CartBuilder from '../../../../components/CartBuilder'
import Header from '../../../../components/Header'
import Footer from '../../../../components/Footer'
import { MealPlan, UserPreferences } from '../../../../types'

export default function CartBuilderPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMealPlan()
  }, [id])

  const loadMealPlan = () => {
    try {
      const storedData = localStorage.getItem(`chefscart_mealplan_${id}`)
      if (!storedData) {
        setError('Meal plan not found')
        setLoading(false)
        return
      }

      const planData = JSON.parse(storedData)
      setMealPlan(planData.mealPlan)
      
      // Load preferences
      if (planData.preferences) {
        setPreferences(planData.preferences)
      } else {
        // Try to load from localStorage
        const currentUser = localStorage.getItem('chefscart_current_user')
        if (currentUser) {
          const userData = localStorage.getItem(`chefscart_user_${currentUser}`)
          if (userData) {
            const parsedUserData = JSON.parse(userData)
            setPreferences(parsedUserData.preferences)
          }
        }
      }
      
      setLoading(false)
    } catch (err) {
      console.error('Error loading meal plan:', err)
      setError('Failed to load meal plan')
      setLoading(false)
    }
  }

  const handleCartBuilderComplete = (finalCart: any[]) => {
    // Update the meal plan data with the consolidated cart
    try {
      const storedData = localStorage.getItem(`chefscart_mealplan_${id}`)
      if (storedData) {
        const planData = JSON.parse(storedData)
        planData.consolidatedCart = finalCart
        planData.updatedAt = new Date().toISOString()
        localStorage.setItem(`chefscart_mealplan_${id}`, JSON.stringify(planData))
      }
    } catch (error) {
      console.error('Error updating meal plan with cart:', error)
    }

    // Navigate to cart preparation
    router.push(`/cart-preparation/${id}`)
  }

  const handleBack = () => {
    router.push(`/meal-plan/${id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Header />
        <div className="min-h-screen bg-health-gradient flex items-center justify-center">
          <div className="text-center">
            <div className="loading-spinner mx-auto mb-4 w-12 h-12"></div>
            <h2 className="text-xl font-semibold text-gray-900">Loading cart builder...</h2>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !mealPlan) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Header />
        <div className="min-h-screen bg-health-gradient flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Cart</h2>
              <p className="text-gray-600 mb-6">
                {error || 'Unable to load the meal plan for cart building.'}
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-brand-green hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!preferences) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Header />
        <div className="flex items-center justify-center py-12">
          <div>Loading preferences...</div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <CartBuilder
        recipes={mealPlan.recipes}
        pantryItems={preferences.pantryItems || []}
        preferences={preferences}
        onProceedToCheckout={handleCartBuilderComplete}
        onBack={handleBack}
      />
      <Footer />
    </div>
  )
}