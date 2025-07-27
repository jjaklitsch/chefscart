'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ChefHat, RefreshCw, ArrowLeft } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 via-cream-50 to-sage-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-600 to-brand-700 rounded-full flex items-center justify-center shadow-brand">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h1 className="text-display font-display text-neutral-800 mb-4">
          Something went wrong!
        </h1>
        
        <p className="text-lg text-neutral-600 mb-8 leading-relaxed">
          We encountered an unexpected error. Don't worry, our chefs are working on fixing this!
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="btn-primary-new inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          
          <Link
            href="/"
            className="btn-secondary-new inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
        
        {error.digest && (
          <p className="text-sm text-neutral-400 mt-6">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}