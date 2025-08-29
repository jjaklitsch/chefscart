'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../../contexts/AuthContext'
import CartPreparation from '../../../../components/CartPreparation'

export default function CartPreparationPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const id = params.id as string
  
  const [mealPlanData, setMealPlanData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreatingCart, setIsCreatingCart] = useState(false)

  useEffect(() => {
    loadMealPlanData()
  }, [id])

  const loadMealPlanData = () => {
    try {
      const storedData = localStorage.getItem(`chefscart_mealplan_${id}`)
      if (!storedData) {
        setError('Meal plan not found')
        setLoading(false)
        return
      }

      const planData = JSON.parse(storedData)
      setMealPlanData(planData)
      setLoading(false)
    } catch (err) {
      console.error('Error loading meal plan data:', err)
      setError('Failed to load meal plan')
      setLoading(false)
    }
  }

  const handleCartPreparation = async (email: string) => {
    if (!mealPlanData) return

    setIsCreatingCart(true)
    setError(null)

    try {

      // Get zipCode from localStorage or user data
      const zipCode = mealPlanData.zipCode || localStorage.getItem('chefscart_zipcode') || ''
      
      // Update the meal plan data with final email
      const updatedMealPlanData = {
        ...mealPlanData,
        email,
        zipCode,
        status: 'cart_creating',
        updatedAt: new Date().toISOString()
      }
      localStorage.setItem(`chefscart_mealplan_${id}`, JSON.stringify(updatedMealPlanData))

      // Call the cart creation API
      const response = await fetch('/api/create-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: id,
          userId: user?.id || `temp_${Date.now()}`,
          email,
          userPreferences: mealPlanData.preferences || mealPlanData.mealPlan.preferences,
          mealPlanData: {
            mealPlan: mealPlanData.mealPlan,
            consolidatedCart: mealPlanData.consolidatedCart
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create cart')
      }

      const data = await response.json()
      
      // Update meal plan status
      const finalMealPlanData = { 
        ...updatedMealPlanData, 
        status: 'cart_created', 
        cartUrl: data.cartUrl,
        updatedAt: new Date().toISOString() 
      }
      localStorage.setItem(`chefscart_mealplan_${id}`, JSON.stringify(finalMealPlanData))
      
      // Redirect to success page
      router.push(`/cart-success/${id}`)

    } catch (err) {
      console.error('Error in cart preparation:', err)
      setError(err instanceof Error ? err.message : 'Unable to create your cart. Please try again.')
    } finally {
      setIsCreatingCart(false)
    }
  }

  const handleBack = () => {
    router.push(`/cart-builder/${id}`)
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

  if (error || !mealPlanData) {
    return (
      <div className="min-h-screen bg-health-gradient flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
            <p className="text-gray-600 mb-6">
              {error || 'Unable to load the meal plan data.'}
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
    )
  }

  return (
    <div className="min-h-screen bg-health-gradient">
      <CartPreparation 
        onContinue={handleCartPreparation}
        onBack={handleBack}
        isLoading={isCreatingCart}
        defaultEmail={user?.email || ''}
      />
    </div>
  )
}