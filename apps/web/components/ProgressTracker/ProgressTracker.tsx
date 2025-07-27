"use client"

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Check, AlertTriangle, Circle, CheckCircle2 } from 'lucide-react'
import { UserPreferences, MealType } from '../../types'

interface ProgressTrackerProps {
  preferences: Partial<UserPreferences>
  onEditItem: (itemKey: string) => void
  isCollapsed?: boolean
  onToggleCollapse: () => void
  isMobile?: boolean
}

interface ProgressItem {
  key: keyof UserPreferences
  label: string
  description: string
  status: 'pending' | 'warning' | 'completed'
  value?: string
}

export default function ProgressTracker({
  preferences,
  onEditItem,
  isCollapsed = false,
  onToggleCollapse,
  isMobile = false
}: ProgressTrackerProps) {
  const [isMobileView, setIsMobileView] = useState(isMobile)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768)
    }
    
    if (!isMobile) {
      checkMobile()
      window.addEventListener('resize', checkMobile)
      return () => window.removeEventListener('resize', checkMobile)
    }
    
    // Return a no-op cleanup function when isMobile is true
    return () => {}
  }, [isMobile])

  const getItemStatus = (key: keyof UserPreferences, value: any): 'pending' | 'warning' | 'completed' => {
    if (!value) return 'pending'
    
    switch (key) {
      case 'mealTypes':
        if (Array.isArray(value) && value.length > 0) {
          // Check if meal types are properly configured
          const hasValidConfig = value.every((meal: MealType) => 
            meal.days && meal.days.length > 0 && meal.adults && meal.adults > 0
          )
          return hasValidConfig ? 'completed' : 'warning'
        }
        return 'pending'
      
      case 'diets':
      case 'allergies':
      case 'preferredCuisines':
        return Array.isArray(value) ? 'completed' : 'pending'
      
      case 'organicPreference':
        return value && value !== 'no_preference' ? 'completed' : 'warning'
      
      case 'maxCookTime':
        return typeof value === 'number' && value > 0 ? 'completed' : 'pending'
      
      case 'cookingSkillLevel':
        return ['beginner', 'intermediate', 'advanced'].includes(value) ? 'completed' : 'pending'
      
      default:
        return value ? 'completed' : 'pending'
    }
  }

  const getValueDisplay = (key: keyof UserPreferences, value: any): string => {
    if (!value) return 'Not set'
    
    switch (key) {
      case 'mealTypes':
        if (Array.isArray(value) && value.length > 0) {
          return value.map((meal: MealType) => meal.type).join(', ')
        }
        return 'Not set'
      
      case 'diets':
        return Array.isArray(value) && value.length > 0 ? value.join(', ') : 'None'
      
      case 'allergies':
        return Array.isArray(value) && value.length > 0 ? value.join(', ') : 'None'
      
      case 'preferredCuisines':
        return Array.isArray(value) && value.length > 0 ? value.join(', ') : 'No preference'
      
      case 'organicPreference':
        const organicLabels = {
          'preferred': 'Preferred',
          'only_if_within_10_percent': 'Within 10% price',
          'no_preference': 'No preference'
        }
        return organicLabels[value as keyof typeof organicLabels] || 'Not set'
      
      case 'maxCookTime':
        return typeof value === 'number' ? `${value} minutes` : 'Not set'
      
      case 'cookingSkillLevel':
        const skillLabels = {
          'beginner': 'Beginner',
          'intermediate': 'Intermediate', 
          'advanced': 'Advanced'
        }
        return skillLabels[value as keyof typeof skillLabels] || 'Not set'
      
      default:
        return String(value)
    }
  }

  const progressItems: ProgressItem[] = [
    {
      key: 'mealTypes',
      label: 'Meal Types',
      description: 'What meals to plan',
      status: getItemStatus('mealTypes', preferences.mealTypes),
      value: getValueDisplay('mealTypes', preferences.mealTypes)
    },
    {
      key: 'diets',
      label: 'Dietary Restrictions',
      description: 'Special diets to follow',
      status: getItemStatus('diets', preferences.diets),
      value: getValueDisplay('diets', preferences.diets)
    },
    {
      key: 'allergies',
      label: 'Allergies',
      description: 'Foods to avoid',
      status: getItemStatus('allergies', preferences.allergies),
      value: getValueDisplay('allergies', preferences.allergies)
    },
    {
      key: 'organicPreference',
      label: 'Organic Preference',
      description: 'Organic ingredient preference',
      status: getItemStatus('organicPreference', preferences.organicPreference),
      value: getValueDisplay('organicPreference', preferences.organicPreference)
    },
    {
      key: 'maxCookTime',
      label: 'Cooking Time',
      description: 'Maximum time to cook',
      status: getItemStatus('maxCookTime', preferences.maxCookTime),
      value: getValueDisplay('maxCookTime', preferences.maxCookTime)
    },
    {
      key: 'cookingSkillLevel',
      label: 'Skill Level',
      description: 'Your cooking experience',
      status: getItemStatus('cookingSkillLevel', preferences.cookingSkillLevel),
      value: getValueDisplay('cookingSkillLevel', preferences.cookingSkillLevel)
    },
    {
      key: 'preferredCuisines',
      label: 'Cuisines',
      description: 'Favorite food styles',
      status: getItemStatus('preferredCuisines', preferences.preferredCuisines),
      value: getValueDisplay('preferredCuisines', preferences.preferredCuisines)
    }
  ]

  const completedItems = progressItems.filter(item => item.status === 'completed').length
  const completionPercentage = Math.round((completedItems / progressItems.length) * 100)

  const StatusIcon = ({ status }: { status: 'pending' | 'warning' | 'completed' }) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-brand-600" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning" />
      case 'pending':
        return <Circle className="w-5 h-5 text-gray-300" />
    }
  }

  const baseClasses = `
    bg-white border-l border-brand-200 shadow-lg transition-all duration-300 ease-in-out
    ${isMobileView 
      ? 'fixed bottom-0 left-0 right-0 z-40 border-t border-l-0 rounded-t-2xl' 
      : 'fixed top-0 right-0 h-full z-20'
    }
  `

  const widthClasses = isMobileView
    ? ''
    : isCollapsed 
      ? 'w-12' 
      : 'w-80'

  const heightClasses = isMobileView
    ? isCollapsed 
      ? 'h-12' 
      : 'h-96'
    : ''

  return (
    <aside 
      className={`${baseClasses} ${widthClasses} ${heightClasses}`}
      role="complementary"
      aria-label="Meal planning progress tracker"
    >
      {/* Header */}
      <div className={`
        p-4 border-b border-brand-100 flex items-center justify-between
        ${isMobileView ? 'cursor-pointer' : ''}
      `}
      onClick={isMobileView ? onToggleCollapse : undefined}
      >
        {!isCollapsed && (
          <>
            <div>
              <h3 className="font-semibold text-gray-900">Meal Planning Progress</h3>
              <p className="text-sm text-gray-600">{completionPercentage}% Complete</p>
            </div>
            {!isMobileView && (
              <button
                onClick={onToggleCollapse}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors hover:bg-gray-100 rounded"
                aria-label="Collapse progress tracker"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </>
        )}
        
        {isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors mx-auto hover:bg-gray-100 rounded"
            aria-label="Expand progress tracker"
          >
            {isMobileView ? (
              <div className="flex flex-col items-center">
                <div className="w-8 h-1 bg-gray-300 rounded-full mb-1" />
                <span className="text-xs">Progress</span>
              </div>
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {!isCollapsed && (
        <div className="px-4 py-2 border-b border-brand-100">
          <div className="bg-brand-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-brand-600 to-fresh-500 h-full transition-all duration-500 ease-out"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Progress Items */}
      {!isCollapsed && (
        <div className={`
          overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-brand-300 scrollbar-track-brand-50
          ${isMobileView ? 'max-h-64' : 'max-h-[calc(100vh-12rem)]'}
        `}>
          <div className="p-4 space-y-3">
            {progressItems.map((item) => (
              <button
                key={item.key}
                onClick={() => onEditItem(item.key)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
                data-testid={`progress-item-${item.key}`}
                data-status={item.status}
              >
                <div className="flex items-start gap-3">
                  <StatusIcon status={item.status} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 mb-1">
                      {item.label}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      {item.description}
                    </div>
                    <div className={`text-xs truncate ${
                      item.status === 'completed' 
                        ? 'text-brand-600 font-medium' 
                        : item.status === 'warning'
                          ? 'text-warning font-medium'
                          : 'text-gray-400'
                    }`}>
                      {item.value}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}