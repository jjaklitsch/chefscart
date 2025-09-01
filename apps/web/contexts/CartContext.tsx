'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface CartItem {
  asin: string
  title: string
  price: string
  image?: string
  brand?: string
  quantity: number
  source: 'equipment' | 'ingredients' | 'recipe'
  sourceId?: string // recipe ID, equipment ID, etc.
}

interface CartContextType {
  items: CartItem[]
  itemCount: number
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (asin: string) => void
  updateQuantity: (asin: string, quantity: number) => void
  clearCart: () => void
  isInCart: (asin: string) => boolean
  getCartTotal: () => string
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'chefscart-items'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY)
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart)
        setItems(Array.isArray(parsedCart) ? parsedCart : [])
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error)
      setItems([])
    } finally {
      setIsHydrated(true)
    }
  }, [])

  // Save cart to localStorage whenever items change
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
      } catch (error) {
        console.error('Error saving cart to localStorage:', error)
      }
    }
  }, [items, isHydrated])

  const addItem = (newItem: Omit<CartItem, 'quantity'>) => {
    setItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => item.asin === newItem.asin)
      
      if (existingItemIndex >= 0) {
        // Item already exists, increase quantity
        const updatedItems = [...prevItems]
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + 1
        }
        return updatedItems
      } else {
        // New item, add with quantity 1
        return [...prevItems, { ...newItem, quantity: 1 }]
      }
    })
  }

  const removeItem = (asin: string) => {
    setItems(prevItems => prevItems.filter(item => item.asin !== asin))
  }

  const updateQuantity = (asin: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(asin)
      return
    }

    setItems(prevItems =>
      prevItems.map(item =>
        item.asin === asin ? { ...item, quantity } : item
      )
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const isInCart = (asin: string) => {
    return items.some(item => item.asin === asin)
  }

  const getCartTotal = (): string => {
    const total = items.reduce((sum, item) => {
      // Extract numeric value from price string (e.g., "$49.99" -> 49.99)
      const price = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0
      return sum + (price * item.quantity)
    }, 0)

    return total.toFixed(2)
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  // Don't render anything until hydrated to prevent hydration mismatch
  if (!isHydrated) {
    return null
  }

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isInCart,
        getCartTotal
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}