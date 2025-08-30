'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { PRICING_PLANS } from '../../../lib/pricing'
import { CheckCircle, Zap, Clock, ArrowLeft, Sparkles, Crown } from 'lucide-react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'

export default function PricingPage() {
  const [loading, setLoading] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState<'annual' | 'monthly'>('annual') // Default to annual
  const { user, session } = useAuth()
  const router = useRouter()

  const currentPlan = billingPeriod === 'annual' ? PRICING_PLANS.ANNUAL : PRICING_PLANS.MONTHLY

  const handleSelectPlan = async () => {
    if (!user || !session) {
      router.push('/login?redirect=/pricing')
      return
    }

    setLoading(true)

    try {
      const priceId = billingPeriod === 'annual' 
        ? process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID 
        : process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID

      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          email: user.email,
          userId: user.id,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else {
        console.error('Error creating subscription:', data.error)
        alert(data.error || 'Failed to start subscription')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-green-600 mr-2" />
            <h1 className="text-4xl font-bold text-gray-900">
              Choose Your Plan
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get personalized meal planning with smart grocery shopping. Start your free trial today.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center mb-12">
          <div className="bg-white rounded-xl p-1 shadow-lg border">
            <div className="flex items-center">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  billingPeriod === 'monthly'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 relative ${
                  billingPeriod === 'annual'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Annual
                {billingPeriod === 'annual' && (
                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                    Save ${PRICING_PLANS.ANNUAL.savings}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Pricing Card */}
        <div className="max-w-lg mx-auto">
          <div className="relative bg-white rounded-2xl shadow-2xl border-2 border-green-200 overflow-hidden">
            {/* Popular Badge for Annual */}
            {billingPeriod === 'annual' && (
              <div className="absolute top-0 right-0 bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-2 rounded-bl-xl">
                <span className="text-sm font-bold flex items-center">
                  <Crown className="h-4 w-4 mr-1" />
                  Most Popular
                </span>
              </div>
            )}
            
            <div className="p-8">
              {/* Pricing Header */}
              <div className="text-center mb-8">
                <div className="mb-4">
                  {billingPeriod === 'annual' ? (
                    <div>
                      <div className="flex items-center justify-center mb-2">
                        <span className="text-5xl font-bold text-gray-900">
                          ${currentPlan.price}
                        </span>
                        <span className="text-gray-600 ml-2 text-lg">/month</span>
                      </div>
                      <div className="mb-2">
                        <span className="text-gray-500 line-through text-lg mr-2">
                          ${PRICING_PLANS.MONTHLY.price * 12}/year
                        </span>
                        <span className="text-2xl font-bold text-green-600">
                          ${currentPlan.totalPrice}/year
                        </span>
                      </div>
                      <p className="text-green-600 font-semibold bg-green-100 inline-block px-3 py-1 rounded-full text-sm">
                        Save ${currentPlan.savings} vs monthly billing
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-center mb-2">
                        <span className="text-5xl font-bold text-gray-900">
                          ${currentPlan.price}
                        </span>
                        <span className="text-gray-600 ml-2 text-lg">/month</span>
                      </div>
                      <p className="text-gray-500">Billed monthly • No commitment</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Free Trial */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center bg-blue-50 p-4 rounded-xl">
                  <Clock className="h-6 w-6 text-blue-600 mr-3" />
                  <div>
                    <p className="font-bold text-blue-900">
                      {currentPlan.trialDays}-Day Free Trial
                    </p>
                    <p className="text-blue-700 text-sm">
                      Full access • Cancel anytime during trial
                    </p>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 font-medium">Unlimited personalized meal plans tailored to your dietary needs</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 font-medium">Smart Instacart integration for one-click grocery ordering</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 font-medium">Advanced filtering for diets, allergies, and preferences</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 font-medium">Automatic recipe scaling for any household size</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 font-medium">500+ professionally curated recipes</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 font-medium">Priority email support</span>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={handleSelectPlan}
                disabled={loading}
                className={`w-full font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 ${
                  billingPeriod === 'annual'
                    ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white'
                    : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    Start {currentPlan.trialDays}-Day Free Trial
                  </>
                )}
              </button>
              
              <p className="text-xs text-gray-500 text-center mt-4">
                No credit card required for trial • Secure payments by Stripe
              </p>
            </div>
          </div>
        </div>

        {/* Value Proposition */}
        <div className="max-w-3xl mx-auto mt-16">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-2">5+ hrs</div>
                <div className="text-gray-600">Saved per week on meal planning</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-2">500+</div>
                <div className="text-gray-600">Carefully curated recipes</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-2">30 sec</div>
                <div className="text-gray-600">To checkout with Instacart</div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-2xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I change my plan later?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade, downgrade, or cancel your subscription at any time from your account settings.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                What happens during the free trial?
              </h3>
              <p className="text-gray-600">
                You get full access to all features. We'll remind you before your trial ends, and you can cancel anytime with no charges.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                How does the grocery integration work?
              </h3>
              <p className="text-gray-600">
                We partner with Instacart to automatically add your meal plan ingredients to your cart, making grocery shopping effortless.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  )
}