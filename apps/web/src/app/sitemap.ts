import { MetadataRoute } from 'next'
import { createClient } from '../../lib/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://chefscart.ai'
  
  // Static pages that should be indexed
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/recipes`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/recipes/cuisines`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/recipes/diets`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
  ]

  try {
    const supabase = createClient()
    
    // Get all recipes for individual recipe pages
    const { data: recipes } = await supabase
      .from('meals')
      .select('title, updated_at')
      .order('title')

    const recipePages = (recipes || []).map((recipe: any) => ({
      url: `${baseUrl}/recipes/${recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`,
      lastModified: recipe.updated_at ? new Date(recipe.updated_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

    // Get all unique cuisines for cuisine category pages
    const { data: cuisinesData } = await supabase
      .from('meals')
      .select('cuisines')

    const allCuisines = new Set<string>()
    if (cuisinesData) {
      cuisinesData.forEach((meal: any) => {
        if (meal.cuisines && Array.isArray(meal.cuisines)) {
          meal.cuisines.forEach((cuisine: string) => allCuisines.add(cuisine))
        }
      })
    }

    const cuisinePages = Array.from(allCuisines).map(cuisine => ({
      url: `${baseUrl}/recipes/cuisine/${cuisine.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

    // Get all unique diets for diet category pages
    const { data: dietsData } = await supabase
      .from('meals')
      .select('diets_supported')

    const allDiets = new Set<string>()
    if (dietsData) {
      dietsData.forEach((meal: any) => {
        if (meal.diets_supported && Array.isArray(meal.diets_supported)) {
          meal.diets_supported.forEach((diet: string) => allDiets.add(diet))
        }
      })
    }

    const dietPages = Array.from(allDiets).map(diet => ({
      url: `${baseUrl}/recipes/diet/${diet.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

    // Get all unique courses for course category pages
    const { data: coursesData } = await supabase
      .from('meals')
      .select('courses')

    const allCourses = new Set<string>()
    if (coursesData) {
      coursesData.forEach((meal: any) => {
        if (meal.courses && Array.isArray(meal.courses)) {
          meal.courses.forEach((course: string) => allCourses.add(course))
        }
      })
    }

    const coursePages = Array.from(allCourses).map(course => ({
      url: `${baseUrl}/recipes/course/${course.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

    // Get all unique difficulty levels for difficulty category pages
    const { data: difficultyData } = await supabase
      .from('meals')
      .select('cooking_difficulty')

    const allDifficulties = new Set<string>()
    if (difficultyData) {
      difficultyData.forEach((meal: any) => {
        if (meal.cooking_difficulty) {
          allDifficulties.add(meal.cooking_difficulty)
        }
      })
    }

    const difficultyPages = Array.from(allDifficulties).map(difficulty => ({
      url: `${baseUrl}/recipes/difficulty/${difficulty.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

    // Combine all pages
    return [
      ...staticPages,
      ...recipePages,
      ...cuisinePages,
      ...dietPages,
      ...coursePages,
      ...difficultyPages,
    ]

  } catch (error) {
    console.error('Error generating sitemap:', error)
    // Return at least static pages if database fails
    return staticPages
  }
}