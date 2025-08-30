'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface FavoriteHeartProps {
  mealId: string | number
  isFavorited?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onFavoriteChange?: (isFavorited: boolean) => void
}

export default function FavoriteHeart({
  mealId,
  isFavorited = false,
  size = 'md',
  className = '',
  onFavoriteChange
}: FavoriteHeartProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [favorited, setFavorited] = useState(isFavorited)

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault() // Prevent any parent click handlers
    e.stopPropagation()
    
    if (!user || isLoading) return

    setIsLoading(true)
    
    try {
      const endpoint = '/api/favorites'
      const method = favorited ? 'DELETE' : 'POST'
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meal_id: mealId })
      })

      if (response.ok) {
        const newFavoriteState = !favorited
        setFavorited(newFavoriteState)
        onFavoriteChange?.(newFavoriteState)
      } else {
        const errorData = await response.json()
        console.error('Error toggling favorite:', errorData.error)
        
        // Show user feedback for specific errors
        if (response.status === 409) {
          // Already favorited - sync state
          setFavorited(true)
          onFavoriteChange?.(true)
        }
      }
    } catch (error) {
      console.error('Network error toggling favorite:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return null // Don't show heart if user is not authenticated
  }

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={isLoading}
      className={`
        inline-flex items-center justify-center 
        rounded-full p-1.5 transition-all duration-200 
        ${favorited 
          ? 'text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100' 
          : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart 
        className={`
          ${sizeClasses[size]} 
          transition-all duration-200
          ${favorited ? 'fill-current' : ''}
          ${isLoading ? 'animate-pulse' : ''}
        `}
      />
    </button>
  )
}