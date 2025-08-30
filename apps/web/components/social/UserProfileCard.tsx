"use client"

import React from 'react'
import { Users, MapPin, Globe, Calendar, ChefHat, Heart, BookOpen, Check } from 'lucide-react'
import { SocialUserProfile } from '../../types/index'

interface UserProfileCardProps {
  profile: SocialUserProfile
  isCurrentUser?: boolean
  isFollowing?: boolean
  onFollow?: () => void
  onUnfollow?: () => void
  isLoading?: boolean
  className?: string
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
  profile,
  isCurrentUser = false,
  isFollowing = false,
  onFollow,
  onUnfollow,
  isLoading = false,
  className = ""
}) => {
  const handleFollowClick = () => {
    if (isFollowing) {
      onUnfollow?.()
    } else {
      onFollow?.()
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className={`bg-white rounded-xl shadow-soft border border-neutral-200 overflow-hidden ${className}`}>
      {/* Cover Image */}
      <div className="relative h-32 bg-gradient-to-r from-brand-400 to-brand-600">
        {profile.cover_image_url ? (
          <img
            src={profile.cover_image_url}
            alt="Profile cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-brand-400 to-brand-600" />
        )}
        
        {/* Avatar */}
        <div className="absolute -bottom-8 left-6">
          <div className="relative">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-16 h-16 rounded-full border-4 border-white object-cover bg-white"
              />
            ) : (
              <div className="w-16 h-16 rounded-full border-4 border-white bg-neutral-200 flex items-center justify-center">
                <ChefHat className="w-8 h-8 text-neutral-600" />
              </div>
            )}
            {profile.is_verified && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="pt-12 p-6">
        {/* Header with Follow Button */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold text-neutral-900">{profile.display_name}</h2>
            </div>
            <p className="text-brand-600 font-medium">@{profile.username}</p>
          </div>

          {/* Follow Button */}
          {!isCurrentUser && (
            <button
              onClick={handleFollowClick}
              disabled={isLoading}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50
                ${isFollowing
                  ? 'bg-neutral-100 text-neutral-700 border border-neutral-300 hover:bg-neutral-200'
                  : 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm'
                }
              `}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : isFollowing ? (
                'Following'
              ) : (
                'Follow'
              )}
            </button>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-neutral-700 mb-4 leading-relaxed">{profile.bio}</p>
        )}

        {/* Location and Website */}
        <div className="flex flex-wrap gap-4 mb-4 text-sm text-neutral-600">
          {profile.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{profile.location}</span>
            </div>
          )}
          {profile.website_url && (
            <div className="flex items-center gap-1">
              <Globe className="w-4 h-4" />
              <a 
                href={profile.website_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-brand-600 hover:text-brand-700 hover:underline"
              >
                Website
              </a>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>Joined {formatDate(profile.created_at)}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-1">
            <ChefHat className="w-4 h-4 text-brand-500" />
            <span className="font-semibold text-neutral-900">{profile.recipe_count}</span>
            <span className="text-neutral-600">recipes</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="font-semibold text-neutral-900">{profile.total_likes_received}</span>
            <span className="text-neutral-600">likes</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-brand-500" />
            <span className="font-semibold text-neutral-900">{profile.follower_count}</span>
            <span className="text-neutral-600">followers</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="w-4 h-4 text-brand-500" />
            <span className="font-semibold text-neutral-900">{profile.following_count}</span>
            <span className="text-neutral-600">following</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfileCard