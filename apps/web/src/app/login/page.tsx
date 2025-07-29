"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Mail, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setError('Email is required')
      return
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Demo: Check if user exists in localStorage (simulating a user database)
      const existingUser = localStorage.getItem(`chefscart_user_${email}`)
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      if (existingUser) {
        // Returning user - redirect based on their history
        const userData = JSON.parse(existingUser)
        localStorage.setItem('chefscart_current_user', email)
        
        // Pre-fill their zipcode if available
        if (userData.zipCode) {
          localStorage.setItem('chefscart_zipcode', userData.zipCode)
        }
        
        // Redirect based on their usage pattern
        if (userData.completedOnboarding) {
          // Full meal planning user - go to home with zipcode pre-filled
          router.push('/')
        } else if (userData.usedGroceryList) {
          // Grocery list user - take them to grocery list page
          router.push('/grocery-list')
        } else {
          // Default to home
          router.push('/')
        }
      } else {
        // New user - show success but guide them to onboarding
        setSuccess(true)
      }
      
    } catch (err) {
      setError('Unable to process login. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
        <Header />
        <div className="flex items-center justify-center py-12">
          <div className="max-w-md w-full mx-auto px-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to ChefsCart!</h2>
              <p className="text-gray-600 mb-6">
                You're new here! Let's get you started with our AI meal planner. We'll ask about your preferences and create your first personalized meal plan.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/')}
                  className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                >
                  Start Meal Planning
                </button>
                <button
                  onClick={() => {
                    setSuccess(false)
                    setEmail('')
                  }}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Try Different Email
                </button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <Header />
      <div className="max-w-md w-full mx-auto px-4 py-12">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-orange-100 rounded-full p-3">
              <ShoppingCart className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to access your saved meal plans and preferences</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError('')
                }}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-0 transition-colors ${
                  error 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-200 focus:border-orange-500'
                }`}
                placeholder="your.email@example.com"
                required
              />
              {error && (
                <p className="text-red-600 text-sm mt-2">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending Magic Link...
                </>
              ) : (
                <>
                  <Mail className="h-5 w-5 mr-2" />
                  Send Magic Link
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              New to ChefsCart?{' '}
              <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium">
                Start planning your first meal
              </Link>
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Demo Mode:</strong> This simulates passwordless login. In production, you'd receive a secure magic link via email.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  )
}