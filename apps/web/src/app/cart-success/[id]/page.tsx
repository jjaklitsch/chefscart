'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { CheckCircle, ExternalLink, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../../../contexts/AuthContext'
import InstacartInstructionsModal from '../../../../components/InstacartInstructionsModal'

export default function CartSuccessPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  
  const [mealPlanData, setMealPlanData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [autoRedirectTimer, setAutoRedirectTimer] = useState(3)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    loadMealPlanData()
  }, [id])

  // Auto-show instructions modal for all users when cart is ready
  useEffect(() => {
    if (mealPlanData?.cartUrl && !loading) {
      // Show instructions modal immediately
      setTimeout(() => {
        setShowInstructions(true)
      }, 500) // Small delay to ensure page is fully loaded
    }
  }, [mealPlanData, loading])

  // Auto-redirect for signed-in users (but only after they interact with modal)
  useEffect(() => {
    if (user && !showInstructions && mealPlanData?.cartUrl) {
      // Start countdown to redirect to dashboard only after modal is closed
      const timer = setInterval(() => {
        setAutoRedirectTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            router.push('/dashboard')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
    return undefined
  }, [user, showInstructions, mealPlanData, router])

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

  const openInstacartCart = () => {
    if (mealPlanData?.cartUrl) {
      setShowInstructions(true)
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
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center">
          {/* Success Animation */}
          <div className="relative mx-auto mb-8">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle className="w-4 h-4 text-white" />
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

          {/* Action Buttons */}
          <div className="space-y-4">
            {user ? (
              /* Signed-in user experience */
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium mb-2">🚀 Your Instacart cart is opening now!</p>
                  <p className="text-sm text-green-700">
                    Redirecting to dashboard in {autoRedirectTimer} seconds...
                  </p>
                </div>
                
                {mealPlanData?.cartUrl && (
                  <button
                    onClick={openInstacartCart}
                    className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Open Cart Again
                  </button>
                )}
              </div>
            ) : (
              /* Guest user experience */
              <div className="space-y-4">
                {mealPlanData?.cartUrl && (
                  <button
                    onClick={openInstacartCart}
                    className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Open Instacart Cart
                  </button>
                )}
                
                <div className="flex items-center justify-center gap-4">
                  <Link
                    href="/quick-plan"
                    className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-green-600 border-2 border-green-600 px-6 py-3 rounded-xl font-semibold transition-all duration-300"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Create Another Plan
                  </Link>
                  
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 px-6 py-3 rounded-xl font-semibold transition-colors"
                  >
                    <Home className="w-5 h-5" />
                    Back to Home
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Email Notice - Only show if email was provided */}
          {mealPlanData?.email && (
            <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>📧 Check your email!</strong> We've sent you a detailed meal plan with cooking instructions and your shopping list to {mealPlanData.email}.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Instacart Instructions Modal */}
      <InstacartInstructionsModal
        isOpen={showInstructions}
        cartUrl={mealPlanData?.cartUrl}
        onClose={() => setShowInstructions(false)}
        onContinue={() => {
          if (mealPlanData?.cartUrl) {
            window.open(mealPlanData.cartUrl, '_blank')
          }
          setShowInstructions(false)
        }}
      />
    </div>
  )
}