'use client'

import { useState } from 'react'
import { Plus, Minus, ShoppingCart, Users } from 'lucide-react'
import { useMealCart } from '../contexts/MealCartContext'

interface AddToMealCartProps {
  meal: {
    id: string
    title: string
    description: string
    imageUrl?: string
    cuisine: string
    difficulty: string
    prepTime: number
    cookTime: number
    servings: number
    ingredients: Array<{
      name: string
      amount: number
      unit: string
    }>
  }
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function AddToMealCart({ meal, className = '', size = 'md' }: AddToMealCartProps) {
  const { state, addItem, removeItem, updateQuantity } = useMealCart()
  const [peopleCount, setPeopleCount] = useState(2)

  // Check if this meal is already in cart
  const cartItem = state.items.find(item => item.id === meal.id)
  const isInCart = !!cartItem
  const currentPeopleCount = cartItem?.peopleCount || peopleCount

  const handleAddToCart = () => {
    // Add new item with default people count (2, or user preference if available)
    addItem({
      id: meal.id,
      title: meal.title,
      description: meal.description,
      imageUrl: meal.imageUrl || '',
      cuisine: meal.cuisine,
      difficulty: meal.difficulty,
      prepTime: meal.prepTime,
      cookTime: meal.cookTime,
      peopleCount: 2, // Default to 2 people, could be made configurable based on user preferences
      servings: meal.servings,
      ingredients: meal.ingredients
    })
  }

  const handleRemoveFromCart = () => {
    removeItem(meal.id)
  }

  const incrementPeople = () => {
    const newCount = Math.min(peopleCount + 1, 8)
    setPeopleCount(newCount)
    if (isInCart) {
      updateQuantity(meal.id, newCount)
    }
  }

  const decrementPeople = () => {
    const newCount = Math.max(peopleCount - 1, 1)
    setPeopleCount(newCount)
    if (isInCart) {
      updateQuantity(meal.id, newCount)
    }
  }

  // Size variants
  const sizeClasses = {
    sm: {
      container: 'gap-1.5',
      button: 'p-1.5 text-xs',
      icon: 'w-3 h-3',
      text: 'text-xs',
      counter: 'w-6 h-6',
      counterBtn: 'w-4 h-4 p-0.5'
    },
    md: {
      container: 'gap-3',
      button: 'px-3 py-2 text-sm',
      icon: 'w-4 h-4',
      text: 'text-sm',
      counter: 'w-10 h-8',
      counterBtn: 'w-8 h-8 p-1'
    },
    lg: {
      container: 'gap-4',
      button: 'px-4 py-3 text-base',
      icon: 'w-5 h-5',
      text: 'text-base',
      counter: 'w-12 h-10',
      counterBtn: 'w-10 h-10 p-2'
    }
  }

  const classes = sizeClasses[size]

  if (isInCart) {
    return (
      <div className={`${size === 'lg' || size === 'md' ? 'w-full' : ''} flex items-center ${size === 'lg' || size === 'md' ? 'justify-between' : ''} ${classes.container} ${className}`}>
        {/* People Counter */}
        <div className="flex items-center bg-neutral-50 border border-neutral-200 rounded-lg overflow-hidden">
          <button
            onClick={decrementPeople}
            className={`${classes.counterBtn} bg-white hover:bg-neutral-50 border-r border-neutral-200 flex items-center justify-center transition-colors`}
          >
            <Minus className="w-3 h-3 text-neutral-600" />
          </button>
          <div className={`${classes.counter} flex items-center justify-center gap-1.5 ${classes.text} font-semibold text-neutral-700 bg-white px-1`}>
            <Users className="w-3 h-3 text-neutral-500" />
            {currentPeopleCount}
          </div>
          <button
            onClick={incrementPeople}
            className={`${classes.counterBtn} bg-white hover:bg-neutral-50 border-l border-neutral-200 flex items-center justify-center transition-colors`}
          >
            <Plus className="w-3 h-3 text-neutral-600" />
          </button>
        </div>

        {/* Remove Button */}
        <button
          onClick={handleRemoveFromCart}
          className={`${classes.button} bg-red-100 hover:bg-red-200 text-red-600 rounded-lg font-medium transition-colors flex items-center ${classes.container}`}
        >
          <Minus className={classes.icon} />
          <span className="hidden sm:inline">Remove</span>
        </button>
      </div>
    )
  }

  // Simple "+" button when not in cart
  return (
    <button
      onClick={handleAddToCart}
      className={`${size === 'lg' || size === 'md' ? 'w-full' : ''} ${classes.button} bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center ${classes.container} shadow-lg hover:shadow-xl`}
    >
      <Plus className={classes.icon} />
      <span className={size === 'lg' ? 'inline' : size === 'md' ? 'inline' : 'hidden sm:inline'}>
        {size === 'lg' ? 'Add to Cart' : 'Add'}
      </span>
    </button>
  )
}