"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChefHat, MapPin, Clock, DollarSign } from 'lucide-react'
import ZipCodeInput from '../../components/ZipCodeInput'
import HeadlineABTest from '../../components/HeadlineABTest'
import analytics from '../../lib/analytics'

export default function Home() {
  const [zipCode, setZipCode] = useState('')
  const [isValidZip, setIsValidZip] = useState(false)
  const router = useRouter()

  // Track page view with experiment context
  useEffect(() => {
    const userId = localStorage.getItem('chefscart_user_id') || '';
    analytics.trackPageView('landing', userId);
  }, []);

  const handleZipValidation = (zip: string, isValid: boolean) => {
    setZipCode(zip)
    setIsValidZip(isValid)
  }

  const handleGetStarted = () => {
    if (isValidZip && zipCode) {
      // Track button click before navigation
      const userId = localStorage.getItem('chefscart_user_id') || '';
      analytics.trackButtonClick('get_started_cta', 'Get Started →', userId);
      
      router.push(`/chat?zip=${encodeURIComponent(zipCode)}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <ChefHat className="h-12 w-12 text-orange-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">ChefsCart</h1>
          </div>
          <HeadlineABTest className="text-center" />
        </header>

        {/* ZIP Code Section */}
        <div className="max-w-md mx-auto mb-16">
          <ZipCodeInput onZipValidation={handleZipValidation} />
          {isValidZip && (
            <button 
              onClick={handleGetStarted}
              className="w-full mt-4 bg-orange-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Get Started →
            </button>
          )}
        </div>

        {/* How It Works Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-orange-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Tell Us Your Preferences</h3>
              <p className="text-gray-600">Share your dietary needs, cooking skills, and meal preferences through our friendly chat wizard.</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-orange-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Personalized Recipes</h3>
              <p className="text-gray-600">Our AI creates a custom meal plan with recipes tailored to your tastes and schedule.</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-orange-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Shop with One Click</h3>
              <p className="text-gray-600">Review your cart and checkout directly through Instacart with all ingredients ready to order.</p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-white rounded-2xl p-8 shadow-lg max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">Why Choose ChefsCart?</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-start space-x-4">
              <div className="bg-orange-100 rounded-full p-3 flex-shrink-0 shadow-sm">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-lg">Save Time</h3>
                <p className="text-gray-600">From meal planning to shopping cart in under 5 minutes</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-orange-100 rounded-full p-3 flex-shrink-0 shadow-sm">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-lg">Smart Budgeting</h3>
                <p className="text-gray-600">Get cost estimates and optimize for your budget preferences</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-orange-100 rounded-full p-3 flex-shrink-0 shadow-sm">
                <ChefHat className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-lg">Personalized</h3>
                <p className="text-gray-600">Recipes adapted to your dietary needs and cooking skill level</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-orange-100 rounded-full p-3 flex-shrink-0 shadow-sm">
                <MapPin className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-lg">Local Availability</h3>
                <p className="text-gray-600">Ingredients matched to your local Instacart stores</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
