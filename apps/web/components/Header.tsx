"use client"

import { ChefHat } from 'lucide-react'
import Link from 'next/link'

export default function Header() {
  const handleLoginClick = () => {
    // TODO: Implement login logic
    console.log('Login clicked')
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200 shadow-subtle">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-lg p-2 shadow-brand group-hover:shadow-brand-lg group-hover:scale-105 transition-all duration-200">
              <ChefHat className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-display font-bold text-neutral-800 group-hover:text-brand-700 transition-colors duration-200">
              ChefsCart
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            <Link 
              href="#faq" 
              className="text-neutral-600 hover:text-brand-700 font-medium transition-colors duration-200 hidden sm:block"
            >
              FAQ
            </Link>
            <button
              onClick={handleLoginClick}
              className="btn-secondary-new text-sm px-4 py-2 min-h-[40px]"
            >
              Login
            </button>
          </div>
        </nav>
      </div>
    </header>
  )
}