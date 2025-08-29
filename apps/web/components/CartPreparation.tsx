"use client"

import { useState } from 'react'
import { ShoppingCart, Mail, ArrowLeft } from 'lucide-react'

interface CartPreparationProps {
  onContinue: (email: string) => void
  onBack: () => void
  isLoading?: boolean
  defaultEmail?: string
}

export default function CartPreparation({ onContinue, onBack, isLoading = false, defaultEmail }: CartPreparationProps) {
  const [email, setEmail] = useState(defaultEmail || '')
  const [emailError, setEmailError] = useState('')

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value
    setEmail(newEmail)
    if (emailError && validateEmail(newEmail)) {
      setEmailError('')
    }
  }

  const handleContinue = () => {
    if (!email) {
      setEmailError('Email is required')
      return
    }
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address')
      return
    }
    onContinue(email)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        
        {/* Back button */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Meal Plan
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="h-8 w-8 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Almost Ready!</h1>
          <p className="text-gray-600">We need a few details to create your Instacart cart</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-8">
          
          {/* Email Collection - only show if no default email */}
          {!defaultEmail ? (
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-2">
                <Mail className="h-5 w-5 inline mr-2" />
                Email Address
              </label>
              <p className="text-gray-600 mb-4">
                We'll send you the cart link and cooking instructions. This will also create your account to save your preferences and get more personalized meal suggestions in the future.
              </p>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                className={`w-full p-4 border-2 rounded-lg focus:ring-0 transition-colors ${
                  emailError 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-200 focus:border-orange-500'
                }`}
                placeholder="your.email@example.com"
                required
              />
              {emailError && (
                <p className="text-red-600 text-sm mt-2">{emailError}</p>
              )}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 rounded-full p-2">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Ready to go!</h3>
                  <p className="text-gray-600">
                    We'll send the cart link and cooking instructions to <strong>{defaultEmail}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}


          {/* Continue Button */}
          <div className="pt-4">
            <button
              onClick={handleContinue}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-8 py-4 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
            >
              {isLoading ? (
                <>
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                  Creating Your Cart...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-6 w-6 mr-3" />
                  Create My Instacart Cart
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800 leading-relaxed text-center">
            <strong>Privacy:</strong> Your email is only used to send you the cart link and recipe instructions. 
            We don't share your information with third parties.
          </p>
        </div>
      </div>
    </div>
  )
}