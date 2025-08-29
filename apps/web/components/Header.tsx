"use client"

import { ShoppingCart, User, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function Header() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
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
                  href="/#faq" 
                  className="text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden sm:block"
                >
                  FAQ
                </Link>
                <Link
                  href="/login"
                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Login
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/recipes"
                  className="text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden sm:block"
                >
                  Recipes
                </Link>
                <Link
                  href="/quick-plan"
                  className="text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200 hidden sm:block"
                >
                  Quick Plan
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 text-neutral-600 hover:text-green-700 font-medium transition-colors duration-200"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:block">Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-neutral-600 hover:text-red-600 font-medium transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:block">Logout</span>
                </button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}