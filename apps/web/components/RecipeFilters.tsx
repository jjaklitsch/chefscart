"use client"

import React from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

// Helper function to convert text to title case
const toTitleCase = (str: string): string => {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  )
}

interface Recipe {
  cuisines: string[]
  diets_supported: string[]
  courses: string[]
  allergens_present: string[]
  cooking_difficulty: string
}

interface FilterState {
  search: string
  mealType: string[]
  cuisine: string[]
  diet: string[]
  difficulty: string[]
  cookTime: string
  allergens: string[]
}

interface RecipeFiltersProps {
  filters: FilterState
  onUpdateFilter: (key: keyof FilterState, value: any) => void
  onClearFilters: () => void
  recipes: Recipe[]
}

const RecipeFilters: React.FC<RecipeFiltersProps> = ({
  filters,
  onUpdateFilter,
  onClearFilters,
  recipes
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    mealType: true,
    cuisine: true,
    diet: false,
    difficulty: false,
    cookTime: false,
    allergens: false
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Extract unique options from recipes
  const getUniqueOptions = () => {
    const cuisines = new Set<string>()
    const diets = new Set<string>()
    const courses = new Set<string>()
    const allergens = new Set<string>()

    recipes.forEach(recipe => {
      recipe.cuisines?.forEach(cuisine => cuisines.add(cuisine))
      recipe.diets_supported?.forEach(diet => diets.add(diet))
      recipe.courses?.forEach(course => courses.add(course))
      recipe.allergens_present?.forEach(allergen => allergens.add(allergen))
    })

    return {
      cuisines: Array.from(cuisines).sort(),
      diets: Array.from(diets).sort(),
      courses: Array.from(courses).sort(),
      allergens: Array.from(allergens).sort()
    }
  }

  const { cuisines, diets, courses, allergens } = getUniqueOptions()

  const handleArrayFilter = (key: keyof FilterState, value: string) => {
    const currentArray = filters[key] as string[]
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value]
    onUpdateFilter(key, newArray)
  }

  const FilterSection = ({ 
    title, 
    sectionKey, 
    children 
  }: { 
    title: string
    sectionKey: string
    children: React.ReactNode 
  }) => (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="w-full px-4 py-3 flex items-center justify-between text-left font-medium text-neutral-800 hover:bg-neutral-50 transition-colors"
      >
        <span>{title}</span>
        {expandedSections[sectionKey] ? 
          <ChevronUp className="w-4 h-4" /> : 
          <ChevronDown className="w-4 h-4" />
        }
      </button>
      {expandedSections[sectionKey] && (
        <div className="px-4 pb-4 border-t border-neutral-100">
          {children}
        </div>
      )}
    </div>
  )

  const CheckboxOption = ({ 
    value, 
    label, 
    checked, 
    onChange 
  }: { 
    value: string
    label: string
    checked: boolean
    onChange: () => void 
  }) => (
    <label className="flex items-center gap-3 py-2 cursor-pointer hover:bg-neutral-50 -mx-2 px-2 rounded-lg transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 text-brand-600 border-neutral-300 rounded focus:ring-brand-500 focus:ring-2"
      />
      <span className="text-sm text-neutral-700">{label}</span>
    </label>
  )

  const getActiveFilterCount = () => {
    let count = 0
    count += filters.mealType.length
    count += filters.cuisine.length
    count += filters.diet.length
    count += filters.difficulty.length
    if (filters.cookTime) count++
    count += filters.allergens.length
    return count
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display font-bold text-neutral-800">Filters</h3>
        {getActiveFilterCount() > 0 && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Meal Type */}
      <FilterSection title="Meal Type" sectionKey="mealType">
        <div className="space-y-1 mt-3">
          {['Breakfast', 'Lunch', 'Dinner'].map(type => (
            <CheckboxOption
              key={type}
              value={type}
              label={type}
              checked={filters.mealType.includes(type)}
              onChange={() => handleArrayFilter('mealType', type)}
            />
          ))}
        </div>
      </FilterSection>

      {/* Cuisine */}
      <FilterSection title="Cuisine" sectionKey="cuisine">
        <div className="space-y-1 mt-3 max-h-48 overflow-y-auto">
          {cuisines.slice(0, 12).map(cuisine => (
            <CheckboxOption
              key={cuisine}
              value={cuisine}
              label={toTitleCase(cuisine)}
              checked={filters.cuisine.includes(cuisine)}
              onChange={() => handleArrayFilter('cuisine', cuisine)}
            />
          ))}
        </div>
      </FilterSection>

      {/* Diet */}
      <FilterSection title="Dietary Preferences" sectionKey="diet">
        <div className="space-y-1 mt-3">
          {diets.slice(0, 8).map(diet => (
            <CheckboxOption
              key={diet}
              value={diet}
              label={toTitleCase(diet)}
              checked={filters.diet.includes(diet)}
              onChange={() => handleArrayFilter('diet', diet)}
            />
          ))}
        </div>
      </FilterSection>

      {/* Difficulty */}
      <FilterSection title="Difficulty" sectionKey="difficulty">
        <div className="space-y-1 mt-3">
          {['easy', 'medium', 'challenging'].map(difficulty => (
            <CheckboxOption
              key={difficulty}
              value={difficulty}
              label={difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              checked={filters.difficulty.includes(difficulty)}
              onChange={() => handleArrayFilter('difficulty', difficulty)}
            />
          ))}
        </div>
      </FilterSection>

      {/* Cook Time */}
      <FilterSection title="Cook Time" sectionKey="cookTime">
        <div className="space-y-1 mt-3">
          {[
            { value: 'quick', label: 'Quick (≤30 min)' },
            { value: 'medium', label: 'Medium (30-60 min)' },
            { value: 'long', label: 'Long (>60 min)' }
          ].map(option => (
            <label key={option.value} className="flex items-center gap-3 py-2 cursor-pointer hover:bg-neutral-50 -mx-2 px-2 rounded-lg transition-colors">
              <input
                type="radio"
                name="cookTime"
                value={option.value}
                checked={filters.cookTime === option.value}
                onChange={() => onUpdateFilter('cookTime', option.value)}
                className="w-4 h-4 text-brand-600 border-neutral-300 focus:ring-brand-500 focus:ring-2"
              />
              <span className="text-sm text-neutral-700">{option.label}</span>
            </label>
          ))}
          {filters.cookTime && (
            <button
              onClick={() => onUpdateFilter('cookTime', '')}
              className="text-xs text-brand-600 hover:text-brand-700 ml-7 transition-colors"
            >
              Clear selection
            </button>
          )}
        </div>
      </FilterSection>

      {/* Foods to Avoid */}
      <FilterSection title="Foods to Avoid" sectionKey="allergens">
        <div className="space-y-1 mt-3">
          <p className="text-xs text-neutral-500 mb-2">Show only recipes that avoid these ingredients:</p>
          {[
            'Dairy', 'Egg', 'Gluten', 'Grain', 'Peanut', 'Seafood', 
            'Sesame', 'Shellfish', 'Soy', 'Sulfite', 'Tree Nut', 'Wheat'
          ].map(allergen => {
            // Check if this allergen exists in our database allergens
            const matchingAllergen = allergens.find(a => 
              a.toLowerCase().includes(allergen.toLowerCase()) || 
              allergen.toLowerCase().includes(a.toLowerCase())
            ) || allergen.toLowerCase()
            
            return (
              <CheckboxOption
                key={allergen}
                value={matchingAllergen}
                label={`${allergen}-free`}
                checked={filters.allergens.includes(matchingAllergen)}
                onChange={() => handleArrayFilter('allergens', matchingAllergen)}
              />
            )
          })}
        </div>
      </FilterSection>
    </div>
  )
}

export default RecipeFilters