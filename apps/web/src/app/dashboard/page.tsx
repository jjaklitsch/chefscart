'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { ShoppingCart, Plus, User, Clock, ChefHat, ExternalLink, RotateCcw, Eye, Trash2, CheckCircle, X } from 'lucide-react'
import Link from 'next/link'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'

interface RecentMealPlan {
  id: string
  createdAt: string
  cartUrl?: string
  recipes: Array<{
    title: string
    mealType: string
    imageUrl?: string
  }>
}

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [recentMealPlans, setRecentMealPlans] = useState<RecentMealPlan[]>([])
  const [isLoadingPlans, setIsLoadingPlans] = useState(true)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
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
    }
  }, [user])

  const loadRecentMealPlans = async () => {
    try {
      // For now, load from localStorage (will migrate to Supabase)
      const storedPlans = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('chefscart_mealplan_')) {
          try {
            const planData = JSON.parse(localStorage.getItem(key) || '{}')
            if (planData.email === user?.email) {
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

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Sign out error:', error)
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
    <div className="min-h-screen bg-health-gradient">
      <Header />

      {/* Welcome Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.email?.split('@')[0]}!</h1>
              <p className="text-sm text-gray-600">Ready to plan your next delicious meals?</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            href="/quick-plan"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-green-600 rounded-lg p-3 transition-colors">
                <Plus className="w-6 h-6 text-white transition-colors" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Quick Meal Plan</h3>
                <p className="text-sm text-gray-600">Use your saved preferences</p>
              </div>
            </div>
          </Link>

          <Link
            href="/preferences"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-gray-100 rounded-lg p-3 group-hover:bg-purple-500 transition-colors">
                <User className="w-6 h-6 text-purple-500 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Profile Settings</h3>
                <p className="text-sm text-gray-600">Manage preferences</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Meal Plans */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Your Meal Plans
          </h2>

          {isLoadingPlans ? (
            <div className="text-center py-8">
              <div className="loading-spinner mx-auto mb-4 w-8 h-8"></div>
              <p className="text-gray-600">Loading your meal plans...</p>
            </div>
          ) : recentMealPlans.length > 0 ? (
            <div className="space-y-6">
              {recentMealPlans.map((plan) => (
                <div key={plan.id} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="bg-white px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          Meal Plan - {formatDate(plan.createdAt)}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {plan.recipes?.length || 0} delicious recipes ready to cook
                        </p>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="flex items-center gap-3">
                        {plan.cartUrl ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Cart Created
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            ⏱ In Progress
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recipe Grid */}
                  {plan.recipes && (
                    <div className="p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {plan.recipes.slice(0, 5).map((recipe: any, index: number) => (
                          <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden group hover:shadow-sm transition-shadow">
                            {recipe.image ? (
                              <div className="aspect-video bg-gray-100 relative">
                                <img 
                                  src={recipe.image} 
                                  alt={recipe.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="aspect-video bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                                <ShoppingCart className="w-8 h-8 text-green-600" />
                              </div>
                            )}
                            <div className="p-3">
                              <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                                {recipe.title}
                              </h4>
                              <p className="text-xs text-gray-600">
                                {recipe.prep_time}m prep • {recipe.cook_time}m cook
                              </p>
                            </div>
                          </div>
                        ))}
                        
                        {plan.recipes.length > 5 && (
                          <div className="bg-white rounded-lg border border-gray-200 flex items-center justify-center p-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-gray-400 mb-1">
                                +{plan.recipes.length - 5}
                              </div>
                              <div className="text-xs text-gray-600">
                                more recipes
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-3">
                          {plan.cartUrl ? (
                            <>
                              <a
                                href={plan.cartUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                              >
                                <ShoppingCart className="w-4 h-4" />
                                Open Cart
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              <button className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors">
                                <RotateCcw className="w-4 h-4" />
                                Reorder
                              </button>
                            </>
                          ) : (
                            <Link
                              href={`/cart-builder/${plan.id}`}
                              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                              <ShoppingCart className="w-4 h-4" />
                              Complete Cart
                            </Link>
                          )}
                          
                          <Link
                            href={`/meal-plan/${plan.id}`}
                            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            View Recipes
                          </Link>
                        </div>

                        {/* Delete button for in-progress plans */}
                        {!plan.cartUrl && (
                          <button
                            onClick={() => deleteMealPlan(plan.id)}
                            className="inline-flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg font-medium transition-colors"
                            title="Delete meal plan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="w-12 h-12 text-green-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to start cooking?</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Create your first AI-powered meal plan tailored to your tastes, dietary needs, and schedule. 
                Fresh recipes delivered with a complete shopping cart in minutes!
              </p>
              <Link
                href="/quick-plan"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Your First Meal Plan
              </Link>
            </div>
          )}
        </div>
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