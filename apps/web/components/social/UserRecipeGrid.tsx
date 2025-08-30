"use client"

import React from 'react'
import { ChefHat } from 'lucide-react'
import { UserRecipe } from '../../types/index'
import UserRecipeCard from './UserRecipeCard'

interface UserRecipeGridProps {
  recipes: UserRecipe[]
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onLike?: (recipeId: string) => void
  onSave?: (recipeId: string) => void
  onComment?: (recipeId: string) => void
  onShare?: (recipeId: string) => void
  showAuthor?: boolean
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}

const UserRecipeGrid: React.FC<UserRecipeGridProps> = ({
  recipes,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onLike,
  onSave,
  onComment,
  onShare,
  showAuthor = false,
  emptyTitle = "No recipes yet",
  emptyDescription = "Start sharing your favorite recipes with the community!",
  className = ""
}) => {
  const handleRecipeAction = (action: (recipeId: string) => void, recipeId: string) => {
    return () => action(recipeId)
  }

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="bg-white rounded-xl shadow-soft border border-neutral-200 overflow-hidden">
      <div className="aspect-[4/3] bg-neutral-200 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-neutral-200 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-neutral-200 rounded animate-pulse w-1/2" />
        <div className="flex items-center gap-4">
          <div className="h-3 bg-neutral-200 rounded animate-pulse w-16" />
          <div className="h-3 bg-neutral-200 rounded animate-pulse w-16" />
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
          <div className="flex items-center gap-4">
            <div className="h-3 bg-neutral-200 rounded animate-pulse w-8" />
            <div className="h-3 bg-neutral-200 rounded animate-pulse w-8" />
            <div className="h-3 bg-neutral-200 rounded animate-pulse w-8" />
          </div>
          <div className="h-3 bg-neutral-200 rounded animate-pulse w-12" />
        </div>
      </div>
    </div>
  )

  // Empty state component
  const EmptyState = () => (
    <div className="col-span-full flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
        <ChefHat className="w-12 h-12 text-neutral-400" />
      </div>
      <h3 className="text-xl font-semibold text-neutral-900 mb-2">{emptyTitle}</h3>
      <p className="text-neutral-600 max-w-md">{emptyDescription}</p>
    </div>
  )

  return (
    <div className={`w-full ${className}`}>
      {/* Recipe Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.map((recipe) => (
          <UserRecipeCard
            key={recipe.id}
            recipe={recipe}
            onLike={onLike ? () => onLike(recipe.id) : () => {}}
            onSave={onSave ? () => onSave(recipe.id) : () => {}}
            onComment={onComment ? () => onComment(recipe.id) : () => {}}
            onShare={onShare ? () => onShare(recipe.id) : () => {}}
            showAuthor={showAuthor}
          />
        ))}

        {/* Loading skeletons */}
        {isLoading && (
          Array.from({ length: 6 }).map((_, index) => (
            <LoadingSkeleton key={`skeleton-${index}`} />
          ))
        )}

        {/* Empty state */}
        {!isLoading && recipes.length === 0 && <EmptyState />}
      </div>

      {/* Load More Button */}
      {hasMore && !isLoading && (
        <div className="flex justify-center mt-8">
          <button
            onClick={onLoadMore}
            className="px-6 py-3 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors shadow-sm"
          >
            Load More Recipes
          </button>
        </div>
      )}

      {/* Loading More Indicator */}
      {isLoading && recipes.length > 0 && (
        <div className="flex justify-center mt-8">
          <div className="flex items-center gap-2 text-neutral-600">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading more recipes...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserRecipeGrid