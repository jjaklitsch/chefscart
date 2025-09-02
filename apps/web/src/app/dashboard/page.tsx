'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { ShoppingCart, Plus, User, Clock, ChefHat, ExternalLink, RotateCcw, Eye, Trash2, CheckCircle, X, Heart, Star, Users, Timer, Utensils, BookOpen } from 'lucide-react'
import Link from 'next/link'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'

interface RecentMealPlan {
  id: string
  createdAt: string
  cartUrl?: string
  recipes?: Array<{
    title: string
    mealType: string
    imageUrl?: string
  }>
  mealPlan?: {
    recipes: Array<{
      title: string
      mealType: string
      imageUrl?: string
    }>
  }
}

interface RecommendedRecipe {
  id: string
  title: string
  description: string
  prep_time?: number
  cook_time?: number
  totalTime: number
  cuisines: string[]
  cooking_difficulty: string
  courses: string[]
  image_url?: string
  slug: string
  primary_ingredient?: string
}

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [recentMealPlans, setRecentMealPlans] = useState<RecentMealPlan[]>([])
  const [isLoadingPlans, setIsLoadingPlans] = useState(true)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [recommendations, setRecommendations] = useState<RecommendedRecipe[]>([])
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true)

  useEffect(() => {
    console.log('Dashboard auth state:', { loading, hasUser: !!user, userEmail: user?.email })
    if (!loading && !user) {
      console.log('No user found, redirecting to login')
      router.push('/login')
    }
  }, [user, loading, router])

  // Check for welcome flag in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const welcomeParam = searchParams.get('welcome')
    if (welcomeParam === 'true' && user) {
      setShowWelcomeModal(true)
      // Clean up URL without page reload
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadRecentMealPlans()
      loadRecommendations()
    }
  }, [user])

  const loadRecentMealPlans = async () => {
    try {
      // For now, load from localStorage (will migrate to Supabase)
      const storedPlans = []
      const currentUser = localStorage.getItem('chefscart_current_user')
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('chefscart_mealplan_')) {
          try {
            const planData = JSON.parse(localStorage.getItem(key) || '{}')
            
            // Check for meal plans that belong to this user:
            // 1. Direct email match with authenticated user
            // 2. Email matches the current user from localStorage (pre-auth)
            const belongsToUser = planData.email === user?.email || 
                                 planData.email === currentUser
            
            if (belongsToUser) {
              // Update the email to match the authenticated user for consistency
              if (planData.email !== user?.email && user?.email) {
                planData.email = user.email
                localStorage.setItem(key, JSON.stringify(planData))
              }
              storedPlans.push(planData)
            }
          } catch (e) {
            console.error('Error parsing meal plan:', e)
          }
        }
      }
      
      // Sort by creation date and limit to 3 most recent
      const sortedPlans = storedPlans
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3)
      
      setRecentMealPlans(sortedPlans)
    } catch (error) {
      console.error('Error loading meal plans:', error)
    } finally {
      setIsLoadingPlans(false)
    }
  }

  const loadRecommendations = async () => {
    try {
      const response = await fetch('/api/recommendations?limit=8')
      if (response.ok) {
        const data = await response.json()
        setRecommendations(data.recommendations || [])
      } else {
        console.error('Failed to load recommendations')
      }
    } catch (error) {
      console.error('Error loading recommendations:', error)
    } finally {
      setIsLoadingRecommendations(false)
    }
  }

  const deleteMealPlan = async (planId: string) => {
    try {
      // Remove from localStorage
      localStorage.removeItem(`chefscart_mealplan_${planId}`)
      // Reload meal plans
      await loadRecentMealPlans()
    } catch (error) {
      console.error('Error deleting meal plan:', error)
    }
  }

  const handleReorder = async (planId: string) => {
    try {
      const response = await fetch(`/api/meal-plans/${planId}/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Reload meal plans to show the new one
        await loadRecentMealPlans()
        
        // Navigate to the new meal plan or show success message
        router.push(`/cart-builder/${data.mealPlan.id}`)
      } else {
        const errorData = await response.json()
        console.error('Error reordering meal plan:', errorData.error)
        // TODO: Show user-friendly error message
      }
    } catch (error) {
      console.error('Network error reordering meal plan:', error)
      // TODO: Show user-friendly error message
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-health-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4 w-12 h-12"></div>
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

      {/* Visual Hero Section */}
      <div className="bg-gradient-to-br from-green-600 to-green-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              Welcome back, {user.email?.split('@')[0]}! 👋
            </h1>
            <p className="text-green-100 text-lg">
              Discover your next favorite meal
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <Link
              href="/quick-plan"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center transition-colors group"
            >
              <div className="bg-white/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2 group-hover:bg-white/30 transition-colors">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-1 text-sm">Create Plan</h3>
              <p className="text-green-100 text-xs">Plan your week</p>
            </Link>

            <Link
              href="/recipes"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center transition-colors group"
            >
              <div className="bg-white/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2 group-hover:bg-white/30 transition-colors">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-1 text-sm">Discover</h3>
              <p className="text-green-100 text-xs">Browse recipes</p>
            </Link>

            <Link
              href="/community/create-recipe"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center transition-colors group"
            >
              <div className="bg-white/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2 group-hover:bg-white/30 transition-colors">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-1 text-sm">Share Recipe</h3>
              <p className="text-green-100 text-xs">Add your own</p>
            </Link>

            <Link
              href="/community"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center transition-colors group"
            >
              <div className="bg-white/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2 group-hover:bg-white/30 transition-colors">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-1 text-sm">Community</h3>
              <p className="text-green-100 text-xs">Browse & follow</p>
            </Link>
          </div>

          {/* Recommended For You Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <Utensils className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Recommended for You</h2>
                  <p className="text-green-100 text-sm">Based on trending recipes</p>
                </div>
              </div>
              <Link
                href="/recipes"
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                See All
              </Link>
            </div>

            {isLoadingRecommendations ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white/20 rounded-xl p-4 animate-pulse">
                    <div className="bg-white/30 rounded-lg aspect-square mb-3"></div>
                    <div className="bg-white/30 h-4 rounded mb-2"></div>
                    <div className="bg-white/30 h-3 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {recommendations.map((recipe) => (
                  <Link
                    key={recipe.id}
                    href={`/recipes/${recipe.slug}`}
                    className="group"
                  >
                    <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col">
                      <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden flex-shrink-0">
                        {recipe.image_url ? (
                          <img
                            src={recipe.image_url}
                            alt={recipe.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ChefHat className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5">
                          <Heart className="w-4 h-4 text-gray-600" />
                        </div>
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 line-clamp-2 min-h-[2.5rem]">
                          {recipe.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-auto">
                          <div className="flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            <span>{recipe.totalTime}m</span>
                          </div>
                          <span>•</span>
                          <span className="capitalize">{recipe.cooking_difficulty}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Your Recent Meals - Visual History */}
        {recentMealPlans.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 rounded-lg p-2">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Your Recent Meals</h2>
                  <p className="text-gray-600">Quick access to cooking instructions and reordering</p>
                </div>
              </div>
            </div>

            {isLoadingPlans ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                    <div className="aspect-video bg-gray-200"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentMealPlans.map((plan) => {
                  console.log('Plan data:', plan) // Debug log
                  return (
                  <div key={plan.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                    {/* Pinterest-Style Recipe Grid */}
                    <div className="aspect-video bg-gradient-to-br from-green-100 to-green-200 relative overflow-hidden">
                      {((plan.mealPlan?.recipes?.length ?? 0) > 0 || (plan.recipes?.length ?? 0) > 0) ? (
                        <div className="w-full h-full grid grid-cols-3 gap-0.5">
                          {(plan.mealPlan?.recipes || plan.recipes || []).slice(0, 3).map((recipe: any, index: number) => (
                            <div key={index} className="bg-gray-200 relative overflow-hidden">
                              {recipe.imageUrl ? (
                                <img
                                  src={recipe.imageUrl}
                                  alt={recipe.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                  <ChefHat className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                          ))}
                          {/* Fill remaining slots with placeholders if less than 3 recipes */}
                          {(plan.mealPlan?.recipes || plan.recipes || []).length < 3 && [...Array(3 - (plan.mealPlan?.recipes || plan.recipes || []).length)].map((_, index) => (
                            <div key={`placeholder-${index}`} className="bg-gray-200 flex items-center justify-center">
                              <ChefHat className="w-4 h-4 text-gray-400" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <ChefHat className="w-8 h-8 text-green-600 mx-auto mb-2" />
                            <p className="text-green-700 font-medium text-sm">
                              {plan.mealPlan?.recipes?.length || plan.recipes?.length || 0} Recipes
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Status Badge */}
                      <div className="absolute top-3 left-3">
                        {plan.cartUrl ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500 text-white">
                            ✓ Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-500 text-white">
                            ⏱ In Progress
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <div className="mb-3">
                        <h3 className="font-bold text-gray-900 text-lg mb-1">
                          Meal Plan
                        </h3>
                        <p className="text-gray-600 text-sm">
                          Created {formatDate(plan.createdAt)}
                        </p>
                      </div>

                      {/* Recipe Preview */}
                      {((plan.mealPlan?.recipes?.length ?? 0) > 0 || (plan.recipes?.length ?? 0) > 0) && (
                        <div className="mb-4">
                          <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Featured Recipes</div>
                          <div className="space-y-1">
                            {(plan.mealPlan?.recipes || plan.recipes || []).slice(0, 3).map((recipe: any, index: number) => (
                              <div key={index} className="text-sm text-gray-800 font-medium truncate">
                                • {recipe.title}
                              </div>
                            ))}
                            {(plan.mealPlan?.recipes || plan.recipes || []).length > 3 && (
                              <div className="text-xs text-gray-500">
                                +{(plan.mealPlan?.recipes || plan.recipes || []).length - 3} more recipes
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2">
                        {plan.cartUrl ? (
                          <div className="flex gap-2">
                            <a
                              href={plan.cartUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium transition-colors text-sm"
                            >
                              <ShoppingCart className="w-4 h-4" />
                              Open Cart
                            </a>
                            <button 
                              onClick={() => handleReorder(plan.id)}
                              className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium transition-colors text-sm"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Reorder
                            </button>
                          </div>
                        ) : (
                          <Link
                            href={`/cart-builder/${plan.id}`}
                            className="w-full inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium transition-colors text-sm"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Complete Cart
                          </Link>
                        )}
                        
                        <Link
                          href={`/meal-plan/${plan.id}`}
                          className="w-full inline-flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg font-medium transition-colors text-sm"
                        >
                          <BookOpen className="w-4 h-4" />
                          View Cooking Instructions
                        </Link>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty State for New Users */}
        {!isLoadingPlans && recentMealPlans.length === 0 && (
          <div className="text-center py-12">
            <div className="mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <ChefHat className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to start cooking?</h3>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto text-lg">
              Create your first AI-powered meal plan tailored to your tastes, dietary needs, and schedule. 
              Get personalized recipes with complete shopping lists delivered instantly!
            </p>
            <Link
              href="/quick-plan"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-semibold transition-colors text-lg"
            >
              <Plus className="w-5 h-5" />
              Create Your First Meal Plan
            </Link>
          </div>
        )}
      </div>
      
      <Footer />

      {/* Welcome Modal for New Users */}
      {showWelcomeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-auto">
            <div className="relative p-8 text-center">
              {/* Close Button */}
              <button
                onClick={() => setShowWelcomeModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Success Icon */}
              <div className="relative mx-auto mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <div className="absolute -top-1 -right-1 w-7 h-7 bg-green-600 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Welcome Message */}
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Welcome to ChefsCart! 🎉
              </h2>
              
              <p className="text-gray-600 mb-2">
                You're successfully signed in as
              </p>
              
              <p className="text-lg font-semibold text-green-600 mb-6">
                {user?.email}
              </p>

              {/* Success Checklist */}
              <div className="bg-green-50 rounded-lg p-4 mb-6 text-left">
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 rounded-lg p-1.5 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">You're all set!</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>✅ Account created and verified</li>
                      <li>✅ Secure magic link authentication</li>
                      <li>✅ Ready to start meal planning</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Link
                  href="/quick-plan"
                  className="w-full inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  onClick={() => setShowWelcomeModal(false)}
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Meal Plan
                </Link>
                
                <button
                  onClick={() => setShowWelcomeModal(false)}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Explore Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}