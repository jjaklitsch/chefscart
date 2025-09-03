'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function QuickPlanRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new meal plan builder page
    router.replace('/meal-plan-builder')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Redirecting...</h2>
      </div>
    </div>
  )
}