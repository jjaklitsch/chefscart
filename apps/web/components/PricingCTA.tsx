'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Zap, Clock } from 'lucide-react'

interface PricingCTAProps {
  location: string
  showFullFeatures?: boolean
}

export default function PricingCTA({ location, showFullFeatures = false }: PricingCTAProps) {
  const router = useRouter()

  const handleViewPricing = () => {
    // Track CTA engagement
    const userId = localStorage.getItem('chefscart_user_id') || '';
    if (typeof window !== 'undefined' && (window as any).analytics?.track) {
      (window as any).analytics.track('pricing_cta_clicked', {
        location,
        userId
      });
    }
    
    router.push('/pricing')
  }

  const handleGetStarted = () => {
    // Track CTA engagement
    const userId = localStorage.getItem('chefscart_user_id') || '';
    if (typeof window !== 'undefined' && (window as any).analytics?.track) {
      (window as any).analytics.track('get_started_clicked', {
        location,
        userId
      });
    }
    
    router.push('/')
  }

  if (showFullFeatures) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-8 text-center border border-green-200 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Meal Planning?
          </h3>
          <p className="text-lg text-gray-600 mb-6">
            Join thousands who save 5+ hours per week with AI-powered meal planning and one-click grocery shopping.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex items-center justify-center mb-3">
                <Zap className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Annual Plan</h4>
              <div className="text-2xl font-bold text-gray-900 mb-1">$4.99<span className="text-sm text-gray-600">/mo</span></div>
              <p className="text-sm text-gray-600 mb-3">Billed yearly • Save $14.40</p>
              <div className="flex items-center justify-center text-green-600 bg-green-100 px-3 py-1 rounded-full text-sm">
                <Clock className="h-4 w-4 mr-1" />
                14-day free trial
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex items-center justify-center mb-3">
                <ArrowRight className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Monthly Plan</h4>
              <div className="text-2xl font-bold text-gray-900 mb-1">$5.99<span className="text-sm text-gray-600">/mo</span></div>
              <p className="text-sm text-gray-600 mb-3">Billed monthly • Flexible</p>
              <div className="flex items-center justify-center text-blue-600 bg-blue-100 px-3 py-1 rounded-full text-sm">
                <Clock className="h-4 w-4 mr-1" />
                7-day free trial
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleViewPricing}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Choose Your Plan & Start Free Trial
            </button>
            
            <button
              onClick={handleGetStarted}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-8 rounded-xl border-2 border-gray-300 hover:border-gray-400 transition-all duration-200"
            >
              Try a Free Meal Plan First
            </button>
          </div>
          
          <p className="text-sm text-gray-500 mt-4">
            No credit card required for trial • Cancel anytime
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-6 text-center text-white shadow-lg">
      <h3 className="text-xl font-bold mb-2">
        Start at $4.99/month
      </h3>
      <p className="text-green-100 mb-4">
        Free 14-day trial • No commitment • Cancel anytime
      </p>
      <button
        onClick={handleViewPricing}
        className="bg-white text-green-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors inline-flex items-center"
      >
        View Plans & Start Trial
        <ArrowRight className="h-4 w-4 ml-2" />
      </button>
    </div>
  )
}