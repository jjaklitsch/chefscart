"use client"

import { useState } from 'react'
import { ShoppingCart, Mail, ArrowLeft } from 'lucide-react'

interface CartPreparationProps {
  onContinue: (email: string) => void
  onBack: () => void
}

export default function CartPreparation({ onContinue, onBack }: CartPreparationProps) {
  const [email, setEmail] = useState('')
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
          
          {/* Email Collection */}
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


          {/* Continue Button */}
          <div className="pt-4">
            <button
              onClick={handleContinue}
              className="w-full flex items-center justify-center px-8 py-4 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
            >
              <ShoppingCart className="h-6 w-6 mr-3" />
              Create My Instacart Cart
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