"use client"

import React, { useState } from 'react'
import { Clock, Users, Heart, Bookmark, MessageCircle, Share2, ChefHat, Star } from 'lucide-react'
import { UserRecipe } from '../../types/index'
import Link from 'next/link'

interface UserRecipeCardProps {
  recipe: UserRecipe
  onLike?: () => void
  onSave?: () => void
  onComment?: () => void
  onShare?: () => void
  showAuthor?: boolean
  className?: string
}

const UserRecipeCard: React.FC<UserRecipeCardProps> = ({
  recipe,
  onLike,
  onSave,
  onComment,
  onShare,
  showAuthor = false,
  className = ""
}) => {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-sage-100 text-sage-800 border-sage-200'
      case 'medium':
        return 'bg-cream-100 text-cream-800 border-cream-200'
      case 'challenging':
        return 'bg-earth-100 text-earth-800 border-earth-200'
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200'
    }
  }

  const formatTime = (minutes: number | undefined) => {
    if (!minutes) return 'N/A'
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const mainImage = recipe.image_urls?.[0]

  return (
    <article className={`bg-white rounded-xl shadow-soft border border-neutral-200 overflow-hidden hover:shadow-medium transition-all duration-300 ${className}`}>
      {/* Recipe Image */}
      <div className="relative aspect-[4/3] bg-neutral-100">
        {mainImage && !imageError ? (
          <>
            <img
              src={mainImage}
              alt={recipe.title}
              className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true)
                setImageLoading(false)
              }}
            />
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200">
            <ChefHat className="w-12 h-12 text-neutral-400" />
          </div>
        )}

        {/* Difficulty Badge */}
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(recipe.difficulty)}`}>
            {recipe.difficulty}
          </span>
        </div>

        {/* Featured Badge */}
        {recipe.featured_at && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-brand-100 text-brand-800 border border-brand-200">
              <Star className="w-3 h-3 mr-1" />
              Featured
            </span>
          </div>
        )}
      </div>

      {/* Recipe Content */}
      <div className="p-4">
        {/* Author Info */}
        {showAuthor && recipe.author && (
          <div className="flex items-center gap-2 mb-3">
            {recipe.author.avatar_url ? (
              <img
                src={recipe.author.avatar_url}
                alt={recipe.author.display_name}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center">
                <ChefHat className="w-3 h-3 text-neutral-600" />
              </div>
            )}
            <Link 
              href={`/profile/${recipe.author.username}`}
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              @{recipe.author.username}
            </Link>
          </div>
        )}

        {/* Recipe Title */}
        <Link href={`/profile/${recipe.author?.username}/recipes/${recipe.slug}`}>
          <h3 className="font-semibold text-lg text-neutral-900 mb-2 line-clamp-2 hover:text-brand-600 transition-colors">
            {recipe.title}
          </h3>
        </Link>

        {/* Description */}
        <p className="text-neutral-600 text-sm mb-3 line-clamp-2">
          {recipe.description}
        </p>

        {/* Recipe Stats */}
        <div className="flex items-center gap-4 mb-3 text-xs text-neutral-500">
          {(recipe.prep_time || recipe.cook_time) && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>
                {recipe.prep_time && recipe.cook_time
                  ? `${recipe.prep_time}m prep + ${recipe.cook_time}m cook`
                  : recipe.total_time
                  ? formatTime(recipe.total_time)
                  : formatTime(recipe.prep_time || recipe.cook_time)
                }
              </span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{recipe.servings_default} servings</span>
          </div>
          {recipe.cuisines?.[0] && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-brand-400 rounded-full" />
              <span>{recipe.cuisines[0]}</span>
            </div>
          )}
        </div>

        {/* Social Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
          <div className="flex items-center gap-4">
            {/* Like */}
            <button
              onClick={onLike}
              className={`flex items-center gap-1 text-sm transition-colors ${
                recipe.is_liked
                  ? 'text-red-600 hover:text-red-700'
                  : 'text-neutral-500 hover:text-red-500'
              }`}
            >
              <Heart className={`w-4 h-4 ${recipe.is_liked ? 'fill-current' : ''}`} />
              <span>{recipe.like_count}</span>
            </button>

            {/* Save */}
            <button
              onClick={onSave}
              className={`flex items-center gap-1 text-sm transition-colors ${
                recipe.is_saved
                  ? 'text-brand-600 hover:text-brand-700'
                  : 'text-neutral-500 hover:text-brand-500'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${recipe.is_saved ? 'fill-current' : ''}`} />
              <span>{recipe.save_count}</span>
            </button>

            {/* Comments */}
            <button
              onClick={onComment}
              className="flex items-center gap-1 text-sm text-neutral-500 hover:text-brand-500 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{recipe.comment_count}</span>
            </button>
          </div>

          {/* Share */}
          <button
            onClick={onShare}
            className="flex items-center gap-1 text-sm text-neutral-500 hover:text-brand-500 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </article>
  )
}

export default UserRecipeCard