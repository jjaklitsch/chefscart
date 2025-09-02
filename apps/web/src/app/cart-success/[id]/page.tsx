'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, ExternalLink, Home, ShoppingCart, Store, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import Header from '../../../../components/Header'
import Footer from '../../../../components/Footer'

export default function CartSuccessPage() {
  const params = useParams()
  const id = params.id as string
  
  const [mealPlanData, setMealPlanData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [instacartRedirectTimer, setInstacartRedirectTimer] = useState(3)

  useEffect(() => {
    loadMealPlanData()
  }, [id])

  // Auto-redirect: Open Instacart in new tab AND redirect current tab
  useEffect(() => {
    if (mealPlanData?.cartUrl && !loading) {
      // Start countdown timer for dual redirect
      const timer = setInterval(() => {
        setInstacartRedirectTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            // Try to open Instacart in new tab (may be blocked by popup blocker)
            window.open(mealPlanData.cartUrl, '_blank')
            // Note: No automatic redirect - let user stay on success page
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
    return undefined
  }, [mealPlanData, loading])

  const loadMealPlanData = () => {
    try {
      const storedData = localStorage.getItem(`chefscart_mealplan_${id}`)
      if (storedData) {
        const planData = JSON.parse(storedData)
        setMealPlanData(planData)
      }
      setLoading(false)
    } catch (err) {
      console.error('Error loading meal plan data:', err)
      setLoading(false)
    }
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

  return (
    <div className="min-h-screen bg-health-gradient">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          {/* Success Animation */}
          <div className="relative mx-auto mb-8">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎉 Success!
          </h1>
          
          <p className="text-xl text-gray-600 mb-8">
            Your meal plan and shopping cart have been created successfully!
          </p>

          {/* Success Details */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 text-left">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              What's Ready for You
            </h3>
            
            <div className="space-y-3 text-gray-600">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>✅ {mealPlanData?.mealPlan?.recipes?.length || 0} personalized recipes selected</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>✅ Smart shopping list created on Instacart</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>✅ Ingredients consolidated and optimized</span>
              </div>
              {mealPlanData?.email && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>✅ Confirmation email sent to {mealPlanData.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Primary Instacart CTA */}
          <div className="space-y-6">
            {mealPlanData?.cartUrl && (
              <div className="space-y-4">
                {/* Main CTA Button */}
                <button
                  onClick={() => {
                    window.open(mealPlanData.cartUrl, '_blank')
                    setInstacartRedirectTimer(0)
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold text-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-3"
                >
                  <ExternalLink className="w-6 h-6" />
                  Start Shopping on Instacart
                </button>

                {/* Auto-redirect notice */}
                {instacartRedirectTimer > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-green-700">
                      ⏱️ Auto-opening in {instacartRedirectTimer} second{instacartRedirectTimer !== 1 ? 's' : ''} • We'll take you back home after
                    </p>
                  </div>
                )}
              </div>
            )}

            {instacartRedirectTimer === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <p className="text-blue-800 font-medium mb-2">✅ Redirecting...</p>
                <p className="text-sm text-blue-700">
                  Taking you back to the homepage. Instacart should open in a new tab.
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-center mt-6">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
              >
                <Home className="w-4 h-4" />
                Back to Home
              </Link>
            </div>
          </div>

          {/* Instacart Shopping Tips */}
          <div className="mt-12 bg-amber-50 border border-amber-200 rounded-lg p-6 text-left">
            <h3 className="font-semibold text-amber-900 mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Tips for Shopping on Instacart
            </h3>
            
            <div className="space-y-3 text-amber-800">
              <div className="flex items-start gap-3">
                <Store className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span><strong>Choose your preferred retailer:</strong> You can select from Whole Foods, Kroger, Safeway, ALDI, and other stores in your area based on your preferences for quality and pricing.</span>
              </div>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span><strong>Look for alternatives:</strong> Some ingredients may be sold out. Check for similar items or try different retailers if your preferred items aren't available.</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span><strong>Review your cart:</strong> Double-check quantities and make any adjustments before checkout. You can add or remove items as needed.</span>
              </div>
            </div>
          </div>

          {/* Email Notice - Only show if email was provided */}
          {mealPlanData?.email && (
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>📧 Check your email!</strong> We've sent you a detailed meal plan with cooking instructions and your shopping list to {mealPlanData.email}.
              </p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}