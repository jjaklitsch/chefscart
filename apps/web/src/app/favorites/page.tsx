'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { Heart, ShoppingCart, Plus, Clock, Users } from 'lucide-react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import FavoriteHeart from '../../../components/ui/FavoriteHeart'
import { Recipe, FavoritesResponse } from '../../../types'

export default function FavoritesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [favorites, setFavorites] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadFavorites()
    }
  }, [user])

  const loadFavorites = async () => {
    try {
      const response = await fetch('/api/favorites')
      if (response.ok) {
        const data: FavoritesResponse = await response.json()
        setFavorites(data.favorites)
      } else {
        console.error('Error loading favorites:', await response.text())
      }
    } catch (error) {
      console.error('Network error loading favorites:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFavoriteChange = (recipeId: string, isFavorited: boolean) => {
    if (!isFavorited) {
      // Remove from favorites list
      setFavorites(prev => prev.filter(recipe => recipe.id !== recipeId))
    }
  }

  const createMealPlanFromFavorites = () => {
    // TODO: Navigate to meal plan creation with pre-selected favorites
    router.push('/meal-plan-builder?source=favorites')
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-health-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4 w-12 h-12"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-health-gradient">
      <Header />

      {/* Page Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Heart className="w-8 h-8 text-red-500 fill-current" />
                Your Favorite Meals
              </h1>
              <p className="text-gray-600 mt-2">
                Your personal collection of loved recipes, ready to reorder anytime
              </p>
            </div>
            {favorites.length > 0 && (
              <button
                onClick={createMealPlanFromFavorites}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Meal Plan from Favorites
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="loading-spinner mx-auto mb-4 w-8 h-8"></div>
            <p className="text-gray-600">Loading your favorite meals...</p>
          </div>
        ) : favorites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((recipe) => (
              <div key={recipe.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Recipe Image */}
                <div className="relative h-48 bg-gradient-to-br from-green-100 to-green-200">
                  {recipe.imageUrl ? (
                    <img 
                      src={recipe.imageUrl} 
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="w-12 h-12 text-green-600" />
                    </div>
                  )}
                  
                  {/* Favorite Heart */}
                  <div className="absolute top-4 right-4">
                    <FavoriteHeart 
                      mealId={recipe.id}
                      isFavorited={true}
                      size="md"
                      className="bg-white/80 backdrop-blur-sm hover:bg-white/90"
                      onFavoriteChange={(isFavorited) => handleFavoriteChange(recipe.id, isFavorited)}
                    />
                  </div>
                  
                  {/* Difficulty Badge */}
                  <div className="absolute bottom-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm text-gray-800 text-sm font-medium rounded-lg">
                    {recipe.difficulty}
                  </div>
                </div>

                {/* Recipe Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                    {recipe.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {recipe.description}
                  </p>

                  {/* Recipe Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{recipe.prepTime || 0}m prep + {recipe.cookTime || 0}m cook</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{recipe.servings} servings</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        // TODO: Add to current meal plan or create new one with this recipe
                        createMealPlanFromFavorites()
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add to Plan
                    </button>
                  </div>

                  {/* Favorited Date */}
                  {recipe.favoritedAt && (
                    <p className="text-xs text-gray-400 mt-3">
                      Favorited {new Date(recipe.favoritedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-12 h-12 text-red-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No favorite meals yet</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start exploring our recipes and tap the heart icon on meals you love to add them to your favorites!
            </p>
            <button
              onClick={() => router.push('/meal-plan-builder')}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              <Plus className="w-5 h-5" />
              Discover New Meals
            </button>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  )
}