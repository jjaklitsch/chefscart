"use client"

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Heart, MessageCircle, ChefHat } from 'lucide-react'
import Header from '../../../../components/Header'
import Footer from '../../../../components/Footer'
import UserProfileCard from '../../../../components/social/UserProfileCard'
import UserRecipeGrid from '../../../../components/social/UserRecipeGrid'
import { SocialUserProfile, UserRecipe } from '../../../../types'
import { createAuthClient } from '../../../../lib/supabase'

export default function ProfilePage() {
  const params = useParams()
  const username = params.username as string
  
  const [profile, setProfile] = useState<SocialUserProfile | null>(null)
  const [recipes, setRecipes] = useState<UserRecipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [recipesLoading, setRecipesLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [activeTab, setActiveTab] = useState<'recipes' | 'collections' | 'about'>('recipes')

  // Fetch user profile
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch(`/api/social/profile/${username}`)
        const data = await response.json()
        
        if (data.success) {
          setProfile(data.profile)
          setIsFollowing(data.isFollowing)
          setIsOwnProfile(data.isOwnProfile)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [username])

  // Fetch user's recipes
  useEffect(() => {
    async function fetchRecipes() {
      if (!profile) return
      
      setRecipesLoading(true)
      try {
        const response = await fetch(`/api/social/recipes?author_id=${profile.id}&limit=12&offset=${offset}`)
        const data = await response.json()
        
        if (data.success) {
          if (offset === 0) {
            setRecipes(data.recipes)
          } else {
            setRecipes(prev => [...prev, ...data.recipes])
          }
          setHasMore(data.has_more)
        }
      } catch (error) {
        console.error('Error fetching recipes:', error)
      } finally {
        setRecipesLoading(false)
      }
    }

    fetchRecipes()
  }, [profile, offset])

  // Handle follow/unfollow
  const handleFollow = async () => {
    if (!profile) return
    
    try {
      const response = await fetch(`/api/social/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_id: profile.id })
      })
      
      const data = await response.json()
      if (data.success) {
        setIsFollowing(true)
        setProfile(prev => prev ? {
          ...prev,
          follower_count: prev.follower_count + 1
        } : null)
      }
    } catch (error) {
      console.error('Error following user:', error)
    }
  }

  const handleUnfollow = async () => {
    if (!profile) return
    
    try {
      const response = await fetch(`/api/social/follow`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_id: profile.id })
      })
      
      const data = await response.json()
      if (data.success) {
        setIsFollowing(false)
        setProfile(prev => prev ? {
          ...prev,
          follower_count: Math.max(0, prev.follower_count - 1)
        } : null)
      }
    } catch (error) {
      console.error('Error unfollowing user:', error)
    }
  }

  // Handle recipe interactions
  const handleLike = async (recipeId: string) => {
    try {
      const response = await fetch(`/api/social/recipes/${recipeId}/like`, {
        method: 'POST'
      })
      
      if (response.ok) {
        // Update local state
        setRecipes(prev => prev.map(recipe => 
          recipe.id === recipeId 
            ? { ...recipe, is_liked: true, like_count: recipe.like_count + 1 }
            : recipe
        ))
      }
    } catch (error) {
      console.error('Error liking recipe:', error)
    }
  }

  const handleSave = async (recipeId: string) => {
    try {
      const response = await fetch(`/api/social/recipes/${recipeId}/save`, {
        method: 'POST'
      })
      
      if (response.ok) {
        // Update local state
        setRecipes(prev => prev.map(recipe => 
          recipe.id === recipeId 
            ? { ...recipe, is_saved: true, save_count: recipe.save_count + 1 }
            : recipe
        ))
      }
    } catch (error) {
      console.error('Error saving recipe:', error)
    }
  }

  const handleLoadMore = () => {
    setOffset(prev => prev + 12)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Profile Not Found</h1>
          <p className="text-neutral-600">The user @{username} doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <UserProfileCard
          profile={profile}
          isCurrentUser={isOwnProfile}
          isFollowing={isFollowing}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
          className="mb-8"
        />

        {/* Tabs Navigation */}
        <div className="bg-white rounded-xl shadow-soft border border-neutral-200 mb-8">
          <div className="flex border-b border-neutral-200">
            <button 
              onClick={() => setActiveTab('recipes')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === 'recipes' 
                  ? 'text-brand-600 border-b-2 border-brand-500' 
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Recipes ({profile.recipe_count})
            </button>
            <button 
              onClick={() => setActiveTab('collections')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === 'collections' 
                  ? 'text-brand-600 border-b-2 border-brand-500' 
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Collections
            </button>
            <button 
              onClick={() => setActiveTab('about')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === 'about' 
                  ? 'text-brand-600 border-b-2 border-brand-500' 
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              About
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'recipes' && (
          <>
            {/* Recipe Grid - Instagram Style with Enhanced Visuals */}
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              {recipes.map((recipe) => (
                <div 
                  key={recipe.id} 
                  className="aspect-square bg-gray-100 relative overflow-hidden group"
                >
                  {/* Clickable Image Area */}
                  <div 
                    className="w-full h-full cursor-pointer"
                    onClick={() => window.location.href = `/profile/${username}/recipes/${recipe.slug}`}
                  >
                    {recipe.image_urls?.[0] ? (
                      <img
                        src={recipe.image_urls[0]}
                        alt={recipe.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <ChefHat className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Hover Overlay with Stats */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="flex items-center justify-center gap-4 text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleLike(recipe.id)
                          }}
                          className="flex items-center gap-1 hover:text-red-400 transition-colors"
                        >
                          <Heart className={`w-4 h-4 ${recipe.is_liked ? 'fill-red-400 text-red-400' : ''}`} />
                          <span>{recipe.like_count || 0}</span>
                        </button>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>{recipe.comment_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Multi-photo indicator */}
                  {recipe.image_urls && recipe.image_urls.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black/70 rounded-full p-1">
                      <div className="w-1 h-1 bg-white rounded-full mx-1"></div>
                      <div className="w-1 h-1 bg-white rounded-full mx-1 opacity-60"></div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Loading skeletons */}
              {(recipesLoading && offset === 0) && (
                Array.from({ length: 9 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="aspect-square bg-gray-200 animate-pulse"></div>
                ))
              )}
            </div>

            {/* Load More Button */}
            {hasMore && !recipesLoading && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Load More
                </button>
              </div>
            )}

            {/* Empty State */}
            {!recipesLoading && recipes.length === 0 && (
              <div className="text-center py-12">
                <ChefHat className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {isOwnProfile ? "Share Your First Recipe!" : "No Recipes Yet"}
                </h3>
                <p className="text-gray-600">
                  {isOwnProfile 
                    ? "Start building your cookbook by sharing your favorite recipes."
                    : `${profile.display_name} hasn't shared any recipes yet.`
                  }
                </p>
                {isOwnProfile && (
                  <button
                    onClick={() => window.location.href = '/recipes/new'}
                    className="mt-6 px-6 py-3 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors"
                  >
                    Share Your First Recipe
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'collections' && (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v14c2 0 2-2 2-2h14a2 2 0 002-2V5a2 2 0 00-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isOwnProfile ? "Create Your First Collection" : "No Collections Yet"}
            </h3>
            <p className="text-gray-600">
              {isOwnProfile 
                ? "Organize your recipes into themed collections to share with others."
                : `${profile.display_name} hasn't created any collections yet.`
              }
            </p>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="bg-white rounded-xl shadow-soft border border-neutral-200 p-6">
            <div className="space-y-6">
              {/* Bio Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">About {profile.display_name}</h3>
                <p className="text-gray-600">
                  {profile.bio || (isOwnProfile ? "Add a bio to tell others about your cooking journey!" : "This chef hasn't shared their story yet.")}
                </p>
              </div>

              {/* Stats - Hidden until launch */}
              {false && (
                <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{profile?.recipe_count}</div>
                    <div className="text-sm text-gray-600">Recipes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{profile?.follower_count}</div>
                    <div className="text-sm text-gray-600">Followers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{profile?.following_count}</div>
                    <div className="text-sm text-gray-600">Following</div>
                  </div>
                </div>
              )}

              {/* Preferences Section for Own Profile */}
              {isOwnProfile && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">My Preferences</h3>
                    <button
                      onClick={() => window.location.href = '/preferences'}
                      className="text-brand-600 hover:text-brand-700 font-medium transition-colors"
                    >
                      Edit Preferences
                    </button>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Your dietary preferences and cooking style help us recommend the perfect recipes for you.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Add Recipe Button - Only show on recipes tab for own profile */}
        {isOwnProfile && activeTab === 'recipes' && recipes.length > 0 && (
          <button
            onClick={() => window.location.href = '/recipes/new'}
            className="fixed bottom-8 right-8 w-14 h-14 bg-brand-500 text-white rounded-full shadow-lg hover:bg-brand-600 transition-colors flex items-center justify-center z-40"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>
      
      <Footer />
    </div>
  )
}