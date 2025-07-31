"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Clock, MapPin, CheckCircle, ArrowRight, Upload, Camera } from 'lucide-react'
import GroceryListInput from '../../../components/GroceryListInput'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'

export default function GroceryListPage() {
  const [step, setStep] = useState<'landing' | 'input' | 'processing'>('landing')
  const [zipCode, setZipCode] = useState('')
  const [isValidatingZip, setIsValidatingZip] = useState(false)
  const [zipError, setZipError] = useState('')
  const router = useRouter()

  const validateZipCode = async (zip: string) => {
    if (!zip || zip.length !== 5) {
      setZipError('Please enter a valid 5-digit ZIP code')
      return false
    }

    setIsValidatingZip(true)
    setZipError('')

    try {
      const response = await fetch('/api/validate-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipCode: zip })
      })

      const data = await response.json()

      if (!response.ok) {
        setZipError(data.message || 'Invalid ZIP code')
        return false
      }

      if (!data.hasInstacartCoverage) {
        setZipError('Instacart delivery is not available in your area yet')
        return false
      }

      // Store zip code for later use
      localStorage.setItem('chefscart_zipcode', zip)
      return true

    } catch (error) {
      setZipError('Unable to validate ZIP code. Please try again.')
      return false
    } finally {
      setIsValidatingZip(false)
    }
  }

  const handleGetStarted = async () => {
    if (await validateZipCode(zipCode)) {
      setStep('input')
    }
  }

  const handleTryAIMealPlanning = () => {
    // Store zip code and redirect to main onboarding
    if (zipCode) {
      localStorage.setItem('chefscart_zipcode', zipCode)
    }
    router.push('/')
  }

  if (step === 'input') {
    return <GroceryListInput onBack={() => setStep('landing')} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Skip the grocery store. Paste your list, get Instacart delivery.
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-6 md:mb-8 max-w-3xl mx-auto px-4">
            Turn any grocery list into a ready-to-checkout Instacart cart in under 30 seconds. Same groceries, zero hassle.
          </p>

          {/* ZIP Code Input */}
          <div className="max-w-md mx-auto mb-6 md:mb-8 px-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Enter your ZIP code"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && zipCode.length === 5 && !isValidatingZip) {
                      handleGetStarted()
                    }
                  }}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-0 transition-colors text-center sm:text-left ${
                    zipError 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-gray-200 focus:border-orange-500'
                  }`}
                />
                {zipError && (
                  <p className="text-red-600 text-sm mt-1 text-center sm:text-left">{zipError}</p>
                )}
              </div>
              <button
                onClick={handleGetStarted}
                disabled={isValidatingZip || zipCode.length !== 5}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center sm:justify-start"
              >
                {isValidatingZip ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Value Props */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 md:mb-16 px-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">30-Second Setup</h3>
            <p className="text-sm text-gray-600">Confirm your zip code, paste your list, click checkout</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">No Store Trips</h3>
            <p className="text-sm text-gray-600">Skip crowded aisles and long checkout lines</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <MapPin className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Local Pricing</h3>
            <p className="text-sm text-gray-600">Get the same prices and selection from your neighborhood stores</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Same-Day Delivery</h3>
            <p className="text-sm text-gray-600">Available from hundreds of Instacart retailers near you</p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-12 md:mb-16 px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-6 md:mb-8">How It Works</h2>
          <div className="grid gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">Paste Your List</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Copy your grocery list from anywhere - notes app, recipe sites, or type it fresh. Our AI instantly recognizes every item.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">Review & Confirm</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                We'll match items to your local Instacart stores with real prices. Add, remove, or swap anything before checkout.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">One-Click Checkout</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Confirm your address and payment in Instacart. Choose pickup or delivery - groceries arrive same-day or next-day.
              </p>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-12 md:mb-16 mx-4">
          <h2 className="text-xl md:text-2xl font-bold text-center text-gray-900 mb-6 md:mb-8">What Our Users Say</h2>
          <div className="grid gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="mb-4">
                <div className="flex justify-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-lg">★</span>
                  ))}
                </div>
                <p className="text-gray-600 italic text-sm md:text-base max-w-md mx-auto">
                  "I went from grocery list to delivered groceries in 3 minutes. This is magic."
                </p>
                <p className="text-sm text-gray-500 mt-2">- Sarah K., working mom</p>
              </div>
            </div>
            <div className="text-center">
              <div className="mb-4">
                <div className="flex justify-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-lg">★</span>
                  ))}
                </div>
                <p className="text-gray-600 italic text-sm md:text-base max-w-md mx-auto">
                  "Finally - no more wandering grocery store aisles trying to remember what I need."
                </p>
                <p className="text-sm text-gray-500 mt-2">- Mike R., busy professional</p>
              </div>
            </div>
            <div className="text-center">
              <div className="mb-4">
                <div className="flex justify-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-lg">★</span>
                  ))}
                </div>
                <p className="text-gray-600 italic text-sm md:text-base max-w-md mx-auto">
                  "Perfect for my weekly meal prep. Everything I need, delivered on schedule."
                </p>
                <p className="text-sm text-gray-500 mt-2">- Jessica L., fitness coach</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upsell Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 md:p-8 text-center mx-4">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
            Need meal inspiration? Let our AI create your perfect meal plan.
          </h2>
          <p className="text-sm md:text-base text-gray-600 mb-6 max-w-2xl mx-auto">
            Tell us your dietary preferences, cooking skills, and schedule. Our AI creates personalized meal plans with recipes tailored to your tastes—plus generates the complete grocery list automatically. From meal planning to shopping cart in under 5 minutes.
          </p>
          <button
            onClick={handleTryAIMealPlanning}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Try AI Meal Planning
            <ArrowRight className="h-4 w-4 ml-2" />
          </button>
        </div>
      </div>
      
      <Footer />
    </div>
  )
}