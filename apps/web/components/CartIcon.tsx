'use client'

import React from 'react'
import { ShoppingCart } from 'lucide-react'
import { useMealCart } from '../contexts/MealCartContext'
import Link from 'next/link'

export default function CartIcon() {
  const { state: mealCartState } = useMealCart()

  return (
    <Link
      href="/cart"
      className="relative flex items-center gap-1 p-2 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
      aria-label={`Shopping cart with ${mealCartState.totalItems} items`}
    >
      <ShoppingCart className="w-6 h-6" />
      <span className="hidden md:inline font-medium">Cart</span>
      
      {/* Cart Badge */}
      {mealCartState.totalItems > 0 && (
        <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
          {mealCartState.totalItems > 99 ? '99+' : mealCartState.totalItems}
        </span>
      )}
    </Link>
  )
}