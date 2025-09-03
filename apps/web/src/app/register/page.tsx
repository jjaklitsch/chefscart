"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft, Check, X } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../../contexts/AuthContext'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'

type RegistrationMode = 'register' | 'email-verification' | 'magic-link'

interface PasswordStrength {
  score: number
  feedback: string[]
  isValid: boolean
}

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<RegistrationMode>('register')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [acceptTerms, setAcceptTerms] = useState(false)
  
  const { user, signUp, signInWithOAuth, sendMagicLink, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    if (!loading && user) {
      router.replace('/dashboard')
      return
    }
    
    setCheckingAuth(false)
  }, [user, loading, router])

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const checkPasswordStrength = (password: string): PasswordStrength => {
    const feedback: string[] = []
    let score = 0

    if (password.length >= 8) {
      score += 1
    } else {
      feedback.push('At least 8 characters')
    }

    if (/[a-z]/.test(password)) {
      score += 1
    } else {
      feedback.push('One lowercase letter')
    }

    if (/[A-Z]/.test(password)) {
      score += 1
    } else {
      feedback.push('One uppercase letter')
    }

    if (/\d/.test(password)) {
      score += 1
    } else {
      feedback.push('One number')
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1
    } else {
      feedback.push('One special character (!@#$%^&*)')
    }

    return {
      score,
      feedback,
      isValid: score >= 4
    }
  }

  const passwordStrength = checkPasswordStrength(password)

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setError('Email is required')
      return
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    if (!password) {
      setError('Password is required')
      return
    }

    if (!passwordStrength.isValid) {
      setError('Password does not meet security requirements')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!acceptTerms) {
      setError('Please accept the Terms of Service and Privacy Policy')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const { error } = await signUp(email, password, {
        email_confirm: true,
        data: {
          signup_method: 'email_password'
        }
      })
      
      if (error) {
        if (error.message.includes('already registered')) {
          setError('This email is already registered. Try signing in instead?')
        } else {
          setError(error.message)
        }
      } else {
        setMode('email-verification')
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMagicLinkRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setError('Email is required')
      return
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    if (!acceptTerms) {
      setError('Please accept the Terms of Service and Privacy Policy')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const { error } = await sendMagicLink(email)
      if (error) {
        setError(error)
      } else {
        setMode('email-verification')
      }
    } catch (err: any) {
      setError(err.message || 'Unable to send magic link. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthRegistration = async (provider: 'google' | 'apple') => {
    setIsLoading(true)
    setError('')
    
    try {
      await signInWithOAuth(provider)
    } catch (err: any) {
      setError(`${provider} registration failed. Please try again.`)
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

  // Email Verification State
  if (mode === 'email-verification') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
        <Header />
        <div className="flex items-center justify-center py-8 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email! 📧</h2>
              <p className="text-gray-600 mb-6">
                We've sent a verification link to <strong>{email}</strong>. Click the link in your email to complete your account setup.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>🔐 Almost done!</strong> After verification, you'll be redirected to start planning your first meals.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setMode('register')
                    setEmail('')
                    setPassword('')
                    setConfirmPassword('')
                    setError('')
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

  // Magic Link Registration Mode
  if (mode === 'magic-link') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
        <Header />
        <div className="flex items-center justify-center py-8 px-4">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <button
                onClick={() => setMode('register')}
                className="flex items-center text-orange-600 hover:text-orange-700 mb-4 mx-auto"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to registration options
              </button>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Magic Link Signup</h1>
              <p className="text-gray-600">No password needed - we'll send you a secure link</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <form onSubmit={handleMagicLinkRegistration}>
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
                </div>

                {/* Terms checkbox */}
                <div className="flex items-start mb-6">
                  <input
                    type="checkbox"
                    id="terms-magic"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 mr-3 h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <label htmlFor="terms-magic" className="text-sm text-gray-600">
                    I agree to the{' '}
                    <Link href="/terms" className="text-orange-600 hover:text-orange-700">Terms of Service</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-orange-600 hover:text-orange-700">Privacy Policy</Link>
                  </label>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !acceptTerms}
                  className="w-full flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account with Magic Link'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Main Registration Mode
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <Header />
      <div className="flex items-center justify-center py-8 px-4">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-orange-100 rounded-full p-3">
                <ShoppingCart className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Join ChefsCart</h1>
            <p className="text-gray-600">Create your account and start planning amazing meals</p>
          </div>

          {/* Registration Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            
            {/* Social Registration Buttons */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleOAuthRegistration('google')}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-3 border-2 border-gray-200 rounded-lg font-medium hover:bg-gray-50 disabled:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
              
              <button
                onClick={() => handleOAuthRegistration('apple')}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-600 transition-colors"
              >
                <svg className="w-5 h-5 mr-3 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Continue with Apple
              </button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">or</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleRegistration}>
              <div className="space-y-4 mb-6">
                <div>
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (error) setError('')
                      }}
                      className={`w-full px-4 py-3 pr-12 border-2 rounded-lg focus:ring-0 transition-colors ${
                        password && !passwordStrength.isValid
                          ? 'border-red-500 focus:border-red-500' 
                          : password && passwordStrength.isValid
                          ? 'border-green-500 focus:border-green-500'
                          : 'border-gray-200 focus:border-orange-500'
                      }`}
                      placeholder="Create a secure password"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              i < passwordStrength.score 
                                ? passwordStrength.score >= 4 
                                  ? 'bg-green-500' 
                                  : passwordStrength.score >= 2 
                                  ? 'bg-yellow-500' 
                                  : 'bg-red-500'
                                : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      {passwordStrength.feedback.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-600">Password must have:</p>
                          {passwordStrength.feedback.map((item, index) => (
                            <div key={index} className="flex items-center text-xs text-red-600">
                              <X className="w-3 h-3 mr-1" />
                              {item}
                            </div>
                          ))}
                        </div>
                      )}
                      {passwordStrength.isValid && (
                        <div className="flex items-center text-xs text-green-600">
                          <Check className="w-3 h-3 mr-1" />
                          Strong password!
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (error) setError('')
                      }}
                      className={`w-full px-4 py-3 pr-12 border-2 rounded-lg focus:ring-0 transition-colors ${
                        confirmPassword && password !== confirmPassword
                          ? 'border-red-500 focus:border-red-500'
                          : confirmPassword && password === confirmPassword
                          ? 'border-green-500 focus:border-green-500'
                          : 'border-gray-200 focus:border-orange-500'
                      }`}
                      placeholder="Confirm your password"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                  )}
                </div>
              </div>

              {/* Terms checkbox */}
              <div className="flex items-start mb-6">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 mr-3 h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  I agree to the{' '}
                  <Link href="/terms" className="text-orange-600 hover:text-orange-700">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-orange-600 hover:text-orange-700">Privacy Policy</Link>
                </label>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !passwordStrength.isValid || password !== confirmPassword || !acceptTerms}
                className="w-full flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mb-4"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Alternative Actions */}
            <div className="text-center text-sm">
              <button
                onClick={() => setMode('magic-link')}
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                Prefer a magic link? No password needed
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-orange-600 hover:text-orange-700 font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>🚀 Join thousands of home cooks</strong> using ChefsCart to plan delicious meals and streamline grocery shopping.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}