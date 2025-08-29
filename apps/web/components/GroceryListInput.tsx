"use client"

import { useState } from 'react'
import { ArrowLeft, ShoppingCart, Upload, Camera, Clipboard, CheckCircle, Plus, Minus, X } from 'lucide-react'

interface GroceryListInputProps {
  onBack: () => void
}

interface ParsedItem {
  name: string
  amount: number
  unit: string
  originalText: string
}

export default function GroceryListInput({ onBack }: GroceryListInputProps) {
  const [rawList, setRawList] = useState('')
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [step, setStep] = useState<'input' | 'review' | 'cart'>('input')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [showAddInReview, setShowAddInReview] = useState(false)
  const [newReviewItem, setNewReviewItem] = useState('')

  // Unit classification for intelligent conversion (same as CartBuilder)
  const RECIPE_UNITS = new Set(['cups', 'cup', 'tbsp', 'tablespoon', 'tsp', 'teaspoon', 'fl oz', 'fluid oz', 'pint', 'quart', 'gallon'])
  const PURCHASE_UNITS = new Set(['lbs', 'lb', 'oz', 'kg', 'g', 'can', 'jar', 'bottle', 'bag', 'box', 'package', 'bunch', 'head', 'clove', 'slice'])
  const COUNT_UNITS = new Set(['piece', 'pieces', 'each', 'whole'])

  // Function to convert recipe units to appropriate purchase units
  const convertRecipeUnitToPurchaseUnit = (amount: number, unit: string, itemName: string): { amount: number; unit: string } => {
    const lowerUnit = unit.toLowerCase()
    const lowerItem = itemName.toLowerCase()
    
    if (!RECIPE_UNITS.has(lowerUnit)) {
      // Already a purchase unit or count unit, keep as is
      return { amount, unit }
    }
    
    // Convert recipe units to purchase units based on item type
    
    // Dry goods (buy in bags/boxes)
    if (lowerItem.includes('rice') || lowerItem.includes('flour') || lowerItem.includes('sugar') || 
        lowerItem.includes('pasta') || lowerItem.includes('cereal') || lowerItem.includes('oats') ||
        lowerItem.includes('quinoa') || lowerItem.includes('barley') || lowerItem.includes('lentil')) {
      return { amount: 1, unit: 'bag' }
    }
    
    // Liquids (buy in bottles/cartons)
    if (lowerItem.includes('oil') || lowerItem.includes('vinegar') || lowerItem.includes('sauce') ||
        lowerItem.includes('dressing') || lowerItem.includes('syrup')) {
      return { amount: 1, unit: 'bottle' }
    }
    
    // Dairy (buy in cartons/containers)
    if (lowerItem.includes('milk') || lowerItem.includes('cream') || lowerItem.includes('yogurt') ||
        lowerItem.includes('butter')) {
      if (lowerUnit.includes('cup') && amount >= 2) {
        return { amount: 1, unit: 'half-gallon' }
      }
      return { amount: 1, unit: 'container' }
    }
    
    // Spices/herbs (buy in small containers)
    if (lowerUnit.includes('tsp') || lowerUnit.includes('tbsp')) {
      return { amount: 1, unit: 'container' }
    }
    
    // Default: convert to weight or container
    if (amount >= 2 && (lowerUnit.includes('cup') || lowerUnit.includes('pint'))) {
      return { amount: Math.ceil(amount / 4), unit: 'lbs' } // Rough conversion
    }
    
    return { amount: 1, unit: 'container' }
  }

  // Function to get recommended purchase unit for items without units
  const getRecommendedPurchaseUnit = (itemName: string): string => {
    const name = itemName.toLowerCase()
    
    // Produce items that are typically counted
    if (name.includes('banana') || name.includes('apple') || name.includes('orange') ||
        name.includes('lemon') || name.includes('lime') || name.includes('avocado')) {
      return 'each'
    }
    
    // Items typically sold by weight
    if (name.includes('chicken') || name.includes('beef') || name.includes('pork') ||
        name.includes('fish') || name.includes('salmon') || name.includes('ground')) {
      return 'lbs'
    }
    
    // Dry goods
    if (name.includes('rice') || name.includes('pasta') || name.includes('flour') ||
        name.includes('sugar') || name.includes('cereal')) {
      return 'bag'
    }
    
    // Liquids
    if (name.includes('oil') || name.includes('vinegar') || name.includes('sauce')) {
      return 'bottle'
    }
    
    // Default to generic container
    return 'package'
  }

  const parseGroceryList = (text: string): ParsedItem[] => {
    const lines = text.trim().split('\n').filter(line => line.trim())
    const items: ParsedItem[] = []

    lines.forEach(line => {
      const trimmedLine = line.trim()
      if (!trimmedLine) return

      // Remove common list formatting (bullets, numbers, dashes)
      const cleanLine = trimmedLine.replace(/^[-•*\d+\.\)]\s*/, '').trim()
      
      let amount = 1
      let unit = ''
      let name = cleanLine

      // First try to match number + unit + name (e.g., "2 lbs chicken")
      let match = cleanLine.match(/^(\d+(?:\.\d+)?)\s+([a-zA-Z]+)\s+(.+)$/)

      if (match) {
        // Has unit: "2 lbs chicken"
        amount = parseFloat(match[1] || '1')
        const potentialUnit = match[2] || ''
        name = match[3] || cleanLine
        
        // All recognized units (recipe + purchase + count)
        const allUnits = [...Array.from(RECIPE_UNITS), ...Array.from(PURCHASE_UNITS), ...Array.from(COUNT_UNITS)]
        if (allUnits.includes(potentialUnit.toLowerCase())) {
          unit = potentialUnit
        } else {
          // If it's not a recognized unit, treat it as part of the name
          name = `${potentialUnit} ${name}`
        }
      } else {
        // Try to match number + name (e.g., "5 bananas")
        match = cleanLine.match(/^(\d+(?:\.\d+)?)\s+(.+)$/)
        if (match) {
          amount = parseFloat(match[1] || '1')
          name = match[2] || cleanLine
          unit = ''
        }
      }

      // Capitalize first letter of name
      name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()

      // Convert recipe units to purchase units if needed
      if (unit) {
        const converted = convertRecipeUnitToPurchaseUnit(amount, unit, name)
        amount = converted.amount
        unit = converted.unit
      }

      // If no unit specified, infer appropriate purchase unit
      if (!unit) {
        unit = getRecommendedPurchaseUnit(name)
      }

      items.push({
        name,
        amount,
        unit: unit || 'package', // fallback unit
        originalText: trimmedLine
      })
    })

    return items
  }

  const handleProcessList = () => {
    if (!rawList.trim()) return

    setIsProcessing(true)
    
    // Simulate processing delay for better UX
    setTimeout(() => {
      const parsed = parseGroceryList(rawList)
      setParsedItems(parsed)
      setStep('review')
      setIsProcessing(false)
    }, 1000)
  }

  const updateItemQuantity = (index: number, delta: number) => {
    setParsedItems(prev => 
      prev.map((item, i) => 
        i === index 
          ? { ...item, amount: Math.max(0, item.amount + delta) }
          : item
      )
    )
  }

  const removeItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== index))
  }

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const handleAddReviewItem = () => {
    if (!newReviewItem.trim()) return

    const parsed = parseGroceryList(newReviewItem)
    if (parsed.length > 0) {
      setParsedItems([...parsedItems, ...parsed])
      setNewReviewItem('')
      setShowAddInReview(false)
    }
  }

  const handleCreateCart = async () => {
    if (!email) {
      setEmailError('Email is required')
      return
    }
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address')
      return
    }

    setIsProcessing(true)
    setEmailError('')

    try {
      // Save user data locally for login system
      const zipCode = localStorage.getItem('chefscart_zipcode') || ''
      const userData = {
        email,
        zipCode,
        preferences: { groceryListUser: true }, // Basic info for grocery list users
        completedOnboarding: false, // They used grocery list, not full onboarding
        lastLogin: new Date().toISOString(),
        usedGroceryList: true
      }
      localStorage.setItem(`chefscart_user_${email}`, JSON.stringify(userData))
      localStorage.setItem('chefscart_current_user', email)
      
      // Create cart with parsed items
      const response = await fetch('/api/create-cart-mock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          groceryList: parsedItems.filter(item => item.amount > 0),
          zipCode,
          source: 'grocery-list'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create cart')
      }

      const data = await response.json()
      
      // Redirect to Instacart cart
      if (data.cartUrl) {
        window.open(data.cartUrl, '_blank')
      }
      
      setStep('cart')

    } catch (error) {
      console.error('Error creating cart:', error)
      setEmailError('Unable to create your cart right now. Please check your connection and try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const totalItems = parsedItems.filter(item => item.amount > 0).length

  if (step === 'cart') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2 text-green-800">🎉 Cart Created!</h2>
            <p className="text-green-700">Your grocery list has been converted to an Instacart cart. Check your email for the confirmation and shopping details.</p>
          </div>
          <button
            onClick={() => window.location.href = '/grocery-list'}
            className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
          >
            Create Another List
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Back button */}
        <div className="mb-6">
          <button
            onClick={step === 'input' ? onBack : () => setStep('input')}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 'input' ? 'Back to Landing' : 'Back to List'}
          </button>
        </div>

        {step === 'input' && (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Paste Your Grocery List</h1>
              <p className="text-gray-600">Copy from anywhere - notes app, recipe sites, or type it fresh</p>
            </div>

            {/* Input Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">

              <textarea
                value={rawList}
                onChange={(e) => setRawList(e.target.value)}
                placeholder="Paste your grocery list here, one item per line:&#10;&#10;5 bananas&#10;2 lbs chicken breast&#10;olive oil&#10;3 cups rice&#10;1 dozen eggs&#10;bread&#10;milk"
                rows={12}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              />
              
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-gray-500">
                  Supported formats: "5 bananas", "2 lbs chicken", "olive oil"
                </p>
                <button
                  onClick={handleProcessList}
                  disabled={!rawList.trim() || isProcessing}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Process List
                      <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Your Items</h1>
              <p className="text-gray-600">We've processed your list. Add, remove, or adjust quantities before checkout.</p>
            </div>

            {/* Items Summary */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ShoppingCart className="h-5 w-5 text-orange-600 mr-3" />
                  <span className="font-semibold text-gray-900">{totalItems} items ready for checkout</span>
                </div>
              </div>
            </div>

            {/* Add Item Button/Form */}
            {!showAddInReview ? (
              <div className="flex justify-center mb-6">
                <button
                  onClick={() => setShowAddInReview(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add More Items
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Add Items</h3>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="e.g., 2 apples, bread, 1 lb ground beef"
                    value={newReviewItem}
                    onChange={(e) => setNewReviewItem(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddReviewItem()}
                  />
                  <button
                    onClick={handleAddReviewItem}
                    disabled={!newReviewItem.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddInReview(false)
                      setNewReviewItem('')
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Parsed Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Your Grocery List</h3>
              </div>
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {parsedItems.map((item, index) => (
                  <div key={index} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-gray-100 rounded-lg">
                          <button
                            onClick={() => updateItemQuantity(index, -1)}
                            className="p-1 hover:bg-gray-200 rounded-l-lg transition-colors"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="px-3 py-1 text-sm font-medium">
                            {item.unit ? `${item.amount} ${item.unit}` : item.amount}
                          </span>
                          <button
                            onClick={() => updateItemQuantity(index, 1)}
                            className="p-1 hover:bg-gray-200 rounded-r-lg transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <button
                          onClick={() => removeItem(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Collection */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Almost Ready!</h3>
              <p className="text-gray-600 mb-4">We'll send you the cart link and shopping confirmation.</p>
              <input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError && validateEmail(e.target.value)) {
                    setEmailError('')
                  }
                }}
                className={`w-full p-3 border-2 rounded-lg focus:ring-0 transition-colors ${
                  emailError 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-200 focus:border-orange-500'
                }`}
              />
              {emailError && (
                <p className="text-red-600 text-sm mt-2">{emailError}</p>
              )}
            </div>

            {/* Continue Button */}
            <div className="text-center">
              <button
                onClick={handleCreateCart}
                disabled={!email || !totalItems || isProcessing}
                className="px-8 py-4 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg flex items-center mx-auto"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                    Creating Cart...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5 mr-3" />
                    Create Instacart Cart ({totalItems} items)
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}