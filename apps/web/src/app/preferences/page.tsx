'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { ArrowLeft, Save, ShoppingCart, Utensils, Flame, Clock, Users, Leaf, Heart, X, Check } from 'lucide-react'
import Link from 'next/link'
import { UserPreferences } from '../../../types'
import { createAuthClient } from '../../../lib/supabase'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'

// Cuisine preference options (matching onboarding)
const cuisineOptions = [
  { id: 'american', label: 'American', value: ['american'], icon: '🇺🇸' },
  { id: 'caribbean', label: 'Caribbean', value: ['caribbean'], icon: '🏝️' },
  { id: 'chinese', label: 'Chinese', value: ['chinese'], icon: '🥡' },
  { id: 'french', label: 'French', value: ['french'], icon: '🇫🇷' },
  { id: 'indian', label: 'Indian', value: ['indian'], icon: '🍛' },
  { id: 'italian', label: 'Italian', value: ['italian'], icon: '🇮🇹' },
  { id: 'japanese', label: 'Japanese', value: ['japanese'], icon: '🍣' },
  { id: 'korean', label: 'Korean', value: ['korean'], icon: '🇰🇷' },
  { id: 'mediterranean', label: 'Mediterranean', value: ['mediterranean'], icon: '🫒' },
  { id: 'mexican', label: 'Mexican', value: ['mexican'], icon: '🌮' },
  { id: 'southern', label: 'Southern/Soul', value: ['southern'], icon: '🍗' },
  { id: 'thai', label: 'Thai', value: ['thai'], icon: '🌶️' },
  { id: 'vietnamese', label: 'Vietnamese', value: ['vietnamese'], icon: '🇻🇳' }
]

// Dietary style options (matching onboarding)
const dietaryOptions = [
  { id: 'none', label: 'None', value: [], icon: '✅' },
  { id: 'keto', label: 'Keto', value: ['keto'], icon: '🥑' },
  { id: 'low_carb', label: 'Low-carb', value: ['low-carb'], icon: '🥒' },
  { id: 'mediterranean', label: 'Mediterranean', value: ['mediterranean'], icon: '🫒' },
  { id: 'paleo', label: 'Paleo', value: ['paleo'], icon: '🥩' },
  { id: 'pescatarian', label: 'Pescatarian', value: ['pescatarian'], icon: '🐟' },
  { id: 'plant_forward', label: 'Plant-forward (Flexitarian)', value: ['plant-forward'], icon: '🌿' },
  { id: 'vegan', label: 'Vegan', value: ['vegan'], icon: '🌱' },
  { id: 'vegetarian', label: 'Vegetarian', value: ['vegetarian'], icon: '🥬' },
  { id: 'whole30', label: 'Whole30', value: ['whole30'], icon: '🥗' }
]

// Foods to avoid options (matching onboarding)
const avoidOptions = [
  { id: 'none', label: 'None', value: [], icon: '✅' },
  { id: 'dairy', label: 'Dairy', value: ['dairy'], icon: '🥛' },
  { id: 'egg', label: 'Egg', value: ['egg'], icon: '🥚' },
  { id: 'gluten', label: 'Gluten', value: ['gluten'], icon: '🌾' },
  { id: 'grain', label: 'Grain', value: ['grain'], icon: '🌾' },
  { id: 'peanut', label: 'Peanut', value: ['peanut'], icon: '🥜' },
  { id: 'seafood', label: 'Seafood', value: ['seafood'], icon: '🦐' },
  { id: 'sesame', label: 'Sesame', value: ['sesame'], icon: '🫘' },
  { id: 'shellfish', label: 'Shellfish', value: ['shellfish'], icon: '🦪' },
  { id: 'soy', label: 'Soy', value: ['soy'], icon: '🫛' },
  { id: 'sulfite', label: 'Sulfite', value: ['sulfite'], icon: '🧪' },
  { id: 'tree_nut', label: 'Tree Nut', value: ['tree_nut'], icon: '🌰' },
  { id: 'wheat', label: 'Wheat', value: ['wheat'], icon: '🌾' }
]

// Favorite foods options (matching onboarding)
const favoriteFoodsOptions = [
  // Proteins
  { id: 'chicken', label: 'Chicken', value: ['chicken'], icon: '🐔' },
  { id: 'beef_steak', label: 'Beef/Steak', value: ['beef', 'steak'], icon: '🥩' },
  { id: 'salmon', label: 'Salmon', value: ['salmon'], icon: '🐟' },
  { id: 'shrimp', label: 'Shrimp', value: ['shrimp'], icon: '🦐' },
  { id: 'tofu_tempeh', label: 'Tofu/Tempeh', value: ['tofu', 'tempeh'], icon: '🌱' },
  { id: 'beans_lentils', label: 'Beans/Lentils', value: ['beans', 'lentils'], icon: '🫘' },
  { id: 'eggs', label: 'Eggs', value: ['eggs'], icon: '🥚' },
  // Meal Formats
  { id: 'pasta', label: 'Pasta', value: ['pasta'], icon: '🍝' },
  { id: 'bowls', label: 'Bowls', value: ['bowls', 'rice bowls'], icon: '🍚' },
  { id: 'tacos', label: 'Tacos', value: ['tacos'], icon: '🌮' },
  { id: 'stir_fry', label: 'Stir-fry', value: ['stir-fry'], icon: '🍳' },
  { id: 'burgers', label: 'Burgers', value: ['burgers'], icon: '🍔' },
  { id: 'sandwiches_wraps', label: 'Sandwiches/Wraps', value: ['sandwiches', 'wraps'], icon: '🥪' },
  { id: 'pizza', label: 'Pizza', value: ['pizza'], icon: '🍕' },
  { id: 'salads', label: 'Salads', value: ['salads'], icon: '🥗' },
  { id: 'soups_stews', label: 'Soups/Stews', value: ['soups', 'stews'], icon: '🍲' },
  { id: 'oatmeal', label: 'Oatmeal', value: ['oatmeal'], icon: '🥣' },
  { id: 'yogurt_parfaits', label: 'Yogurt Parfaits', value: ['yogurt', 'parfaits'], icon: '🥛' },
  { id: 'roasted_vegetables', label: 'Roasted Vegetables', value: ['roasted vegetables'], icon: '🥕' }
]

export default function PreferencesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    } else if (user) {
      loadPreferences()
    }
  }, [user, loading, router])

  const loadPreferences = async () => {
    try {
      // Load from user metadata or profile
      if (user?.user_metadata?.preferences) {
        setPreferences(user.user_metadata.preferences)
      } else {
        // Try loading from localStorage as fallback
        const stored = localStorage.getItem(`chefscart_user_${user?.email}`)
        if (stored) {
          const data = JSON.parse(stored)
          setPreferences(data.preferences || {})
        } else {
          // No stored preferences
          setPreferences(null)
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    }
  }

  const handleSave = async () => {
    if (!user || !preferences) return

    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createAuthClient()
      
      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          preferences: preferences,
          completedOnboarding: true
        }
      })

      if (updateError) throw updateError

      // Also save to localStorage for quick access
      const userData = {
        email: user.email,
        preferences: preferences,
        updatedAt: new Date().toISOString()
      }
      localStorage.setItem(`chefscart_user_${user.email}`, JSON.stringify(userData))

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving preferences:', err)
      setError('Failed to save preferences. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleArrayPreference = (category: 'preferredCuisines' | 'dietaryStyle' | 'foodsToAvoid' | 'favoriteFoods', value: string | string[]) => {
    if (!preferences) return
    
    const current = preferences[category] || []
    const valueArray = Array.isArray(value) ? value : [value]
    
    // Check if any of the values are already selected
    const hasValue = valueArray.some(v => current.includes(v))
    
    let updated
    if (hasValue) {
      // Remove all matching values
      updated = current.filter(item => !valueArray.includes(item))
    } else {
      // Add all values
      updated = [...current, ...valueArray]
    }
    
    setPreferences({
      ...preferences,
      [category]: updated
    })
  }

  const isOptionSelected = (category: 'preferredCuisines' | 'dietaryStyle' | 'foodsToAvoid' | 'favoriteFoods', value: string | string[]) => {
    if (!preferences) return false
    const current = preferences[category] || []
    const valueArray = Array.isArray(value) ? value : [value]
    
    // Special handling for "None" options - selected when array is empty
    if (valueArray.length === 1 && valueArray[0] === '') {
      return current.length === 0
    }
    
    return valueArray.some(v => current.includes(v))
  }

  if (loading || !preferences) {
    return (
      <div className="min-h-screen bg-health-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4 w-12 h-12"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading preferences...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link 
            href="/dashboard"
            className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-green-600 rounded-full p-3">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Meal Preferences</h1>
              <p className="text-gray-600">Customize your meal recommendations</p>
            </div>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-green-700">Preferences saved successfully!</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <X className="w-5 h-5 text-red-600" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-8">
            {/* People per Meal - moved to top */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">People per Meal</h2>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setPreferences({ ...preferences, peoplePerMeal: Math.max(1, (preferences.peoplePerMeal || 2) - 1) })}
                  className="w-10 h-10 rounded-full border-2 border-gray-300 hover:border-gray-400 flex items-center justify-center font-bold"
                  disabled={preferences.peoplePerMeal <= 1}
                >
                  −
                </button>
                <div className="text-2xl font-bold text-gray-900 w-16 text-center">
                  {preferences.peoplePerMeal || 2}
                </div>
                <button
                  onClick={() => setPreferences({ ...preferences, peoplePerMeal: Math.min(8, (preferences.peoplePerMeal || 2) + 1) })}
                  className="w-10 h-10 rounded-full border-2 border-gray-300 hover:border-gray-400 flex items-center justify-center font-bold"
                  disabled={preferences.peoplePerMeal >= 8}
                >
                  +
                </button>
              </div>
            </div>

            {/* Cuisine Preferences */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Utensils className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">Favorite Cuisines</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {cuisineOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={() => toggleArrayPreference('preferredCuisines', option.value)}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors flex items-center gap-2 ${
                      isOptionSelected('preferredCuisines', option.value)
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <span>{option.icon}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dietary Style */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Leaf className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">Dietary Style</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {dietaryOptions.map(option => {
                  const isNoneOption = option.id === 'none'
                  const isSelected = isNoneOption 
                    ? (preferences.dietaryStyle || []).length === 0
                    : isOptionSelected('dietaryStyle', option.value)
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        if (isNoneOption) {
                          setPreferences({ ...preferences, dietaryStyle: [] })
                        } else {
                          toggleArrayPreference('dietaryStyle', option.value)
                        }
                      }}
                      className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors flex items-center gap-2 ${
                        isSelected
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <span>{option.icon}</span>
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Favorite Foods */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">Favorite Foods</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {favoriteFoodsOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={() => toggleArrayPreference('favoriteFoods', option.value)}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors flex items-center gap-2 ${
                      isOptionSelected('favoriteFoods', option.value)
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <span>{option.icon}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Foods to Avoid */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <X className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">Foods to Avoid</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {avoidOptions.map(option => {
                  const isNoneOption = option.id === 'none'
                  const isSelected = isNoneOption 
                    ? (preferences.foodsToAvoid || []).length === 0
                    : isOptionSelected('foodsToAvoid', option.value)
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        if (isNoneOption) {
                          setPreferences({ ...preferences, foodsToAvoid: [] })
                        } else {
                          toggleArrayPreference('foodsToAvoid', option.value)
                        }
                      }}
                      className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors flex items-center gap-2 ${
                        isSelected
                          ? 'bg-red-600 border-red-600 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <span>{option.icon}</span>
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Spice Tolerance */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">Spice Tolerance</h2>
              </div>
              <div className="space-y-2">
                {[
                  { id: '1', label: '1 - Mild', icon: '😊', description: 'No heat, very mild flavors' },
                  { id: '2', label: '2 - Low', icon: '🙂', description: 'Just a hint of warmth' },
                  { id: '3', label: '3 - Medium', icon: '😋', description: 'Moderate spice, noticeable heat' },
                  { id: '4', label: '4 - Hot', icon: '🔥', description: 'Spicy with significant heat' },
                  { id: '5', label: '5 - Very Spicy', icon: '🌶️', description: 'Maximum heat, very spicy' }
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => setPreferences({ ...preferences, spiceTolerance: option.id })}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all duration-200 flex items-center gap-3 ${
                      preferences.spiceTolerance === option.id
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-orange-300 hover:bg-orange-25'
                    }`}
                  >
                    <span className="text-xl">{option.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </div>
                    {preferences.spiceTolerance === option.id && (
                      <Check className="w-4 h-4 text-orange-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>


            {/* Organic Preference */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Leaf className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">Organic Preference</h2>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => setPreferences({ ...preferences, organicPreference: 'yes' })}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all duration-200 flex items-center gap-3 ${
                    preferences.organicPreference === 'yes'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
                  }`}
                >
                  <span className="text-xl">🌱</span>
                  <span className="font-medium">Yes, prefer organic when available</span>
                  {preferences.organicPreference === 'yes' && (
                    <Check className="w-4 h-4 text-green-600 ml-auto" />
                  )}
                </button>
                <button
                  onClick={() => setPreferences({ ...preferences, organicPreference: 'no' })}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all duration-200 flex items-center gap-3 ${
                    preferences.organicPreference === 'no'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
                  }`}
                >
                  <span className="text-xl">💰</span>
                  <span className="font-medium">No, go with the lowest cost option</span>
                  {preferences.organicPreference === 'no' && (
                    <Check className="w-4 h-4 text-green-600 ml-auto" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  )
}