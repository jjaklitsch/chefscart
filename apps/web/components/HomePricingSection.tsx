'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Zap, Clock, Crown, ArrowRight, Sparkles } from 'lucide-react'
import { PRICING_PLANS } from '../lib/pricing'

export default function HomePricingSection() {
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null)
  const router = useRouter()

  const handleGetStarted = (planType: string) => {
    // Track pricing engagement
    const userId = localStorage.getItem('chefscart_user_id') || '';
    if (typeof window !== 'undefined' && (window as any).analytics?.track) {
      (window as any).analytics.track('pricing_plan_clicked', {
        plan: planType,
        location: 'home_page',
        userId
      });
    }
    
    router.push('/pricing')
  }

  return (
    <section className="mb-16 mt-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-green-600 mr-2" />
            <h2 className="text-4xl font-display font-bold text-gray-900">
              Simple, Transparent Pricing
            </h2>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Transform your meal planning and grocery shopping with AI-powered personalization. 
            Start your free trial today.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          
          {/* Annual Plan - Featured */}
          <div 
            className="relative group"
            onMouseEnter={() => setHoveredPlan('annual')}
            onMouseLeave={() => setHoveredPlan(null)}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl transform group-hover:scale-105 transition-transform duration-200 opacity-10"></div>
            <div className="relative bg-white rounded-2xl shadow-xl border-2 border-green-200 overflow-hidden transform group-hover:scale-105 transition-transform duration-200">
              {/* Popular Badge */}
              <div className="absolute top-0 right-0 bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-2 rounded-bl-xl shadow-lg">
                <span className="text-sm font-bold flex items-center">
                  <Crown className="h-4 w-4 mr-1" />
                  Most Popular
                </span>
              </div>
              
              <div className="p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Annual Plan
                  </h3>
                  <p className="text-gray-600">Best value - save 2 months!</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline mb-2">
                    <span className="text-5xl font-bold text-gray-900">
                      ${PRICING_PLANS.ANNUAL.price}
                    </span>
                    <span className="text-gray-600 ml-2 text-lg">/month</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">
                    Billed annually at ${PRICING_PLANS.ANNUAL.totalPrice}
                  </p>
                  <div className="flex items-center">
                    <span className="text-sm font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      Save ${PRICING_PLANS.ANNUAL.savings} vs monthly
                    </span>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex items-center text-green-600 mb-6 bg-green-50 p-3 rounded-lg">
                    <Clock className="h-5 w-5 mr-2" />
                    <span className="font-semibold">{PRICING_PLANS.ANNUAL.trialDays} days free trial</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700"><strong>Unlimited personalized meal plans</strong> based on your preferences</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700"><strong>Smart Instacart integration</strong> for one-click grocery ordering</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700"><strong>Advanced dietary filtering</strong> (keto, vegan, allergies, etc.)</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700"><strong>Recipe scaling</strong> for any household size</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700"><strong>Priority email support</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleGetStarted('annual')}
                  className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Zap className="h-5 w-5 mr-2" />
                  Start 14-Day Free Trial
                </button>
                
                <p className="text-xs text-gray-500 text-center mt-3">
                  Cancel anytime • No commitment during trial
                </p>
              </div>
            </div>
          </div>

          {/* Monthly Plan */}
          <div 
            className="relative group"
            onMouseEnter={() => setHoveredPlan('monthly')}
            onMouseLeave={() => setHoveredPlan(null)}
          >
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transform group-hover:scale-105 transition-transform duration-200">
              <div className="p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Monthly Plan
                  </h3>
                  <p className="text-gray-600">Flexible month-to-month billing</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline mb-2">
                    <span className="text-5xl font-bold text-gray-900">
                      ${PRICING_PLANS.MONTHLY.price}
                    </span>
                    <span className="text-gray-600 ml-2 text-lg">/month</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">Billed monthly</p>
                  <div className="h-6"></div> {/* Spacer to align with annual plan */}
                </div>

                <div className="mb-8">
                  <div className="flex items-center text-blue-600 mb-6 bg-blue-50 p-3 rounded-lg">
                    <Clock className="h-5 w-5 mr-2" />
                    <span className="font-semibold">{PRICING_PLANS.MONTHLY.trialDays} days free trial</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700"><strong>Unlimited personalized meal plans</strong> based on your preferences</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700"><strong>Smart Instacart integration</strong> for one-click grocery ordering</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700"><strong>Advanced dietary filtering</strong> (keto, vegan, allergies, etc.)</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700"><strong>Recipe scaling</strong> for any household size</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700"><strong>Priority email support</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleGetStarted('monthly')}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <ArrowRight className="h-5 w-5 mr-2" />
                  Start 7-Day Free Trial
                </button>
                
                <p className="text-xs text-gray-500 text-center mt-3">
                  Cancel anytime • No commitment during trial
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Social Proof & Value Props */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8 md:p-12 border border-gray-100">
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
          
          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <p className="text-gray-600 mb-4">
              "ChefsCart has completely transformed how I approach meal planning. The AI recommendations are spot-on, 
              and the Instacart integration makes grocery shopping effortless."
            </p>
            <div className="flex items-center justify-center">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                S
              </div>
              <div>
                <p className="font-semibold text-gray-900">Sarah Chen</p>
                <p className="text-sm text-gray-500">Busy Parent & Customer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="text-center mt-12">
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-500 mb-4">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span>Secure payments by Stripe</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span>No hidden fees</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}