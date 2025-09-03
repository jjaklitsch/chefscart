'use client'

import { useState } from 'react'
import { ShoppingCart, Plus, Minus, X, Utensils, Clock, ChefHat, Trash2 } from 'lucide-react'
import { useMealCart } from '../contexts/MealCartContext'
import InstacartInstructionsModal from './InstacartInstructionsModal'
import Link from 'next/link'

export default function MealCart() {
  const { state, removeItem, updateQuantity, clearCart, getConsolidatedIngredients } = useMealCart()
  const [creatingCart, setCreatingCart] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [cartUrl, setCartUrl] = useState<string | null>(null)

  const handleCreateInstacartCart = async () => {
    if (state.items.length === 0) return

    setCreatingCart(true)
    try {
      // Get consolidated ingredients for shopping
      const consolidatedIngredients = getConsolidatedIngredients()
      
      // Create a "meal plan" structure for the cart API
      const mealCartPlan = {
        recipes: state.items.map(item => ({
          id: parseInt(item.id),
          title: item.title,
          description: item.description,
          servings: item.peopleCount,
          ingredients: item.ingredients.map(ing => ({
            name: ing.name,
            scaled_shopping_quantity: ing.amount * item.peopleCount / item.servings, // Use actual recipe servings
            shopping_unit: ing.unit,
            category: 'Other'
          }))
        }))
      }

      // Call the create cart API
      const response = await fetch('/api/create-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: `meal_cart_${Date.now()}`,
          mealPlanData: {
            mealPlan: mealCartPlan,
            consolidatedCart: consolidatedIngredients.map(ingredient => ({
              name: ingredient.name,
              shoppableName: ingredient.name,
              amount: ingredient.totalAmount,
              unit: ingredient.unit,
              category: 'Other',
              shoppingQuantity: ingredient.totalAmount,
              shoppingUnit: ingredient.unit
            }))
          }
        })
      })

      const result = await response.json()
      
      if (result.success && result.cartUrl) {
        // Show instructions before redirecting to Instacart
        setCartUrl(result.cartUrl)
        setShowInstructions(true)
      } else {
        throw new Error(result.error || 'Failed to create cart')
      }
    } catch (error) {
      console.error('Error creating cart:', error)
      alert('Sorry, there was an error creating your shopping cart. Please try again.')
    } finally {
      setCreatingCart(false)
    }
  }

  if (state.items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-neutral-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <ShoppingCart className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-800 mb-2">Your meal cart is empty</h3>
        <p className="text-neutral-600 mb-4">Add some delicious meals to start building your shopping list</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cart Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand-100 rounded-lg p-2">
            <ShoppingCart className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-800">Your Meals</h2>
            <p className="text-sm text-neutral-600">
              {state.totalItems} meal{state.totalItems !== 1 ? 's' : ''} selected
            </p>
          </div>
        </div>
        <button
          onClick={clearCart}
          className="text-neutral-500 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Cart Items */}
      <div className="space-y-4">
        {state.items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex items-start gap-4">
              {/* Meal Image */}
              <Link 
                href={`/recipes/${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
                className="w-16 h-16 bg-gradient-to-br from-sage-100 to-cream-100 rounded-lg overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity"
              >
                {item.imageUrl ? (
                  <img 
                    src={item.imageUrl} 
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Utensils className="w-6 h-6 text-neutral-400" />
                  </div>
                )}
              </Link>

              {/* Meal Details */}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link 
                      href={`/recipes/${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
                      className="hover:text-brand-600 transition-colors"
                    >
                      <h3 className="font-semibold text-neutral-800 mb-1">{item.title}</h3>
                    </Link>
                    <p className="text-sm text-neutral-600 mb-2 line-clamp-2">{item.description}</p>
                    
                    {/* Meal Info */}
                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {item.prepTime && item.cookTime 
                            ? `${item.prepTime}m prep + ${item.cookTime}m cook`
                            : item.prepTime 
                              ? `${item.prepTime}m prep`
                              : item.cookTime 
                                ? `${item.cookTime}m cook`
                                : 'N/A'
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ChefHat className="w-3 h-3" />
                        <span>{item.cuisine}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-neutral-400 hover:text-red-500 p-1 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* People Counter */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-600">People:</span>
                    <div className="flex items-center bg-neutral-100 rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.id, Math.max(1, item.peopleCount - 1))}
                        className="p-1 hover:bg-neutral-200 rounded-l-lg transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <div className="px-3 py-1 text-sm font-semibold">
                        {item.peopleCount}
                      </div>
                      <button
                        onClick={() => updateQuantity(item.id, Math.min(8, item.peopleCount + 1))}
                        className="p-1 hover:bg-neutral-200 rounded-r-lg transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-neutral-500">
                    Added {new Date(item.addedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Shopping List Preview */}
      <div className="bg-gradient-to-br from-sage-50 to-cream-50 rounded-xl p-4 border border-sage-200">
        <h3 className="font-semibold text-neutral-800 mb-3">Shopping List Preview</h3>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {getConsolidatedIngredients().slice(0, 8).map((ingredient, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-neutral-700 capitalize">{ingredient.name}</span>
              <span className="text-neutral-500">
                {ingredient.totalAmount} {ingredient.unit}
              </span>
            </div>
          ))}
          {getConsolidatedIngredients().length > 8 && (
            <div className="text-xs text-neutral-500 text-center pt-2 border-t border-sage-200">
              +{getConsolidatedIngredients().length - 8} more ingredients
            </div>
          )}
        </div>
      </div>

      {/* Checkout Button */}
      <div className="sticky bottom-0 bg-white p-4 border-t border-neutral-200 rounded-t-xl">
        <button
          onClick={handleCreateInstacartCart}
          disabled={creatingCart}
          className="w-full flex items-center justify-center gap-3 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
        >
          {creatingCart ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Creating Shopping Cart...
            </>
          ) : (
            <>
              <ShoppingCart className="w-5 h-5" />
              Checkout with Instacart ({getConsolidatedIngredients().length} items)
            </>
          )}
        </button>
        <p className="text-xs text-neutral-500 text-center mt-2">
          Opens Instacart with your complete shopping list
        </p>
      </div>

      {/* Instacart Instructions Modal */}
      <InstacartInstructionsModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        onContinue={() => {
          if (cartUrl) {
            window.open(cartUrl, '_blank')
          }
          setShowInstructions(false)
        }}
      />
    </div>
  )
}