'use client'

import React, { useState } from 'react'
import { X, ShoppingCart, Plus, Minus, Trash2, ExternalLink } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { generateAmazonCartUrl } from '../lib/amazon-api'

interface CartModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CartModal({ isOpen, onClose }: CartModalProps) {
  const { items, itemCount, updateQuantity, removeItem, clearCart, getCartTotal } = useCart()
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  if (!isOpen) return null

  const handleCheckout = async () => {
    if (items.length === 0) return

    console.log('Starting checkout with items:', items)
    setIsCheckingOut(true)
    try {
      // Convert cart items to Amazon format
      const amazonProducts = items.map(item => ({
        asin: item.asin,
        quantity: item.quantity
      }))

      console.log('Amazon products for checkout:', amazonProducts)
      
      // Generate Amazon cart URL with all products
      const amazonUrl = generateAmazonCartUrl(amazonProducts)
      console.log('Generated Amazon URL:', amazonUrl)
      
      // Open Amazon in new tab
      window.open(amazonUrl, '_blank')
      
      // Keep cart for now - user might want to come back
      // Could clear after successful checkout in the future
    } catch (error) {
      console.error('Error creating Amazon cart:', error)
      alert('Sorry, there was an error creating your cart. Please try again.')
    } finally {
      setIsCheckingOut(false)
    }
  }

  const formatPrice = (price: string): string => {
    // Ensure price starts with $
    const numericPrice = parseFloat(price.replace(/[^\d.]/g, '')) || 0
    return `$${numericPrice.toFixed(2)}`
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-16 pb-4 px-4 overflow-y-auto" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col my-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="bg-brand-600 rounded-lg p-2">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-neutral-800">
                Your Cart
              </h2>
              <p className="text-sm text-neutral-600">
                {itemCount} item{itemCount !== 1 ? 's' : ''} ready for checkout
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-neutral-800 mb-2">Your cart is empty</h3>
              <p className="text-neutral-600 mb-6">Start adding some kitchen equipment to get cooking!</p>
              <button
                onClick={onClose}
                className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.asin} className="flex gap-4 p-4 bg-neutral-50 rounded-xl">
                  {/* Product Image */}
                  <div className="w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    ) : (
                      <ShoppingCart className="w-8 h-8 text-neutral-300" />
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-neutral-800 text-sm line-clamp-2 mb-1">
                      {item.title}
                    </h4>
                    {item.brand && (
                      <p className="text-xs text-neutral-500 mb-2">{item.brand}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-brand-600">
                        {formatPrice(item.price)}
                      </div>
                      <div className="text-xs text-neutral-500 capitalize">
                        {item.source}
                      </div>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.asin, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-semibold text-neutral-800 w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.asin, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.asin)}
                      className="text-red-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-neutral-200 p-6">
            {/* Cart Summary */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <span className="text-lg font-semibold text-neutral-800">
                  Total: ${getCartTotal()}
                </span>
                <span className="text-sm text-neutral-500">
                  ({itemCount} item{itemCount !== 1 ? 's' : ''})
                </span>
              </div>
              <button
                onClick={clearCart}
                className="text-sm text-neutral-500 hover:text-red-600 transition-colors"
              >
                Clear Cart
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Continue Shopping
              </button>
              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isCheckingOut ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating Cart...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Checkout on Amazon
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-neutral-500 text-center mt-3">
              You'll be redirected to Amazon to complete your purchase
            </p>
          </div>
        )}
      </div>
    </div>
  )
}