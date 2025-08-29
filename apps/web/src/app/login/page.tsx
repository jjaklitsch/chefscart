"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { createAuthClient } from '../../../lib/supabase'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in and redirect to dashboard
    const checkAuth = async () => {
      try {
        const supabase = createAuthClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          // User is already logged in, redirect to dashboard
          router.replace('/dashboard')
          return
        }
      } catch (error) {
        console.error('Error checking auth status:', error)
      } finally {
        setCheckingAuth(false)
      }
    }

    checkAuth()

    // Check for error query params
    const urlParams = new URLSearchParams(window.location.search)
    const errorParam = urlParams.get('error')
    
    if (errorParam === 'link_expired') {
      setError('The magic link has expired. Please request a new one.')
    } else if (errorParam === 'auth_failed') {
      setError('Authentication failed. Please try again.')
    }
  }, [])

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
    setMagicLinkSent(false)

    try {
      const supabase = createAuthClient()
      
      // Send magic link with proper redirect URL
      // For local development, we need to use the exact URL
      const redirectUrl = window.location.origin + '/auth/callback'
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            // Add any additional metadata here
          }
        }
      })

      if (error) {
        throw error
      }

      setMagicLinkSent(true)
      
    } catch (err: any) {
      console.error('Magic link error:', err)
      setError(err.message || 'Unable to send magic link. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while checking authentication status
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
        <Header />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
        <Header />
        <div className="flex items-center justify-center py-12">
          <div className="max-w-md w-full mx-auto px-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email! 📧</h2>
              <p className="text-gray-600 mb-6">
                We've sent a magic link to <strong>{email}</strong>. Click the link in your email to sign in securely.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>🔒 Secure & Easy:</strong> No password needed! The link expires in 1 hour for security.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleLogin({ preventDefault: () => {} } as React.FormEvent)}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  {isLoading ? 'Sending...' : 'Resend Magic Link'}
                </button>
                <button
                  onClick={() => {
                    setMagicLinkSent(false)
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
                disabled={isLoading}
              />
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 mt-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
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
            <strong>✨ Magic Link Login:</strong> No passwords needed! We'll send you a secure link that expires in 1 hour.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  )
}