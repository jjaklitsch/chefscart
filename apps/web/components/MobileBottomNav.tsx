'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingCart, Plus, BookOpen, Users, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useMealCart } from '../contexts/MealCartContext'

export default function MobileBottomNav() {
  const { user } = useAuth()
  const { state: mealCartState } = useMealCart()
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  // Auto-hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down & past 100px - hide
        setIsVisible(false)
      } else {
        // Scrolling up - show
        setIsVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // Don't show if user is not authenticated
  if (!user) {
    return null
  }

  // Don't show on login/register/auth pages
  if (pathname?.includes('/login') || pathname?.includes('/register') || pathname?.includes('/auth/')) {
    return null
  }

  const navItems = [
    {
      href: '/dashboard',
      icon: Home,
      label: 'Home',
      isActive: pathname === '/dashboard'
    },
    {
      href: '/cart',
      icon: ShoppingCart,
      label: 'Cart',
      isActive: pathname === '/cart'
    },
    {
      href: '/meal-plan-builder',
      icon: Plus,
      label: 'Create',
      isActive: pathname === '/meal-plan-builder' || pathname === '/quick-plan',
      isMainAction: true
    },
    {
      href: '/recipes',
      icon: BookOpen,
      label: 'Recipes',
      isActive: pathname?.startsWith('/recipes')
    },
    {
      href: '/community',
      icon: Users,
      label: 'Community',
      isActive: pathname?.startsWith('/community')
    }
  ]

  return (
    <>
      {/* Spacer to prevent content from being hidden behind nav */}
      <div className="h-16 sm:hidden" />
      
      {/* Mobile Bottom Navigation */}
      <nav className={`
        fixed bottom-0 left-0 right-0 z-50 
        bg-white border-t border-neutral-200 
        sm:hidden transition-transform duration-300 ease-in-out
        ${isVisible ? 'translate-y-0' : 'translate-y-full'}
        shadow-lg
      `}>
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.isActive
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col items-center justify-center gap-1 
                  transition-all duration-200 relative
                  ${item.isMainAction 
                    ? 'bg-brand-600 text-white hover:bg-brand-700 rounded-t-2xl' 
                    : isActive 
                      ? 'text-brand-600 bg-brand-50' 
                      : 'text-neutral-500 hover:text-neutral-700'
                  }
                  ${!item.isMainAction && isActive ? 'bg-brand-50' : ''}
                `}
              >
                {/* Cart badge for Cart */}
                {item.label === 'Cart' && mealCartState.totalItems > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {mealCartState.totalItems > 9 ? '9+' : mealCartState.totalItems}
                  </div>
                )}
                
                <Icon className={`
                  w-5 h-5 
                  ${item.isMainAction 
                    ? 'w-6 h-6' 
                    : ''
                  }
                `} />
                <span className={`
                  text-xs font-medium 
                  ${item.isMainAction 
                    ? 'text-xs' 
                    : 'text-[10px]'
                  }
                `}>
                  {item.label}
                </span>
                
                {/* Active indicator */}
                {!item.isMainAction && isActive && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-brand-600 rounded-b"></div>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}