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
    <div className="min-h-screen bg-health-gradient">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-16 animate-fade-in">
          <div className="flex items-center justify-center mb-6">
            <ChefHat className="h-12 w-12 text-brand-600 mr-3" />
            <h1 className="text-4xl font-bold text-text-primary">ChefsCart</h1>
          </div>
          <HeadlineABTest className="text-center" />
        </header>

        {/* ZIP Code Section */}
        <div className="max-w-md mx-auto mb-16 animate-slide-up">
          <ZipCodeInput onZipValidation={handleZipValidation} />
          {isValidZip && (
            <button 
              onClick={handleGetStarted}
              className="btn-primary w-full mt-4 animate-bounce-gentle"
            >
              Get Started →
            </button>
          )}
        </div>

        {/* How It Works Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center text-text-primary mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center hover-lift transition-all duration-300 ease-out p-6 rounded-2xl hover:bg-brand-50 hover:shadow-md group">
              <div className="bg-brand-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm border-2 border-brand-200 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                <span className="text-2xl font-bold text-brand-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-text-primary group-hover:text-brand-700 transition-colors duration-300">Tell Us Your Preferences</h3>
              <p className="text-text-secondary">Share your dietary needs, cooking skills, and meal preferences through our friendly chat wizard.</p>
            </div>
            <div className="text-center hover-lift transition-all duration-300 ease-out p-6 rounded-2xl hover:bg-fresh-50 hover:shadow-md group">
              <div className="bg-fresh-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm border-2 border-fresh-200 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                <span className="text-2xl font-bold text-fresh-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-text-primary group-hover:text-fresh-700 transition-colors duration-300">Get Personalized Recipes</h3>
              <p className="text-text-secondary">Our AI creates a custom meal plan with recipes tailored to your tastes and schedule.</p>
            </div>
            <div className="text-center hover-lift transition-all duration-300 ease-out p-6 rounded-2xl hover:bg-mint-50 hover:shadow-md group">
              <div className="bg-mint-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm border-2 border-mint-200 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                <span className="text-2xl font-bold text-mint-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-text-primary group-hover:text-mint-700 transition-colors duration-300">Shop with One Click</h3>
              <p className="text-text-secondary">Review your cart and checkout directly through Instacart with all ingredients ready to order.</p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="card-brand max-w-4xl mx-auto hover-lift">
          <h2 className="text-2xl font-bold text-center text-text-primary mb-8">Why Choose ChefsCart?</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-start space-x-4 group hover:bg-brand-50 p-4 rounded-xl transition-all duration-300 ease-out hover:shadow-sm">
              <div className="bg-brand-200 rounded-full p-3 flex-shrink-0 shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                <Clock className="h-6 w-6 text-brand-700" />
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-lg text-text-primary group-hover:text-brand-700 transition-colors duration-300">Save Time</h3>
                <p className="text-text-secondary">From meal planning to shopping cart in under 5 minutes</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 group hover:bg-fresh-50 p-4 rounded-xl transition-all duration-300 ease-out hover:shadow-sm">
              <div className="bg-fresh-200 rounded-full p-3 flex-shrink-0 shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                <DollarSign className="h-6 w-6 text-fresh-700" />
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-lg text-text-primary group-hover:text-fresh-700 transition-colors duration-300">Smart Budgeting</h3>
                <p className="text-text-secondary">Get cost estimates and optimize for your budget preferences</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 group hover:bg-mint-50 p-4 rounded-xl transition-all duration-300 ease-out hover:shadow-sm">
              <div className="bg-mint-200 rounded-full p-3 flex-shrink-0 shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                <ChefHat className="h-6 w-6 text-mint-700" />
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-lg text-text-primary group-hover:text-mint-700 transition-colors duration-300">Personalized</h3>
                <p className="text-text-secondary">Recipes adapted to your dietary needs and cooking skill level</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 group hover:bg-brand-50 p-4 rounded-xl transition-all duration-300 ease-out hover:shadow-sm">
              <div className="bg-brand-300 rounded-full p-3 flex-shrink-0 shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                <MapPin className="h-6 w-6 text-brand-800" />
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-lg text-text-primary group-hover:text-brand-700 transition-colors duration-300">Local Availability</h3>
                <p className="text-text-secondary">Ingredients matched to your local Instacart stores</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
