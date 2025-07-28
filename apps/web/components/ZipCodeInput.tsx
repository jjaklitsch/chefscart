"use client"

import { useState, useEffect } from 'react'
import { MapPin, AlertCircle, CheckCircle, X, Mail, User } from 'lucide-react'
import type { WaitlistRequest, WaitlistResponse, ZipCodeValidation } from '../types'
import analytics from '../lib/analytics'

interface ZipCodeInputProps {
  onZipValidation: (zip: string, isValid: boolean) => void
}

interface WaitlistModalProps {
  isOpen: boolean
  onClose: () => void
  zipCode: string
  city?: string | undefined
  state?: string | undefined
}

function WaitlistModal({ isOpen, onClose, zipCode, city, state }: WaitlistModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitState, setSubmitState] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email) {
      setErrorMessage('Email is required')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const requestBody: WaitlistRequest = {
        email: formData.email,
        zipCode,
        ...(formData.firstName && { firstName: formData.firstName }),
        ...(formData.lastName && { lastName: formData.lastName }),
      }

      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data: WaitlistResponse = await response.json()

      if (data.success) {
        setSubmitState('success')
        
        // Track waitlist signup success
        const userId = localStorage.getItem('chefscart_user_id') || '';
        analytics.track('waitlist_signup', {
          email: formData.email,
          zip_code: zipCode,
          signup_source: 'no_coverage',
          funnel_stage: 'acquisition',
          first_name: formData.firstName,
          last_name: formData.lastName
        }, userId);
        
        setTimeout(() => {
          onClose()
          setSubmitState('idle')
          setFormData({ email: '', firstName: '', lastName: '' })
        }, 2000)
      } else {
        setSubmitState('error')
        setErrorMessage(data.error || 'Failed to join waitlist')
        
        // Track waitlist signup failure
        const userId = localStorage.getItem('chefscart_user_id') || '';
        analytics.track('waitlist_signup_failed', {
          email: formData.email,
          zip_code: zipCode,
          error: data.error,
          funnel_stage: 'acquisition'
        }, userId);
      }
    } catch (error) {
      setSubmitState('error')
      setErrorMessage('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    if (errorMessage) setErrorMessage('')
  }

  if (!isOpen) return null

  const location = city && state ? `${city}, ${state}` : `ZIP code ${zipCode}`

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-text-primary">Join Our Waitlist</h2>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 rounded-lg hover:bg-neutral-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {submitState === 'success' ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-mint-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">You're on the list!</h3>
              <p className="text-text-secondary">
                We'll notify you when ChefsCart becomes available in {location}.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-text-secondary mb-2">
                  Be the first to know when ChefsCart launches in:
                </p>
                <div className="bg-brand-50 border border-brand-200 rounded-xl p-3">
                  <p className="font-medium text-brand-800">{location}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange('email')}
                      placeholder="you@example.com"
                      className="input-primary pl-10"
                      required
                    />
                    <Mail className="h-4 w-4 text-neutral-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-text-primary mb-1">
                      First Name
                    </label>
                    <div className="relative">
                      <input
                        id="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={handleInputChange('firstName')}
                        placeholder="John"
                        className="input-primary pl-10"
                      />
                      <User className="h-4 w-4 text-neutral-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-text-primary mb-1">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleInputChange('lastName')}
                      placeholder="Doe"
                      className="input-primary"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="alert-error text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {errorMessage}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary-new flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Joining...' : 'Join Waitlist'}
                  </button>
                </div>
              </form>

              <p className="text-xs text-text-muted mt-4 text-center">
                We'll only use your email to notify you about ChefsCart availability in your area.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ZipCodeInput({ onZipValidation }: ZipCodeInputProps) {
  const [zipCode, setZipCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [validationState, setValidationState] = useState<'idle' | 'valid' | 'invalid' | 'no-coverage'>('idle')
  const [message, setMessage] = useState('')
  const [validationData, setValidationData] = useState<{ city?: string; state?: string }>({})
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)

  // Auto-fill with geo-IP detection on component mount
  useEffect(() => {
    const detectLocation = async () => {
      try {
        const response = await fetch('/api/geo-ip')
        const data = await response.json()
        if (data.zipCode) {
          setZipCode(data.zipCode)
          validateZipCode(data.zipCode)
        }
      } catch (error) {
        console.error('Failed to detect location:', error)
      }
    }

    detectLocation()
  }, [])

  const validateZipCode = async (zip: string) => {
    if (zip.length !== 5 || !/^\d{5}$/.test(zip)) {
      setValidationState('invalid')
      setMessage('Please enter a valid 5-digit ZIP code')
      setValidationData({})
      onZipValidation(zip, false)
      
      // Track invalid ZIP attempt
      const userId = localStorage.getItem('chefscart_user_id') || '';
      analytics.track('zip_validation_failed', {
        zip_code: zip,
        error_type: 'invalid_format',
        funnel_stage: 'acquisition'
      }, userId);
      
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/validate-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipCode: zip })
      })
      
      const data: ZipCodeValidation = await response.json()
      const userId = localStorage.getItem('chefscart_user_id') || '';
      
      if (data.hasInstacartCoverage) {
        setValidationState('valid')
        setMessage('Great! Instacart delivers to your area.')
        setValidationData({ 
          ...(data.city && { city: data.city }),
          ...(data.state && { state: data.state })
        })
        onZipValidation(zip, true)
        
        // Track successful ZIP completion - key conversion event
        analytics.trackZipCompletion(zip, true, userId);
      } else if (data.isValid) {
        setValidationState('no-coverage')
        setMessage('Sorry, ChefsCart isn\'t available in your area yet. Join our waitlist!')
        setValidationData({ 
          ...(data.city && { city: data.city }),
          ...(data.state && { state: data.state })
        })
        onZipValidation(zip, false)
        
        // Track ZIP with no coverage
        analytics.track('zip_no_coverage', {
          zip_code: zip,
          funnel_stage: 'acquisition',
          conversion_blocker: 'no_instacart_coverage'
        }, userId);
      } else {
        setValidationState('invalid')
        setMessage(data.message || 'Invalid ZIP code')
        setValidationData({})
        onZipValidation(zip, false)
        
        // Track invalid ZIP response
        analytics.track('zip_validation_failed', {
          zip_code: zip,
          error_type: 'invalid_zip',
          funnel_stage: 'acquisition'
        }, userId);
      }
    } catch (error) {
      setValidationState('invalid')
      setMessage('Unable to verify ZIP code. Please try again.')
      setValidationData({})
      onZipValidation(zip, false)
      
      // Track API error
      const userId = localStorage.getItem('chefscart_user_id') || '';
      analytics.track('zip_validation_failed', {
        zip_code: zip,
        error_type: 'api_error',
        funnel_stage: 'acquisition'
      }, userId);
    } finally {
      setIsLoading(false)
    }
  }

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZip = e.target.value.replace(/\D/g, '').slice(0, 5)
    setZipCode(newZip)
    
    if (newZip.length === 5) {
      validateZipCode(newZip)
    } else {
      setValidationState('idle')
      setMessage('')
      setValidationData({})
      onZipValidation(newZip, false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && zipCode.length === 5) {
      validateZipCode(zipCode)
    }
  }

  const getInputBorderColor = () => {
    switch (validationState) {
      case 'valid':
        return 'border-mint-500 focus:border-mint-600 focus:ring-mint-100 shadow-sm ring-1 ring-mint-200'
      case 'invalid':
      case 'no-coverage':
        return 'border-red-500 focus:border-red-600 focus:ring-red-100'
      default:
        return 'border-neutral-200 focus:border-brand-600 focus:ring-brand-100'
    }
  }

  return (
    <>
      <div className="w-full">
        <label htmlFor="zipCode" className="block text-sm font-medium text-text-primary mb-2">
          Enter your ZIP code to get started
        </label>
        <div className="relative">
          <input
            id="zipCode"
            type="text"
            value={zipCode}
            onChange={handleZipChange}
            onKeyPress={handleKeyPress}
            placeholder="12345"
            className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl text-lg font-medium transition-all duration-200 ease-out focus:outline-none focus:ring-4 text-text-primary caret-brand-600 ${getInputBorderColor()}`}
            maxLength={5}
            autoComplete="postal-code"
          />
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <MapPin className="h-5 w-5 text-neutral-400" />
          </div>
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            {isLoading && (
              <div className="loading-spinner"></div>
            )}
          </div>
        </div>
        {message && (
          <div className={`mt-3 p-3 rounded-xl border flex items-start text-sm transition-all duration-300 ease-out ${
            validationState === 'valid' 
              ? 'bg-mint-50 border-mint-200 text-mint-800 animate-slide-up shadow-sm' 
              : 'bg-red-50 border-red-200 text-red-800 animate-slide-up'
          }`}>
            {validationState === 'valid' && <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5 text-mint-600" />}
            {(validationState === 'invalid' || validationState === 'no-coverage') && <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />}
            <span className="leading-relaxed">{message}</span>
          </div>
        )}
        {validationState === 'no-coverage' && (
          <button 
            onClick={() => setShowWaitlistModal(true)}
            className="btn-primary-new w-full mt-3"
          >
            Join Waitlist
          </button>
        )}
      </div>

      <WaitlistModal
        isOpen={showWaitlistModal}
        onClose={() => setShowWaitlistModal(false)}
        zipCode={zipCode}
        {...(validationData.city && { city: validationData.city })}
        {...(validationData.state && { state: validationData.state })}
      />
    </>
  )
}