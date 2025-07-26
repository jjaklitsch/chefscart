"use client"

import { useState, useEffect } from 'react'
import { MapPin, AlertCircle, CheckCircle, X, Mail, User } from 'lucide-react'
import type { WaitlistRequest, WaitlistResponse, ZipCodeValidation } from '../types'

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
        setTimeout(() => {
          onClose()
          setSubmitState('idle')
          setFormData({ email: '', firstName: '', lastName: '' })
        }, 2000)
      } else {
        setSubmitState('error')
        setErrorMessage(data.error || 'Failed to join waitlist')
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
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Join Our Waitlist</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {submitState === 'success' ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">You're on the list!</h3>
              <p className="text-gray-600">
                We'll notify you when ChefsCart becomes available in {location}.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-gray-600 mb-2">
                  Be the first to know when ChefsCart launches in:
                </p>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="font-medium text-orange-800">{location}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange('email')}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500"
                      required
                    />
                    <Mail className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <div className="relative">
                      <input
                        id="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={handleInputChange('firstName')}
                        placeholder="John"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500"
                      />
                      <User className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleInputChange('lastName')}
                      placeholder="Doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="text-red-600 text-sm flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                    {errorMessage}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Joining...' : 'Join Waitlist'}
                  </button>
                </div>
              </form>

              <p className="text-xs text-gray-500 mt-4 text-center">
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
      
      if (data.hasInstacartCoverage) {
        setValidationState('valid')
        setMessage('Great! Instacart delivers to your area.')
        setValidationData({ 
          ...(data.city && { city: data.city }),
          ...(data.state && { state: data.state })
        })
        onZipValidation(zip, true)
      } else if (data.isValid) {
        setValidationState('no-coverage')
        setMessage('Sorry, Instacart doesn\'t deliver to this area yet. Join our waitlist!')
        setValidationData({ 
          ...(data.city && { city: data.city }),
          ...(data.state && { state: data.state })
        })
        onZipValidation(zip, false)
      } else {
        setValidationState('invalid')
        setMessage(data.message || 'Invalid ZIP code')
        setValidationData({})
        onZipValidation(zip, false)
      }
    } catch (error) {
      setValidationState('invalid')
      setMessage('Unable to verify ZIP code. Please try again.')
      setValidationData({})
      onZipValidation(zip, false)
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

  const getInputBorderColor = () => {
    switch (validationState) {
      case 'valid':
        return 'border-green-500 focus:border-green-600'
      case 'invalid':
      case 'no-coverage':
        return 'border-red-500 focus:border-red-600'
      default:
        return 'border-gray-300 focus:border-orange-500'
    }
  }

  return (
    <>
      <div className="w-full">
        <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-2">
          Enter your ZIP code to get started
        </label>
        <div className="relative">
          <input
            id="zipCode"
            type="text"
            value={zipCode}
            onChange={handleZipChange}
            placeholder="12345"
            className={`w-full pl-12 pr-12 py-3 border rounded-lg text-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-200 ${getInputBorderColor()}`}
            maxLength={5}
          />
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <MapPin className="h-5 w-5 text-gray-400" />
          </div>
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            {isLoading && (
              <div className="h-5 w-5 border-2 border-gray-300 border-t-orange-600 rounded-full animate-spin"></div>
            )}
          </div>
        </div>
        {message && (
          <div className={`mt-3 text-sm flex items-start ${
            validationState === 'valid' ? 'text-green-600' : 'text-red-600'
          }`}>
            {validationState === 'valid' && <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />}
            {(validationState === 'invalid' || validationState === 'no-coverage') && <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />}
            <span className="leading-relaxed">{message}</span>
          </div>
        )}
        {validationState === 'no-coverage' && (
          <button 
            onClick={() => setShowWaitlistModal(true)}
            className="w-full mt-3 bg-orange-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-700 transition-colors"
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