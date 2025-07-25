"use client"

import { useState, useEffect } from 'react'
import { MapPin, AlertCircle, CheckCircle } from 'lucide-react'

interface ZipCodeInputProps {
  onZipValidation: (zip: string, isValid: boolean) => void
}

export default function ZipCodeInput({ onZipValidation }: ZipCodeInputProps) {
  const [zipCode, setZipCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [validationState, setValidationState] = useState<'idle' | 'valid' | 'invalid' | 'no-coverage'>('idle')
  const [message, setMessage] = useState('')

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
      
      const data = await response.json()
      
      if (data.hasInstacartCoverage) {
        setValidationState('valid')
        setMessage('Great! Instacart delivers to your area.')
        onZipValidation(zip, true)
      } else {
        setValidationState('no-coverage')
        setMessage('Sorry, Instacart doesn\'t deliver to this area yet. Join our waitlist!')
        onZipValidation(zip, false)
      }
    } catch (error) {
      setValidationState('invalid')
      setMessage('Unable to verify ZIP code. Please try again.')
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
          onClick={() => {
            // Simple waitlist signup
            const email = prompt('Enter your email to join the waitlist:')
            if (email) {
              alert('Thanks! We\'ll notify you when we expand to your area.')
            }
          }}
          className="w-full mt-3 bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
        >
          Join Waitlist
        </button>
      )}
    </div>
  )
}