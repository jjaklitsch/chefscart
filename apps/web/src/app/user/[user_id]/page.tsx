'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '../../../../contexts/AuthContext'
import { ArrowLeft, Settings, Edit3 } from 'lucide-react'
import Link from 'next/link'
import { createAuthClient } from '../../../../lib/supabase'
import { SocialUserProfile } from '../../../../types'
import UserProfileCard from '../../../../components/social/UserProfileCard'
import Header from '../../../../components/Header'

export default function UserProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const userId = params.user_id as string

  const [profile, setProfile] = useState<SocialUserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if this is the current user's own profile
  const isOwner = user && user.id === userId

  useEffect(() => {
    loadUserProfile()
  }, [userId])

  useEffect(() => {
    if (user && !isOwner) {
      checkFollowStatus()
    }
  }, [user, userId, isOwner])

  const loadUserProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const supabase = createAuthClient()
      
      // Load user profile from database
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          setError('User not found')
        } else {
          setError('Failed to load profile')
          console.error('Error loading profile:', profileError)
        }
        return
      }

      // Check if profile is public or if user is the owner
      if (!profileData.is_public && !isOwner) {
        setError('This profile is private')
        return
      }

      setProfile(profileData)
    } catch (error) {
      console.error('Error loading user profile:', error)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const checkFollowStatus = async () => {
    if (!user || isOwner) return

    try {
      const supabase = createAuthClient()
      
      const { data, error } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking follow status:', error)
        return
      }

      setIsFollowing(!!data)
    } catch (error) {
      console.error('Error checking follow status:', error)
    }
  }

  const handleFollow = async () => {
    if (!user || isOwner || followLoading) return

    setFollowLoading(true)
    try {
      const supabase = createAuthClient()

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId)

        if (!error) {
          setIsFollowing(false)
          // Update local follower count
          if (profile) {
            setProfile({ ...profile, follower_count: profile.follower_count - 1 })
          }
        }
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: userId
          })

        if (!error) {
          setIsFollowing(true)
          // Update local follower count
          if (profile) {
            setProfile({ ...profile, follower_count: profile.follower_count + 1 })
          }
        }
      }
    } catch (error) {
      console.error('Error updating follow status:', error)
    } finally {
      setFollowLoading(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-health-gradient">
        <Header />
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="loading-spinner mx-auto mb-4 w-12 h-12"></div>
            <h2 className="text-xl font-semibold text-gray-900">Loading profile...</h2>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-health-gradient">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-red-800 mb-2">{error}</h2>
              <p className="text-red-600 mb-6">
                {error === 'User not found' && 'The profile you\'re looking for doesn\'t exist.'}
                {error === 'This profile is private' && 'This user has set their profile to private.'}
                {error === 'Failed to load profile' && 'There was a problem loading this profile. Please try again.'}
                {!['User not found', 'This profile is private', 'Failed to load profile'].includes(error) && 'Something went wrong. Please try again.'}
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-health-gradient">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Navigation */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
        </div>

        {/* Profile Card */}
        <div className="mb-8">
          <UserProfileCard
            profile={profile}
            isCurrentUser={!!isOwner}
            isFollowing={isFollowing}
            onFollow={handleFollow}
            onUnfollow={handleFollow}
            isLoading={followLoading}
          />
        </div>

        {/* Owner Actions */}
        {isOwner && (
          <div className="bg-white rounded-xl shadow-soft border border-neutral-200 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Management</h3>
                <p className="text-gray-600 text-sm">Customize your public profile and settings</p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <Link
                  href={`/user/${userId}/edit`}
                  className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Profile
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Recipes Section */}
          <div className="bg-white rounded-xl shadow-soft border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {isOwner ? 'Your Recipes' : `${profile.display_name}'s Recipes`}
              </h3>
              {isOwner && (
                <Link
                  href="/recipes/new"
                  className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  New Recipe
                </Link>
              )}
            </div>
            
            {profile.recipe_count === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {isOwner 
                    ? 'You haven\'t shared any recipes yet. Start cooking and sharing!' 
                    : `${profile.display_name} hasn't shared any recipes yet.`
                  }
                </p>
                {isOwner && (
                  <Link
                    href="/recipes/new"
                    className="inline-block mt-4 bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Share Your First Recipe
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Recipe cards would go here - TODO: Implement recipe loading */}
                <div className="text-center py-8 col-span-full">
                  <p className="text-gray-500">Recipe loading not yet implemented</p>
                </div>
              </div>
            )}
          </div>

          {/* Collections Section (if any) */}
          <div className="bg-white rounded-xl shadow-soft border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {isOwner ? 'Your Collections' : `${profile.display_name}'s Collections`}
              </h3>
              {isOwner && (
                <Link
                  href="/collections/new"
                  className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  New Collection
                </Link>
              )}
            </div>
            
            <div className="text-center py-12">
              <p className="text-gray-500">
                {isOwner 
                  ? 'Create your first recipe collection to organize your favorites!' 
                  : `${profile.display_name} doesn't have any public collections yet.`
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}