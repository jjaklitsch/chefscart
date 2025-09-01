'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Filter, ChefHat, Clock, Users, Star, Utensils, Globe, Leaf, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '../../../lib/supabase'
import RecipeCard from '../../../components/RecipeCard'
import RecipeFilters from '../../../components/RecipeFilters'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'

// Helper function to convert text to title case
const toTitleCase = (str: string): string => {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  )
}

interface Recipe {
  id: string
  title: string
  description: string
  prep_time?: number
  cook_time?: number
  time_total_min?: number
  cooking_difficulty: string
  cuisines: string[]
  diets_supported: string[]
  courses: string[]
  allergens_present: string[]
  image_url?: string
  slug?: string
  primary_ingredient?: string
  ingredients_json?: {
    ingredients: Array<{
      display_name?: string
      shoppable_name?: string
    }>
  }
}

interface CategoryData {
  cuisines: string[]
  diets: string[]
  courses: string[]
  difficulties: string[]
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

function RecipesPageContent() {
  const searchParams = useSearchParams()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([])
  const [featuredRecipes, setFeaturedRecipes] = useState<Recipe[]>([])
  const [categories, setCategories] = useState<CategoryData>({ cuisines: [], diets: [], courses: [], difficulties: [] })
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [showAllRecipes, setShowAllRecipes] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    mealType: [],
    cuisine: [],
    diet: [],
    difficulty: [],
    cookTime: '',
    allergens: []
  })

  // Initialize filters from URL parameters
  useEffect(() => {
    const ingredientParam = searchParams.get('ingredient')
    const courseParam = searchParams.get('course')
    const showAllParam = searchParams.get('all')
    
    if (showAllParam) {
      setShowAllRecipes(true)
    } else {
      setShowAllRecipes(false)
    }
    
    const initialFilters: FilterState = {
      search: searchParams.get('search') || ingredientParam || '',
      mealType: courseParam ? [courseParam] : (searchParams.get('mealType') ? [searchParams.get('mealType')!] : []),
      cuisine: searchParams.get('cuisine') ? [searchParams.get('cuisine')!] : [],
      diet: searchParams.get('diet') ? [searchParams.get('diet')!] : [],
      difficulty: searchParams.get('difficulty') ? [searchParams.get('difficulty')!] : [],
      cookTime: searchParams.get('cookTime') || '',
      allergens: []
    }
    setFilters(initialFilters)
  }, [searchParams])

  useEffect(() => {
    loadRecipes()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [recipes, filters, showAllRecipes])

  const loadRecipes = async () => {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('meals')
        .select('id, title, description, prep_time, cook_time, time_total_min, cooking_difficulty, cuisines, diets_supported, courses, allergens_present, image_url, ingredients_json, primary_ingredient')
        .order('title')

      if (error) {
        console.error('Error loading recipes:', error)
        throw error
      }

      if (!data || data.length === 0) {
        console.warn('No recipes found in database')
        setLoading(false)
        return
      }

      // Generate slugs and format data
      const formattedRecipes = (data || []).map((recipe: any) => ({
        ...recipe,
        slug: recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      }))

      setRecipes(formattedRecipes)
      
      // Set featured recipes (randomized 6 recipes with images)
      const recipesWithImages = formattedRecipes.filter(r => r.image_url)
      const shuffledRecipes = [...recipesWithImages].sort(() => Math.random() - 0.5)
      setFeaturedRecipes(shuffledRecipes.slice(0, 6))
      
      // Extract dynamic categories
      const allCuisines = new Set<string>()
      const allDiets = new Set<string>()
      const allCourses = new Set<string>()
      const allDifficulties = new Set<string>()
      
      formattedRecipes.forEach(recipe => {
        recipe.cuisines?.forEach((cuisine: string) => allCuisines.add(cuisine))
        recipe.diets_supported?.forEach((diet: string) => allDiets.add(diet))
        recipe.courses?.forEach((course: string) => allCourses.add(course))
        if (recipe.cooking_difficulty) allDifficulties.add(recipe.cooking_difficulty)
      })
      
      // Define custom sort orders
      const difficultyOrder = ['easy', 'medium', 'challenging']
      const courseOrder = ['breakfast', 'lunch', 'dinner']
      
      const sortedDifficulties = Array.from(allDifficulties).sort((a, b) => {
        const indexA = difficultyOrder.findIndex(d => a.toLowerCase().includes(d))
        const indexB = difficultyOrder.findIndex(d => b.toLowerCase().includes(d))
        if (indexA === -1) return 1
        if (indexB === -1) return -1
        return indexA - indexB
      })
      
      const sortedCourses = Array.from(allCourses).sort((a, b) => {
        const indexA = courseOrder.findIndex(c => a.toLowerCase().includes(c))
        const indexB = courseOrder.findIndex(c => b.toLowerCase().includes(c))
        if (indexA === -1) return 1
        if (indexB === -1) return -1
        return indexA - indexB
      })
      
      setCategories({
        cuisines: Array.from(allCuisines).sort(),
        diets: Array.from(allDiets).sort(),
        courses: sortedCourses,
        difficulties: sortedDifficulties
      })
    } catch (error) {
      console.error('Error loading recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...recipes]
    
    // If showing all recipes with no active filters, show all recipes
    if (showAllRecipes && getActiveFilterCount() === 0) {
      setFilteredRecipes(filtered)
      return
    }

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(recipe => {
        // Search in basic recipe fields
        const basicMatch = recipe.title.toLowerCase().includes(searchTerm) ||
          recipe.description.toLowerCase().includes(searchTerm) ||
          recipe.cuisines.some(cuisine => cuisine.toLowerCase().includes(searchTerm)) ||
          recipe.courses.some(course => course.toLowerCase().includes(searchTerm)) ||
          recipe.diets_supported.some(diet => diet.toLowerCase().includes(searchTerm))
        
        // Search in primary ingredient
        const primaryIngredientMatch = recipe.primary_ingredient?.toLowerCase().includes(searchTerm)
        
        // Search in ingredients list
        const ingredientsMatch = recipe.ingredients_json?.ingredients?.some(ingredient => 
          ingredient.display_name?.toLowerCase().includes(searchTerm) ||
          ingredient.shoppable_name?.toLowerCase().includes(searchTerm)
        )
        
        return basicMatch || primaryIngredientMatch || ingredientsMatch
      })
    }

    // Meal type filter
    if (filters.mealType.length > 0) {
      filtered = filtered.filter(recipe =>
        filters.mealType.some(type =>
          recipe.courses.some(course => course.toLowerCase().includes(type.toLowerCase()))
        )
      )
    }

    // Cuisine filter
    if (filters.cuisine.length > 0) {
      filtered = filtered.filter(recipe =>
        filters.cuisine.some(cuisine =>
          recipe.cuisines.some(recipeCuisine => recipeCuisine.toLowerCase().includes(cuisine.toLowerCase()))
        )
      )
    }

    // Diet filter
    if (filters.diet.length > 0) {
      filtered = filtered.filter(recipe =>
        filters.diet.some(diet =>
          recipe.diets_supported.some(recipeDiet => recipeDiet.toLowerCase().includes(diet.toLowerCase()))
        )
      )
    }

    // Difficulty filter
    if (filters.difficulty.length > 0) {
      filtered = filtered.filter(recipe =>
        filters.difficulty.includes(recipe.cooking_difficulty)
      )
    }

    // Cook time filter
    if (filters.cookTime) {
      const totalTime = (recipe: Recipe) => recipe.time_total_min || (recipe.prep_time || 0) + (recipe.cook_time || 0)
      
      switch (filters.cookTime) {
        case 'quick':
          filtered = filtered.filter(recipe => totalTime(recipe) <= 30)
          break
        case 'medium':
          filtered = filtered.filter(recipe => totalTime(recipe) > 30 && totalTime(recipe) <= 60)
          break
        case 'long':
          filtered = filtered.filter(recipe => totalTime(recipe) > 60)
          break
      }
    }

    // Allergen filter (exclude recipes with selected allergens)
    if (filters.allergens.length > 0) {
      filtered = filtered.filter(recipe =>
        !filters.allergens.some(allergen =>
          recipe.allergens_present.some(recipeAllergen => 
            recipeAllergen.toLowerCase().includes(allergen.toLowerCase())
          )
        )
      )
    }

    setFilteredRecipes(filtered)
  }

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      mealType: [],
      cuisine: [],
      diet: [],
      difficulty: [],
      cookTime: '',
      allergens: []
    })
    setShowAllRecipes(false)
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.search) count++
    count += filters.mealType.length
    count += filters.cuisine.length
    count += filters.diet.length
    count += filters.difficulty.length
    if (filters.cookTime) count++
    count += filters.allergens.length
    return count
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-neutral-800">Loading recipes...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-700 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <ChefHat className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">{recipes.length}+ Curated Recipes</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-6">
              Discover Your Next Favorite Meal
            </h1>
            <p className="text-xl md:text-2xl text-brand-100 mb-8 leading-relaxed">
              From quick weeknight dinners to weekend culinary adventures, find recipes that match your taste and lifestyle.
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-600 w-5 h-5 z-10" />
                <input
                  type="text"
                  placeholder="Search recipes, cuisines, or ingredients..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="w-full pl-12 pr-4 py-4 text-lg rounded-2xl border-0 focus:outline-none focus:ring-4 focus:ring-white/25 bg-white/95 backdrop-blur-sm text-neutral-800 placeholder-neutral-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Show different content based on search/filter state */}
        {getActiveFilterCount() > 0 || showAllRecipes ? (
          // Filtered Results View
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Mobile Filter Toggle */}
            <div className="lg:hidden">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-full flex items-center justify-center gap-2 bg-white border border-neutral-200 rounded-xl px-4 py-3 font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                Filters
                <span className="bg-brand-600 text-white text-xs rounded-full px-2 py-1 min-w-[1.25rem] h-5 flex items-center justify-center">
                  {getActiveFilterCount()}
                </span>
              </button>
            </div>

            {/* Filters Sidebar */}
            <div className={`lg:block ${showFilters ? 'block' : 'hidden'} lg:w-80 flex-shrink-0`}>
              <RecipeFilters
                filters={filters}
                onUpdateFilter={updateFilter}
                onClearFilters={clearFilters}
                recipes={recipes}
              />
            </div>

            {/* Results */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-display font-bold text-neutral-800">
                    {showAllRecipes && getActiveFilterCount() === 0 
                      ? `All ${recipes.length} recipes` 
                      : `${filteredRecipes.length} recipe${filteredRecipes.length !== 1 ? 's' : ''} found`
                    }
                  </h2>
                  {getActiveFilterCount() > 0 && (
                    <p className="text-neutral-600 mt-1">
                      {getActiveFilterCount()} filter{getActiveFilterCount() > 1 ? 's' : ''} applied
                    </p>
                  )}
                </div>
                
                {(getActiveFilterCount() > 0 || showAllRecipes) && (
                  <button
                    onClick={() => {
                      clearFilters()
                      setShowAllRecipes(false)
                      window.history.pushState({}, '', '/recipes')
                    }}
                    className="text-brand-600 hover:text-brand-700 font-medium transition-colors"
                  >
                    {showAllRecipes && getActiveFilterCount() === 0 ? 'Back to featured' : 'Clear all filters'}
                  </button>
                )}
              </div>

              {/* Recipe Grid */}
              {filteredRecipes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredRecipes.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      href={`/recipes/${recipe.slug}`}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-neutral-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-neutral-800 mb-2">No recipes found</h3>
                  <p className="text-neutral-600 mb-6 max-w-md mx-auto">
                    Try adjusting your filters or search terms to discover more delicious recipes.
                  </p>
                  <button
                    onClick={clearFilters}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Blog-style Home View
          <>
            {/* Featured Recipes Section */}
            <section className="mb-16">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-display font-bold text-neutral-800">
                  Featured Recipes
                </h2>
                <Link
                  href="/recipes?all=true"
                  className="text-brand-600 hover:text-brand-700 font-medium transition-colors"
                >
                  View All →
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    href={`/recipes/${recipe.slug}`}
                  />
                ))}
              </div>
            </section>

            {/* Browse by Categories */}
            <section className="mb-16">
              <h2 className="text-3xl font-display font-bold text-neutral-800 mb-8 text-center">
                Browse by Category
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Cuisines */}
                <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-lg p-3 mr-3">
                      <Globe className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-display font-semibold text-neutral-800">Cuisines</h3>
                  </div>
                  <div className="space-y-2">
                    {categories.cuisines.slice(0, 4).map(cuisine => (
                      <Link
                        key={cuisine}
                        href={`/recipes/cuisine/${cuisine.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                        className="block text-neutral-600 hover:text-brand-600 transition-colors"
                      >
                        {toTitleCase(cuisine)}
                      </Link>
                    ))}
                    {categories.cuisines.length > 4 && (
                      <Link
                        href="/recipes/cuisines"
                        className="block text-brand-600 font-medium hover:text-brand-700 transition-colors"
                      >
                        +{categories.cuisines.length - 4} more →
                      </Link>
                    )}
                  </div>
                </div>

                {/* Meal Types */}
                <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-3 mr-3">
                      <Utensils className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-display font-semibold text-neutral-800">Meal Types</h3>
                  </div>
                  <div className="space-y-2">
                    {categories.courses.slice(0, 4).map(course => (
                      <Link
                        key={course}
                        href={`/recipes/course/${course.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                        className="block text-neutral-600 hover:text-brand-600 transition-colors"
                      >
                        {toTitleCase(course)}
                      </Link>
                    ))}
                    {categories.courses.length > 4 && (
                      <Link
                        href="/recipes/courses"
                        className="block text-brand-600 font-medium hover:text-brand-700 transition-colors"
                      >
                        +{categories.courses.length - 4} more →
                      </Link>
                    )}
                  </div>
                </div>

                {/* Diets */}
                <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg p-3 mr-3">
                      <Leaf className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-display font-semibold text-neutral-800">Diets</h3>
                  </div>
                  <div className="space-y-2">
                    {categories.diets.slice(0, 4).map(diet => (
                      <Link
                        key={diet}
                        href={`/recipes/diet/${diet.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                        className="block text-neutral-600 hover:text-brand-600 transition-colors"
                      >
                        {toTitleCase(diet)}
                      </Link>
                    ))}
                    {categories.diets.length > 4 && (
                      <Link
                        href="/recipes/diets"
                        className="block text-brand-600 font-medium hover:text-brand-700 transition-colors"
                      >
                        +{categories.diets.length - 4} more →
                      </Link>
                    )}
                  </div>
                </div>

                {/* Difficulty */}
                <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg p-3 mr-3">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-display font-semibold text-neutral-800">Difficulty</h3>
                  </div>
                  <div className="space-y-2">
                    {categories.difficulties.map(difficulty => (
                      <Link
                        key={difficulty}
                        href={`/recipes/difficulty/${difficulty.toLowerCase()}`}
                        className="block text-neutral-600 hover:text-brand-600 transition-colors capitalize"
                      >
                        {difficulty}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Search Tags */}
            <section className="mb-16">
              <h2 className="text-3xl font-display font-bold text-neutral-800 mb-8 text-center">
                Popular Searches
              </h2>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { label: 'Quick & Easy', filter: { difficulty: ['easy'] } },
                  { label: 'Vegetarian', filter: { diet: ['vegetarian'] } },
                  { label: 'Breakfast', filter: { mealType: ['breakfast'] } },
                  { label: 'Italian', filter: { cuisine: ['italian'] } },
                  { label: 'Under 30 Min', filter: { cookTime: 'quick' } },
                  { label: 'Asian', filter: { cuisine: ['asian'] } },
                  { label: 'Healthy', filter: { diet: ['healthy'] } },
                  { label: 'Dinner', filter: { mealType: ['dinner'] } },
                ].map((tag, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      Object.entries(tag.filter).forEach(([key, value]) => {
                        updateFilter(key as keyof FilterState, value)
                      })
                    }}
                    className="bg-white hover:bg-brand-50 border border-neutral-200 hover:border-brand-300 rounded-full px-6 py-3 text-neutral-700 hover:text-brand-700 font-medium transition-colors shadow-sm hover:shadow-md"
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
      
      <Footer />
    </div>
  )
}

function RecipesPageFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-neutral-800">Loading recipes...</h2>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default function RecipesPage() {
  return (
    <Suspense fallback={<RecipesPageFallback />}>
      <RecipesPageContent />
    </Suspense>
  )
}