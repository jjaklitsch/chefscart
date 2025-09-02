"use client"

import { useState, useEffect } from 'react'
import { MapPin, Globe, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'

export default function USOnlyPage() {
  const [userCountry, setUserCountry] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Try to get user's detected country from geo-IP API
    fetch('/api/geo-ip')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.country) {
          setUserCountry(data.data.country)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-orange-100 mb-8">
            <Globe className="h-12 w-12 text-orange-600" />
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Currently Available in the US Only
          </h1>

          {/* Subtitle with detected country */}
          <div className="text-xl text-gray-600 mb-8">
            {loading ? (
              "Checking your location..."
            ) : userCountry && userCountry !== 'United States' ? (
              <>
                We detected you're browsing from <span className="font-semibold">{userCountry}</span>.
                <br />
                ChefsCart is currently only available in the United States.
              </>
            ) : (
              "ChefsCart meal planning and grocery delivery is currently only available within the United States."
            )}
          </div>

          {/* Main content */}
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-start space-x-4 mb-6">
              <MapPin className="h-6 w-6 text-orange-500 mt-1 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 mb-2">Why US Only?</h3>
                <p className="text-gray-600">
                  ChefsCart partners with US-based grocery retailers like Instacart to deliver fresh ingredients directly to your door. Our meal planning system is optimized for US food preferences, dietary guidelines, and delivery logistics.
                </p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-3">What we're working on:</h3>
              <ul className="text-left text-gray-600 space-y-2">
                <li>• International grocery delivery partnerships</li>
                <li>• Localized meal recommendations by region</li>
                <li>• Multi-currency pricing support</li>
                <li>• Regional dietary preference customization</li>
              </ul>
            </div>
          </div>

          {/* CTA Section */}
          <div className="space-y-4">
            <p className="text-gray-600">
              Want to be notified when we expand to your region?
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="mailto:hello@chefscart.ai?subject=International Expansion Notification"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 transition-colors duration-200"
              >
                Get Notified
              </a>
              
              <Link
                href="/"
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">
              If you believe this is an error and you're located in the United States,{' '}
              <a href="mailto:support@chefscart.ai" className="text-orange-600 hover:underline">
                please contact our support team
              </a>.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}