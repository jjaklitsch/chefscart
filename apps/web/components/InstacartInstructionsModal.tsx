'use client'

import { useState } from 'react'
import { X, ExternalLink, ShoppingCart, User, Store, AlertCircle, Phone, Mail } from 'lucide-react'

interface InstacartInstructionsModalProps {
  isOpen: boolean
  onClose: () => void
  onContinue: () => void
  isLoading?: boolean
}

export default function InstacartInstructionsModal({ 
  isOpen, 
  onClose, 
  onContinue, 
  isLoading = false 
}: InstacartInstructionsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white bg-opacity-20 rounded-lg p-2">
                <ExternalLink className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Complete Your Purchase</h2>
                <p className="text-green-100 text-sm">We're taking you to Instacart</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-700 text-lg">
              Your shopping cart is ready! Here's what to expect when you continue to Instacart:
            </p>
          </div>

          {/* Instructions */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl">
              <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                1
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Sign up or sign in</h3>
                </div>
                <p className="text-gray-700">You'll need an Instacart account to complete your purchase. It's free and takes just a minute!</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-xl">
              <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                2
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Store className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Choose your store</h3>
                </div>
                <p className="text-gray-700">Select your preferred grocery store from Instacart's dropdown menu. Different stores may have better availability.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-xl">
              <div className="bg-amber-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                3
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-gray-900">Handle out-of-stock items</h3>
                </div>
                <p className="text-gray-700">If items are unavailable, you can search for alternatives or try a different store that may be better stocked.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-green-50 rounded-xl">
              <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                4
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Complete checkout</h3>
                </div>
                <p className="text-gray-700">Add any additional items you need, select delivery preferences, and complete your purchase through Instacart.</p>
              </div>
            </div>
          </div>

          {/* Support Info */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-gray-600" />
              Need help with your order?
            </h4>
            <div className="space-y-2 text-sm text-gray-700">
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                For delivery issues or incorrect items, contact Instacart directly:
              </p>
              <div className="ml-6 space-y-1">
                <p>• Email: help@instacart.com</p>
                <p>• Phone: (888) 246-7822</p>
                <p>• Help Center: instacart.com/help</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onContinue}
              disabled={isLoading}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner w-5 h-5"></div>
                  Opening...
                </>
              ) : (
                <>
                  Continue to Instacart
                  <ExternalLink className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}