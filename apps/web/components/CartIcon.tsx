'use client'

import React, { useState, useEffect } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import CartModal from './CartModal'

export default function CartIcon() {
  const { itemCount } = useCart()
  const [showModal, setShowModal] = useState(false)
  const [enableShoppingCart, setEnableShoppingCart] = useState(true)

  // Fetch feature flags on component mount
  useEffect(() => {
    const fetchFeatureFlags = async () => {
      try {
        const response = await fetch('/api/feature-flags')
        const flags = await response.json()
        setEnableShoppingCart(flags.enableShoppingCart)
      } catch (error) {
        console.error('Error fetching feature flags:', error)
        // Keep default value (true) on error
      }
    }
    
    fetchFeatureFlags()
  }, [])

  // Don't render cart icon if shopping cart feature is disabled
  if (!enableShoppingCart) {
    return null
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="relative flex items-center gap-1 p-2 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
        aria-label={`Shopping cart with ${itemCount} items`}
      >
        <ShoppingCart className="w-6 h-6" />
        <span className="hidden md:inline font-medium">Cart</span>
        
        {/* Cart Badge */}
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </button>

      <CartModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  )
}