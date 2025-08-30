'use client'

import { useSubscription } from '../hooks/useSubscription'
import { useRouter } from 'next/navigation'
import { Crown, Zap } from 'lucide-react'

interface SubscriptionGateProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  feature?: string
}

export default function SubscriptionGate({ 
  children, 
  fallback,
  feature = "this feature"
}: SubscriptionGateProps) {
  const { hasActiveSubscription, loading, needsUpgrade } = useSubscription()
  const router = useRouter()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (needsUpgrade) {
    return fallback || (
      <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-xl p-8 text-center border border-orange-200">
        <div className="flex items-center justify-center mb-4">
          <Crown className="h-12 w-12 text-orange-500" />
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Upgrade to Premium
        </h3>
        
        <p className="text-gray-600 mb-6">
          Unlock {feature} and get personalized meal planning with smart grocery shopping.
        </p>
        
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-center text-sm text-gray-700">
            <Zap className="h-4 w-4 text-green-500 mr-2" />
            Free 14-day trial with annual plan
          </div>
          <div className="flex items-center justify-center text-sm text-gray-700">
            <Zap className="h-4 w-4 text-green-500 mr-2" />
            Cancel anytime, no commitment
          </div>
        </div>
        
        <button
          onClick={() => router.push('/pricing')}
          className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-xl transition-colors duration-200 inline-flex items-center"
        >
          <Crown className="h-5 w-5 mr-2" />
          Choose Your Plan
        </button>
      </div>
    )
  }

  return <>{children}</>
}