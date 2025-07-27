import Link from 'next/link'
import { ChefHat, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 via-cream-50 to-sage-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-600 to-brand-700 rounded-full flex items-center justify-center shadow-brand">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h1 className="text-display font-display text-neutral-800 mb-4">
          404 - Page Not Found
        </h1>
        
        <p className="text-lg text-neutral-600 mb-8 leading-relaxed">
          Oops! The page you're looking for doesn't exist. Let's get you back to cooking up something delicious.
        </p>
        
        <Link
          href="/"
          className="btn-primary-new inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  )
}