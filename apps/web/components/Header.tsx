"use client"

import { ShoppingCart, User, LogOut, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Header() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
    setIsMobileMenuOpen(false)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200 shadow-subtle">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center space-x-3 group">
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-2 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-200">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-display font-bold text-neutral-800 group-hover:text-green-700 transition-colors duration-200">
              ChefsCart
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            {/* Desktop Navigation */}
            {!user ? (
              <>
                <Link 
                  href="/" 
                  className="text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden sm:block"
                >
                  Home
                </Link>
                <Link 
                  href="/recipes" 
                  className="text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden sm:block"
                >
                  Recipes
                </Link>
                <Link 
                  href="/grocery-list" 
                  className="text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden sm:block"
                >
                  Grocery List
                </Link>
                <Link 
                  href="/pricing" 
                  className="text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden sm:block"
                >
                  Pricing
                </Link>
                <Link 
                  href="/#faq" 
                  className="text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden sm:block"
                >
                  FAQ
                </Link>
                <Link
                  href="/login"
                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors hidden sm:inline-block"
                >
                  Login
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/quick-plan"
                  className="text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden sm:block"
                >
                  Meal Planner
                </Link>
                <Link
                  href="/recipes"
                  className="text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden sm:block"
                >
                  Recipes
                </Link>
                <Link
                  href={user ? `/user/${user.id}` : '/profile'}
                  className="flex items-center gap-2 text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden sm:flex"
                >
                  <User className="w-4 h-4" />
                  <span>My Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-neutral-600 hover:text-red-600 font-medium transition-colors duration-200 hidden sm:flex"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            )}
            
            {/* Mobile hamburger menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden p-2 rounded-lg hover:bg-neutral-100 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-neutral-700" />
              ) : (
                <Menu className="h-6 w-6 text-neutral-700" />
              )}
            </button>
          </div>
        </nav>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 z-40 sm:hidden"
              onClick={closeMobileMenu}
            />
            
            {/* Mobile Menu Panel */}
            <div className="absolute top-full left-0 right-0 bg-white border-b border-neutral-200 shadow-lg z-50 sm:hidden">
              <nav className="px-4 py-6 space-y-4">
                {!user ? (
                  <>
                    <Link 
                      href="/"
                      onClick={closeMobileMenu}
                      className="block py-3 text-neutral-700 hover:text-green-700 font-medium transition-colors border-b border-neutral-100 last:border-b-0"
                    >
                      Home
                    </Link>
                    <Link 
                      href="/recipes"
                      onClick={closeMobileMenu}
                      className="block py-3 text-neutral-700 hover:text-green-700 font-medium transition-colors border-b border-neutral-100 last:border-b-0"
                    >
                      Recipes
                    </Link>
                    <Link 
                      href="/grocery-list"
                      onClick={closeMobileMenu}
                      className="block py-3 text-neutral-700 hover:text-green-700 font-medium transition-colors border-b border-neutral-100 last:border-b-0"
                    >
                      Grocery List
                    </Link>
                    <Link 
                      href="/pricing"
                      onClick={closeMobileMenu}
                      className="block py-3 text-neutral-700 hover:text-green-700 font-medium transition-colors border-b border-neutral-100 last:border-b-0"
                    >
                      Pricing
                    </Link>
                    <Link 
                      href="/#faq"
                      onClick={closeMobileMenu}
                      className="block py-3 text-neutral-700 hover:text-green-700 font-medium transition-colors border-b border-neutral-100 last:border-b-0"
                    >
                      FAQ
                    </Link>
                    <Link
                      href="/login"
                      onClick={closeMobileMenu}
                      className="block mt-4 w-full text-center bg-green-600 hover:bg-green-700 text-white text-sm py-3 px-4 rounded-lg font-medium transition-colors"
                    >
                      Login
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/quick-plan"
                      onClick={closeMobileMenu}
                      className="block py-3 text-neutral-700 hover:text-green-700 font-medium transition-colors border-b border-neutral-100"
                    >
                      Meal Planner
                    </Link>
                    <Link
                      href="/recipes"
                      onClick={closeMobileMenu}
                      className="block py-3 text-neutral-700 hover:text-green-700 font-medium transition-colors border-b border-neutral-100"
                    >
                      Recipes
                    </Link>
                    <Link
                      href={user ? `/user/${user.id}` : '/profile'}
                      onClick={closeMobileMenu}
                      className="flex items-center gap-3 py-3 text-neutral-700 hover:text-green-700 font-medium transition-colors border-b border-neutral-100"
                    >
                      <User className="w-5 h-5" />
                      My Profile
                    </Link>
                    <Link
                      href="/profile"
                      onClick={closeMobileMenu}
                      className="flex items-center gap-3 py-3 text-neutral-700 hover:text-green-700 font-medium transition-colors border-b border-neutral-100"
                    >
                      <User className="w-5 h-5" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 py-3 text-neutral-700 hover:text-red-600 font-medium transition-colors w-full text-left"
                    >
                      <LogOut className="w-5 h-5" />
                      Logout
                    </button>
                  </>
                )}
              </nav>
            </div>
          </>
        )}
      </div>
    </header>
  )
}