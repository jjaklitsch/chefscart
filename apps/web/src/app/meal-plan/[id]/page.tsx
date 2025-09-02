'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, ShoppingCart, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import Header from '../../../../components/Header'
import Footer from '../../../../components/Footer'
import MealPlanPreview from '../../../../components/MealPlanPreview'
import { MealPlan, UserPreferences } from '../../../../types'

export default function MealPlanPage() {
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
      
      // Load preferences from the stored data or user metadata
      if (planData.preferences) {
        setPreferences(planData.preferences)
      } else {
        // Try to load from localStorage if not in plan data
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

  const handleApprove = () => {
    // Navigate to cart builder
    router.push(`/cart-builder/${id}`)
  }

  const handleBack = () => {
    // Check if this was a quick plan
    const storedData = localStorage.getItem(`chefscart_mealplan_${id}`)
    if (storedData) {
      const planData = JSON.parse(storedData)
      if (planData.quickPlan) {
        router.push('/preferences')
        return
      }
    }
    
    // Default back behavior
    router.back()
  }

  const handleRegenerate = () => {
    // For quick plans, go back to quick-plan page
    const storedData = localStorage.getItem(`chefscart_mealplan_${id}`)
    if (storedData) {
      const planData = JSON.parse(storedData)
      if (planData.quickPlan) {
        router.push('/quick-plan')
        return
      }
    }
    
    // For regular plans, go back to onboarding
    router.push('/onboarding')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Header />
        <div className="min-h-screen bg-health-gradient flex items-center justify-center">
          <div className="text-center">
            <div className="loading-spinner mx-auto mb-4 w-12 h-12"></div>
            <h2 className="text-xl font-semibold text-gray-900">Loading meal plan...</h2>
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
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Meal Plan Not Found</h2>
              <p className="text-gray-600 mb-6">
                {error || 'The meal plan you\'re looking for doesn\'t exist or may have expired.'}
              </p>
              <div className="space-y-3">
                <Link
                  href="/quick-plan"
                  className="block bg-brand-green hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Create New Meal Plan
                </Link>
                <Link
                  href="/dashboard"
                  className="block border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      
      <div className="min-h-screen bg-health-gradient">
        {/* Custom header for meal plan page */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </button>
              
              <button
                onClick={handleRegenerate}
                className="inline-flex items-center gap-2 text-brand-green hover:text-green-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Generate New Plan
              </button>
            </div>
          </div>
        </div>

        <MealPlanPreview 
          mealPlan={mealPlan}
          onApprove={handleApprove}
          onBack={handleBack}
          preferences={preferences}
        />
      </div>
      
      <Footer />
    </div>
  )
}