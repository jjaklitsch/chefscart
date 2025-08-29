'use client'

import { useEffect } from 'react'
import { ShoppingCart, RefreshCw } from 'lucide-react'

export default function GlobalError({
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
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-sage-50 via-cream-50 to-sage-100 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-brand-600 to-brand-700 rounded-full flex items-center justify-center shadow-brand">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-neutral-800 mb-4">
              Application Error
            </h1>
            
            <p className="text-lg text-neutral-600 mb-8 leading-relaxed">
              A critical error occurred. Please try refreshing the page.
            </p>
            
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-brand hover:shadow-brand-lg transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
            
            {error.digest && (
              <p className="text-sm text-neutral-400 mt-6">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}