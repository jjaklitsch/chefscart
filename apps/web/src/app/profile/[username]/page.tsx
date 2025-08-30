"use client"

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
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
            <button className="flex-1 py-4 text-center font-medium text-brand-600 border-b-2 border-brand-500">
              Recipes ({profile.recipe_count})
            </button>
            <button className="flex-1 py-4 text-center font-medium text-neutral-600 hover:text-neutral-900">
              Collections
            </button>
            <button className="flex-1 py-4 text-center font-medium text-neutral-600 hover:text-neutral-900">
              About
            </button>
          </div>
        </div>

        {/* Recipe Grid */}
        <UserRecipeGrid
          recipes={recipes}
          isLoading={recipesLoading && offset === 0}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          onLike={handleLike}
          onSave={handleSave}
          onComment={(recipeId) => {
            // Navigate to recipe page
            window.location.href = `/profile/${username}/recipes/${recipes.find(r => r.id === recipeId)?.slug}`
          }}
          onShare={(recipeId) => {
            // Share functionality
            const recipe = recipes.find(r => r.id === recipeId)
            if (recipe) {
              navigator.share({
                title: recipe.title,
                text: recipe.description,
                url: `/profile/${username}/recipes/${recipe.slug}`
              }).catch(() => {
                // Fallback: copy to clipboard
                navigator.clipboard.writeText(`${window.location.origin}/profile/${username}/recipes/${recipe.slug}`)
                alert('Recipe link copied to clipboard!')
              })
            }
          }}
          emptyTitle={isOwnProfile ? "Share Your First Recipe!" : "No Recipes Yet"}
          emptyDescription={isOwnProfile 
            ? "Start building your cookbook by sharing your favorite recipes."
            : `${profile.display_name} hasn't shared any recipes yet.`
          }
        />

        {/* Add Recipe Button (for own profile) */}
        {isOwnProfile && (
          <button
            onClick={() => window.location.href = '/recipes/new'}
            className="fixed bottom-8 right-8 w-14 h-14 bg-brand-500 text-white rounded-full shadow-lg hover:bg-brand-600 transition-colors flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}