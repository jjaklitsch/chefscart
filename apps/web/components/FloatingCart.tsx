'use client'

import React, { useState } from 'react'
import { ShoppingCart, X, ExternalLink } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import CartModal from './CartModal'

export default function FloatingCart() {
  const { items, itemCount, getCartTotal } = useCart()
  const [showModal, setShowModal] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  // Don't show if cart is empty
  if (itemCount === 0) {
    return null
  }

  return (
    <>
      {/* Floating Cart Widget */}
      <div className={`fixed bottom-8 left-8 z-40 bg-white rounded-xl shadow-2xl border border-neutral-200 transition-all duration-300 ${
        isMinimized ? 'w-16 h-16' : 'w-80'
      }`}>
        {isMinimized ? (
          // Minimized View
          <button
            onClick={() => setIsMinimized(false)}
            className="w-full h-full flex items-center justify-center text-green-600 hover:bg-green-50 rounded-xl transition-colors relative"
          >
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {itemCount > 9 ? '9+' : itemCount}
            </span>
          </button>
        ) : (
          // Expanded View
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-neutral-800">Your Cart</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="text-neutral-400 hover:text-neutral-600 text-sm"
                >
                  Minimize
                </button>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="text-sm text-neutral-600 mb-3">
              {itemCount} item{itemCount !== 1 ? 's' : ''} • Total: ${getCartTotal()}
            </div>
            
            {/* Show first 2 items */}
            <div className="space-y-2 mb-3 max-h-24 overflow-hidden">
              {items.slice(0, 2).map((item, index) => (
                <div key={item.asin} className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 bg-neutral-100 rounded overflow-hidden flex-shrink-0">
                    {item.image && (
                      <img 
                        src={item.image} 
                        alt={item.title}
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                  <span className="text-neutral-700 truncate flex-1 leading-tight">
                    {item.title}
                  </span>
                  <span className="text-neutral-500 text-xs">
                    {item.quantity}×
                  </span>
                </div>
              ))}
              {items.length > 2 && (
                <div className="text-xs text-neutral-500 text-center">
                  +{items.length - 2} more item{items.length - 2 !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowModal(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Checkout on Amazon
            </button>
          </div>
        )}
      </div>

      <CartModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  )
}