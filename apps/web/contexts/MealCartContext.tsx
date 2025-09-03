'use client'

import React, { createContext, useContext, useReducer, useEffect, useState } from 'react'

interface MealCartItem {
  id: string
  title: string
  description: string
  imageUrl?: string
  cuisine: string
  difficulty: string
  prepTime: number
  cookTime: number
  peopleCount: number
  servings: number
  ingredients: Array<{
    name: string
    amount: number
    unit: string
  }>
  addedAt: Date
}

interface MealCartState {
  items: MealCartItem[]
  totalItems: number
}

type MealCartAction =
  | { type: 'ADD_ITEM'; payload: Omit<MealCartItem, 'addedAt'> }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; peopleCount: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: MealCartItem[] }

const MealCartContext = createContext<{
  state: MealCartState
  dispatch: React.Dispatch<MealCartAction>
  addItem: (item: Omit<MealCartItem, 'addedAt'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, peopleCount: number) => void
  clearCart: () => void
  getConsolidatedIngredients: () => Array<{ name: string; totalAmount: number; unit: string; meals: string[] }>
} | undefined>(undefined)

function mealCartReducer(state: MealCartState, action: MealCartAction): MealCartState {
  switch (action.type) {
    case 'ADD_ITEM':
      const newItem: MealCartItem = {
        ...action.payload,
        addedAt: new Date()
      }
      const updatedItems = [...state.items, newItem]
      return {
        items: updatedItems,
        totalItems: updatedItems.length
      }

    case 'REMOVE_ITEM':
      const filteredItems = state.items.filter(item => item.id !== action.payload)
      return {
        items: filteredItems,
        totalItems: filteredItems.length
      }

    case 'UPDATE_QUANTITY':
      const quantityUpdatedItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, peopleCount: action.payload.peopleCount }
          : item
      )
      return {
        items: quantityUpdatedItems,
        totalItems: quantityUpdatedItems.length
      }

    case 'CLEAR_CART':
      return {
        items: [],
        totalItems: 0
      }

    case 'LOAD_CART':
      return {
        items: action.payload,
        totalItems: action.payload.length
      }

    default:
      return state
  }
}

export function MealCartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(mealCartReducer, {
    items: [],
    totalItems: 0
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Load cart from localStorage on mount (client-side only)
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    try {
      const savedCart = localStorage.getItem('chefscart_meal_cart')
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart)
        // Convert date strings back to Date objects and add missing fields
        const itemsWithDates = parsedCart.map((item: any) => ({
          ...item,
          addedAt: new Date(item.addedAt),
          servings: item.servings || 2 // Default to 2 servings for existing items
        }))
        dispatch({ type: 'LOAD_CART', payload: itemsWithDates })
      }
    } catch (error) {
      console.error('Error loading meal cart from localStorage:', error)
    } finally {
      setIsInitialized(true)
    }
  }, [])

  // Save cart to localStorage whenever it changes (client-side only)
  useEffect(() => {
    // Only run on client side and after initialization
    if (typeof window === 'undefined' || !isInitialized) return
    
    try {
      console.log('Saving cart to localStorage:', state.items)
      localStorage.setItem('chefscart_meal_cart', JSON.stringify(state.items))
      // Verify it was saved
      const verification = localStorage.getItem('chefscart_meal_cart')
      console.log('Verification - saved data:', verification)
    } catch (error) {
      console.error('Error saving meal cart to localStorage:', error)
    }
  }, [state.items, isInitialized])

  const addItem = (item: Omit<MealCartItem, 'addedAt'>) => {
    // Check if item already exists
    const existingItem = state.items.find(cartItem => cartItem.id === item.id)
    if (existingItem) {
      // Update people count instead of adding duplicate
      updateQuantity(item.id, item.peopleCount)
    } else {
      dispatch({ type: 'ADD_ITEM', payload: item })
    }
  }

  const removeItem = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id })
  }

  const updateQuantity = (id: string, peopleCount: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, peopleCount } })
  }

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' })
  }

  const getConsolidatedIngredients = () => {
    const ingredientMap = new Map<string, { totalAmount: number; unit: string; meals: Set<string> }>()

    state.items.forEach(item => {
      item.ingredients.forEach(ingredient => {
        const key = `${ingredient.name.toLowerCase()}-${ingredient.unit}`
        const scaledAmount = ingredient.amount * item.peopleCount / item.servings // Use actual recipe servings

        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!
          existing.totalAmount += scaledAmount
          existing.meals.add(item.title)
        } else {
          ingredientMap.set(key, {
            totalAmount: scaledAmount,
            unit: ingredient.unit,
            meals: new Set([item.title])
          })
        }
      })
    })

    return Array.from(ingredientMap.entries()).map(([key, value]) => ({
      name: key.split('-')[0] || 'Unknown ingredient',
      totalAmount: Math.round(value.totalAmount * 100) / 100, // Round to 2 decimal places
      unit: value.unit,
      meals: Array.from(value.meals)
    }))
  }

  return (
    <MealCartContext.Provider
      value={{
        state,
        dispatch,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getConsolidatedIngredients
      }}
    >
      {children}
    </MealCartContext.Provider>
  )
}

export function useMealCart() {
  const context = useContext(MealCartContext)
  if (context === undefined) {
    throw new Error('useMealCart must be used within a MealCartProvider')
  }
  return context
}