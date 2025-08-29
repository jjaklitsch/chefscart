'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { CheckCircle, ShoppingCart, ArrowRight, Plus } from 'lucide-react'
import Link from 'next/link'

export default function WelcomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    } else if (user) {
      // Show content after a brief delay for nice animation
      setTimeout(() => setShowContent(true), 500)
      
      // Auto-redirect to dashboard after 5 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 5000)
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-health-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4 w-12 h-12"></div>
          <h2 className="text-xl font-semibold text-gray-900">Signing you in...</h2>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-health-gradient">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className={`text-center transition-all duration-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Success Icon */}
          <div className="relative mx-auto mb-8">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-brand-green rounded-full flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Welcome Message */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to ChefsCart! 🎉
          </h1>
          
          <p className="text-xl text-gray-600 mb-2">
            You're successfully signed in as
          </p>
          
          <p className="text-lg font-semibold text-brand-green mb-8">
            {user.email}
          </p>

          {/* Success Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 text-left max-w-lg mx-auto">
            <div className="flex items-start gap-4">
              <div className="bg-green-100 rounded-lg p-2 mt-1">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">You're all set!</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✅ Account created and verified</li>
                  <li>✅ Secure magic link authentication</li>
                  <li>✅ Ready to start meal planning</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-3 bg-brand-green hover:bg-green-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
            
            <div className="text-center">
              <span className="text-gray-500 text-sm">or</span>
            </div>
            
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-3 bg-white hover:bg-gray-50 text-brand-green border-2 border-brand-green px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus className="w-5 h-5" />
              Create New Meal Plan
            </Link>
          </div>

          {/* Auto-redirect notice */}
          <p className="text-sm text-gray-500 mt-8">
            Taking you to your dashboard in a few seconds...
          </p>
        </div>
      </div>
    </div>
  )
}