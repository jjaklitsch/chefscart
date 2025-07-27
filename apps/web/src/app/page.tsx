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
      
      // Store zipCode in localStorage and go directly to onboarding
      localStorage.setItem('chefscart_zipcode', zipCode);
      router.push(`/onboarding`)
    }
  }

  return (
    <div className="min-h-screen bg-health-gradient">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-16 animate-fade-in">
          <div className="flex items-center justify-center mb-6">
            <ChefHat className="h-12 w-12 text-brand-600 mr-3" />
            <h1 className="text-4xl font-display font-bold text-neutral-800">ChefsCart</h1>
          </div>
          <HeadlineABTest className="text-center" />
        </header>

        {/* ZIP Code Section */}
        <div className="max-w-md mx-auto mb-16 animate-slide-up">
          <ZipCodeInput onZipValidation={handleZipValidation} />
          {isValidZip && (
            <button 
              onClick={handleGetStarted}
              className="btn-primary-new w-full mt-4 animate-bounce-gentle"
            >
              Get Started →
            </button>
          )}
        </div>

        {/* How It Works Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-display font-bold text-center text-neutral-800 mb-12">How It Works</h2>
          <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
            <div className="card-unified text-center hover-lift transition-all duration-300 ease-out group">
              <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-brand border-2 border-brand-700 group-hover:scale-110 group-hover:shadow-brand-lg transition-all duration-300">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-display font-semibold mb-2 text-neutral-800 group-hover:text-brand-700 transition-colors duration-300">Tell Us Your Preferences</h3>
              <p className="text-neutral-600 leading-relaxed">Share your dietary needs, cooking skills, and meal preferences through our friendly chat wizard.</p>
            </div>
            <div className="card-unified text-center hover-lift transition-all duration-300 ease-out group">
              <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-brand border-2 border-brand-800 group-hover:scale-110 group-hover:shadow-brand-lg transition-all duration-300">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-display font-semibold mb-2 text-neutral-800 group-hover:text-brand-700 transition-colors duration-300">Get Personalized Recipes</h3>
              <p className="text-neutral-600 leading-relaxed">Our AI creates a custom meal plan with recipes tailored to your tastes and schedule.</p>
            </div>
            <div className="card-unified text-center hover-lift transition-all duration-300 ease-out group">
              <div className="bg-gradient-to-br from-brand-700 to-brand-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-brand border-2 border-brand-900 group-hover:scale-110 group-hover:shadow-brand-lg transition-all duration-300">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-display font-semibold mb-2 text-neutral-800 group-hover:text-brand-700 transition-colors duration-300">Shop with One Click</h3>
              <p className="text-neutral-600 leading-relaxed">Review your cart and checkout directly through Instacart with all ingredients ready to order.</p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="card-hero max-w-4xl mx-auto hover-lift">
          <h2 className="text-2xl font-display font-bold text-center text-neutral-800 mb-8">Why Choose ChefsCart?</h2>
          <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="flex items-start space-x-4 group hover:bg-sage-100 p-4 rounded-xl transition-all duration-300 ease-out hover:shadow-soft">
              <div className="bg-brand-600 hover:bg-brand-700 rounded-full p-3 flex-shrink-0 shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold mb-2 text-lg text-neutral-800 group-hover:text-brand-700 transition-colors duration-300">Save Time</h3>
                <p className="text-neutral-600 leading-relaxed">From meal planning to shopping cart in under 5 minutes</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 group hover:bg-sage-100 p-4 rounded-xl transition-all duration-300 ease-out hover:shadow-soft">
              <div className="bg-brand-600 hover:bg-brand-700 rounded-full p-3 flex-shrink-0 shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold mb-2 text-lg text-neutral-800 group-hover:text-brand-700 transition-colors duration-300">Smart Budgeting</h3>
                <p className="text-neutral-600 leading-relaxed">Get cost estimates and optimize for your budget preferences</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 group hover:bg-sage-100 p-4 rounded-xl transition-all duration-300 ease-out hover:shadow-soft">
              <div className="bg-brand-600 hover:bg-brand-700 rounded-full p-3 flex-shrink-0 shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                <ChefHat className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold mb-2 text-lg text-neutral-800 group-hover:text-brand-700 transition-colors duration-300">Personalized</h3>
                <p className="text-neutral-600 leading-relaxed">Recipes adapted to your dietary needs and cooking skill level</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 group hover:bg-sage-100 p-4 rounded-xl transition-all duration-300 ease-out hover:shadow-soft">
              <div className="bg-brand-600 hover:bg-brand-700 rounded-full p-3 flex-shrink-0 shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold mb-2 text-lg text-neutral-800 group-hover:text-brand-700 transition-colors duration-300">Local Availability</h3>
                <p className="text-neutral-600 leading-relaxed">Ingredients matched to your local Instacart stores</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
