'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Users, Plus, Heart, MessageCircle, BookOpen, Star, TrendingUp, Clock, ChefHat } from 'lucide-react'
import Link from 'next/link'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import { UserRecipe, SocialUserProfile } from '../../../types'

export default function CommunityPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [trendingRecipes, setTrendingRecipes] = useState<UserRecipe[]>([])
  const [recentRecipes, setRecentRecipes] = useState<UserRecipe[]>([])
  const [featuredChefs, setFeaturedChefs] = useState<SocialUserProfile[]>([])
  const [isLoadingTrending, setIsLoadingTrending] = useState(true)
  const [isLoadingRecent, setIsLoadingRecent] = useState(true)
  const [isLoadingChefs, setIsLoadingChefs] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadCommunityData()
    }
  }, [user])

  const loadCommunityData = async () => {
    try {
      // Load trending recipes
      const trendingResponse = await fetch('/api/social/recipes?sort=trending&limit=6')
      if (trendingResponse.ok) {
        const trendingData = await trendingResponse.json()
        setTrendingRecipes(trendingData.recipes || [])
      }
      setIsLoadingTrending(false)

      // Load recent recipes
      const recentResponse = await fetch('/api/social/recipes?sort=recent&limit=8')
      if (recentResponse.ok) {
        const recentData = await recentResponse.json()
        setRecentRecipes(recentData.recipes || [])
      }
      setIsLoadingRecent(false)

      // For now, we'll use mock data for featured chefs
      // In a real implementation, this would come from an API
      setFeaturedChefs([])
      setIsLoadingChefs(false)
    } catch (error) {
      console.error('Error loading community data:', error)
      setIsLoadingTrending(false)
      setIsLoadingRecent(false)
      setIsLoadingChefs(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <div className="flex justify-center items-center gap-2 mb-4">
              <Users className="w-8 h-8" />
              <h1 className="text-4xl font-bold">Community Kitchen</h1>
            </div>
            <p className="text-purple-100 text-lg mb-6">
              Share your recipes, discover amazing dishes, and connect with fellow food lovers
            </p>
            
            {/* Quick Action Buttons */}
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/community/create-recipe"
                className="inline-flex items-center gap-2 bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Share Your Recipe
              </Link>
              <Link
                href="/community/browse"
                className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                <BookOpen className="w-5 h-5" />
                Browse All Recipes
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">2.3K+</div>
              <div className="text-purple-100 text-sm">Community Recipes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">850+</div>
              <div className="text-purple-100 text-sm">Active Chefs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">12K+</div>
              <div className="text-purple-100 text-sm">Recipe Saves</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">5.8K+</div>
              <div className="text-purple-100 text-sm">Reviews</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Trending Recipes */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 rounded-lg p-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Trending This Week</h2>
                <p className="text-gray-600">Most loved recipes from our community</p>
              </div>
            </div>
            <Link
              href="/community/browse?sort=trending"
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              See All →
            </Link>
          </div>

          {isLoadingTrending ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                  <div className="aspect-video bg-gray-200"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : trendingRecipes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingRecipes.map((recipe) => (
                <Link
                  key={recipe.id}
                  href={`/community/recipe/${recipe.slug}`}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 group"
                >
                  <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                    {recipe.image_urls?.[0] ? (
                      <img
                        src={recipe.image_urls[0]}
                        alt={recipe.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ChefHat className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                      {recipe.total_time}m
                    </div>
                    <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5">
                      <Heart className="w-4 h-4 text-red-500" />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                      {recipe.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {recipe.description}
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>@{recipe.author?.username || 'chef'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          <span>{recipe.like_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>4.8</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <ChefHat className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No trending recipes yet</h3>
              <p className="text-gray-600 mb-4">Be the first to share a recipe with the community!</p>
              <Link
                href="/community/create-recipe"
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Share Recipe
              </Link>
            </div>
          )}
        </section>

        {/* Recent Recipes */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 rounded-lg p-2">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Fresh from the Kitchen</h2>
                <p className="text-gray-600">Latest recipes shared by our community</p>
              </div>
            </div>
            <Link
              href="/community/browse?sort=recent"
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              See All →
            </Link>
          </div>

          {isLoadingRecent ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-200"></div>
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentRecipes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentRecipes.map((recipe) => (
                <Link
                  key={recipe.id}
                  href={`/community/recipe/${recipe.slug}`}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 group"
                >
                  <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                    {recipe.image_urls?.[0] ? (
                      <img
                        src={recipe.image_urls[0]}
                        alt={recipe.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ChefHat className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                      {recipe.title}
                    </h3>
                    <div className="text-xs text-gray-500">
                      @{recipe.author?.username || 'chef'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-600">No recent recipes available.</p>
            </div>
          )}
        </section>
      </div>
      
      <Footer />
    </div>
  )
}