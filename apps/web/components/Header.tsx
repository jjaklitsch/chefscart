"use client"

import { ShoppingCart, User, LogOut, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { isPaymentSystemEnabled } from '../lib/feature-flags'
import CartIcon from './CartIcon'

export default function Header() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
      // Use replace instead of push to prevent back-button issues
      // Add a small delay to ensure auth state is fully cleared
      setTimeout(() => {
        router.replace('/')
      }, 100)
    } catch (error) {
      console.error('Error signing out:', error)
      // Still redirect to homepage on error
      router.replace('/')
    }
    setIsMobileMenuOpen(false)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200 shadow-subtle">
      <div className="container mx-auto mobile-container">
        <nav className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center space-x-2 lg:space-x-3 group touch-target">
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-2 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-200">
              <ShoppingCart className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
            </div>
            <span className="text-lg lg:text-2xl font-display font-bold text-neutral-800 group-hover:text-green-700 transition-colors duration-200">
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
                  className="text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden lg:flex items-center text-mobile-base touch-target"
                >
                  Meal Planning
                </Link>
                <Link 
                  href="/recipes" 
                  className="text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden lg:flex items-center text-mobile-base touch-target"
                >
                  Recipes
                </Link>
                <Link 
                  href="/shop" 
                  className="text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden lg:flex items-center text-mobile-base touch-target"
                >
                  Shop
                </Link>
                <Link 
                  href="/grocery-list" 
                  className="text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden lg:flex items-center text-mobile-base touch-target"
                >
                  Grocery List
                </Link>
                {isPaymentSystemEnabled() && (
                  <Link 
                    href="/pricing" 
                    className="text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden lg:flex items-center text-mobile-base touch-target"
                  >
                    Pricing
                  </Link>
                )}
                <Link 
                  href="/#faq" 
                  className="text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden lg:flex items-center text-mobile-base touch-target"
                >
                  FAQ
                </Link>
                <CartIcon />
                <Link
                  href="/login"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors hidden lg:inline-block touch-target text-mobile-base"
                >
                  Login
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className="text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden lg:flex items-center text-mobile-base touch-target"
                >
                  My Kitchen
                </Link>
                <Link
                  href="/recipes"
                  className="text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden lg:flex items-center text-mobile-base touch-target"
                >
                  Recipes
                </Link>
                <Link
                  href="/community"
                  className="text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden lg:flex items-center text-mobile-base touch-target"
                >
                  Community
                </Link>
                <Link
                  href="/shop"
                  className="text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden lg:flex items-center text-mobile-base touch-target"
                >
                  Shop
                </Link>
                <CartIcon />
                <div className="relative group hidden lg:block">
                  <button className="flex items-center gap-2 text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 text-mobile-base touch-target">
                    <User className="w-4 h-4" />
                    <span>Account</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <button
                      onClick={async () => {
                        // Ensure user has a social profile, then navigate
                        try {
                          const response = await fetch('/api/social/profile/create', { method: 'POST' })
                          const data = await response.json()
                          if (data.success && data.profile) {
                            window.location.href = `/profile/${data.profile.username}`
                          } else {
                            // Fallback to cleaned username
                            const username = user?.email?.split('@')[0]?.replace(/[^a-z0-9_]/g, '_') || 'me'
                            window.location.href = `/profile/${username}`
                          }
                        } catch (error) {
                          console.error('Error creating profile:', error)
                          const username = user?.email?.split('@')[0]?.replace(/[^a-z0-9_]/g, '_') || 'me'
                          window.location.href = `/profile/${username}`
                        }
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      View My Profile
                    </button>
                    <Link
                      href="/preferences"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Settings & Preferences
                    </Link>
                    <hr className="my-1 border-gray-200" />
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {/* Mobile hamburger menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-3 rounded-lg hover:bg-neutral-100 transition-colors touch-target"
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
            {/* Mobile Menu Panel - Higher z-index to be above backdrop */}
            <div className="absolute top-full left-0 right-0 bg-white border-b border-neutral-200 shadow-lg z-50 lg:hidden mobile-safe">
              {/* Backdrop - positioned within menu panel to not interfere */}
              <div 
                className="fixed inset-0 bg-black/50 -z-10"
                onClick={closeMobileMenu}
              />
              <nav className="mobile-container py-6 space-y-2">
                {!user ? (
                  <>
                    <Link 
                      href="/"
                      onClick={closeMobileMenu}
                      className="mobile-nav-item text-neutral-700 hover:text-green-700 hover:bg-sage-50 font-medium transition-colors border-b border-neutral-100 last:border-b-0 rounded-lg"
                    >
                      Meal Planning
                    </Link>
                    <Link 
                      href="/recipes"
                      onClick={closeMobileMenu}
                      className="mobile-nav-item text-neutral-700 hover:text-green-700 hover:bg-sage-50 font-medium transition-colors border-b border-neutral-100 last:border-b-0 rounded-lg"
                    >
                      Recipes
                    </Link>
                    <Link 
                      href="/shop"
                      onClick={closeMobileMenu}
                      className="mobile-nav-item text-neutral-700 hover:text-green-700 hover:bg-sage-50 font-medium transition-colors border-b border-neutral-100 last:border-b-0 rounded-lg"
                    >
                      Shop
                    </Link>
                    <Link 
                      href="/grocery-list"
                      onClick={closeMobileMenu}
                      className="mobile-nav-item text-neutral-700 hover:text-green-700 hover:bg-sage-50 font-medium transition-colors border-b border-neutral-100 last:border-b-0 rounded-lg"
                    >
                      Grocery List
                    </Link>
                    {isPaymentSystemEnabled() && (
                      <Link 
                        href="/pricing"
                        onClick={closeMobileMenu}
                        className="mobile-nav-item text-neutral-700 hover:text-green-700 hover:bg-sage-50 font-medium transition-colors border-b border-neutral-100 last:border-b-0 rounded-lg"
                      >
                        Pricing
                      </Link>
                    )}
                    <Link 
                      href="/#faq"
                      onClick={closeMobileMenu}
                      className="mobile-nav-item text-neutral-700 hover:text-green-700 hover:bg-sage-50 font-medium transition-colors border-b border-neutral-100 last:border-b-0 rounded-lg"
                    >
                      FAQ
                    </Link>
                    <div className="pt-4">
                      <Link
                        href="/login"
                        onClick={closeMobileMenu}
                        className="block w-full text-center bg-green-600 hover:bg-green-700 text-white py-4 px-4 rounded-lg font-medium transition-colors touch-target text-mobile-base"
                      >
                        Login
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={closeMobileMenu}
                      className="mobile-nav-item text-neutral-700 hover:text-green-700 hover:bg-sage-50 font-medium transition-colors border-b border-neutral-100 rounded-lg"
                    >
                      My Kitchen
                    </Link>
                    <Link
                      href="/recipes"
                      onClick={closeMobileMenu}
                      className="mobile-nav-item text-neutral-700 hover:text-green-700 hover:bg-sage-50 font-medium transition-colors border-b border-neutral-100 rounded-lg"
                    >
                      Recipes
                    </Link>
                    <Link
                      href="/community"
                      onClick={closeMobileMenu}
                      className="mobile-nav-item text-neutral-700 hover:text-green-700 hover:bg-sage-50 font-medium transition-colors border-b border-neutral-100 rounded-lg"
                    >
                      Community
                    </Link>
                    <Link
                      href="/shop"
                      onClick={closeMobileMenu}
                      className="mobile-nav-item text-neutral-700 hover:text-green-700 hover:bg-sage-50 font-medium transition-colors border-b border-neutral-100 rounded-lg"
                    >
                      Shop
                    </Link>
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/social/profile/create', { method: 'POST' })
                          const data = await response.json()
                          if (data.success && data.profile) {
                            window.location.href = `/profile/${data.profile.username}`
                          } else {
                            // Fallback to cleaned username
                            const username = user?.email?.split('@')[0]?.replace(/[^a-z0-9_]/g, '_') || 'me'
                            window.location.href = `/profile/${username}`
                          }
                        } catch (error) {
                          console.error('Error creating profile:', error)
                          const username = user?.email?.split('@')[0]?.replace(/[^a-z0-9_]/g, '_') || 'me'
                          window.location.href = `/profile/${username}`
                        }
                        closeMobileMenu()
                      }}
                      className="mobile-nav-item text-neutral-700 hover:text-green-700 hover:bg-sage-50 font-medium transition-colors border-b border-neutral-100 rounded-lg gap-3"
                    >
                      <User className="w-5 h-5" />
                      View My Profile
                    </button>
                    <Link
                      href="/preferences"
                      onClick={closeMobileMenu}
                      className="mobile-nav-item text-neutral-700 hover:text-green-700 hover:bg-sage-50 font-medium transition-colors border-b border-neutral-100 rounded-lg gap-3"
                    >
                      <User className="w-5 h-5" />
                      Settings & Preferences
                    </Link>
                    <div className="py-4 border-b border-neutral-100 flex justify-center">
                      <CartIcon />
                    </div>
                    <button
                      onClick={handleLogout}
                      className="mobile-nav-item text-neutral-700 hover:text-red-600 hover:bg-red-50 font-medium transition-colors w-full text-left rounded-lg gap-3"
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