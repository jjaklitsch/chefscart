import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase'
import { createServerAuthClient } from '../../../../lib/supabase-server'

interface MealData {
  id: string
  title: string
  description: string
  prep_time?: number
  cook_time?: number
  cuisines: string[]
  cooking_difficulty: string
  courses: string[]
  image_url?: string
  primary_ingredient?: string
}

export async function GET(request: NextRequest) {
  try {
    const authClient = createServerAuthClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '8')
    
    // Get user preferences from localStorage (would be from database in production)
    // For now, we'll get recommendations based on popular/trending recipes
    
    // Get trending recipes with images
    const { data: trendingRecipes, error: trendingError } = await supabase
      .from('meals')
      .select('id, title, description, prep_time, cook_time, cuisines, cooking_difficulty, courses, image_url, primary_ingredient')
      .not('image_url', 'is', null)
      .order('title')
      .limit(limit * 2) // Get more to randomize
      .returns<MealData[]>()
    
    if (trendingError) {
      console.error('Error fetching trending recipes:', trendingError)
      return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
    }
    
    // Shuffle and limit results for variety
    const shuffled = (trendingRecipes || [])
      .sort(() => Math.random() - 0.5)
      .slice(0, limit)
      .map(recipe => ({
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        prep_time: recipe.prep_time,
        cook_time: recipe.cook_time,
        cuisines: recipe.cuisines,
        cooking_difficulty: recipe.cooking_difficulty,
        courses: recipe.courses,
        image_url: recipe.image_url,
        primary_ingredient: recipe.primary_ingredient,
        slug: recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        totalTime: (recipe.prep_time || 0) + (recipe.cook_time || 0)
      }))
    
    return NextResponse.json({
      success: true,
      recommendations: shuffled,
      total: shuffled.length
    })
    
  } catch (error) {
    console.error('Error in recommendations API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}