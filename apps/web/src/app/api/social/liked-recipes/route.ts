import { NextRequest, NextResponse } from 'next/server'
import { createServerAuthClient } from '../../../../../lib/supabase-server'
import { getSupabaseClient } from '../../../../../lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/social/liked-recipes - Get user's liked recipes
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authSupabase = createServerAuthClient()
    const { data: { session }, error: sessionError } = await authSupabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const supabase = getSupabaseClient()

    // Get user's liked recipes with recipe details
    const { data: likedRecipes, error: likesError } = await supabase
      .from('recipe_interactions')
      .select(`
        recipe_id,
        created_at,
        user_recipes (
          id,
          title,
          description,
          image_url,
          slug,
          prep_time,
          cook_time,
          cooking_difficulty,
          cuisines,
          courses,
          author:user_profiles!inner (
            username,
            display_name
          )
        )
      `)
      .eq('user_id', session.user.id)
      .eq('interaction_type', 'like')
      .eq('user_recipes.status', 'published')
      .order('created_at', { ascending: false })

    if (likesError) {
      console.error('Error fetching liked recipes:', likesError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch liked recipes'
      }, { status: 500 })
    }

    // Format the response
    const formattedRecipes = likedRecipes?.map((like: any) => ({
      id: like.user_recipes?.id,
      title: like.user_recipes?.title,
      description: like.user_recipes?.description,
      image_url: like.user_recipes?.image_url,
      slug: like.user_recipes?.slug,
      prep_time: like.user_recipes?.prep_time,
      cook_time: like.user_recipes?.cook_time,
      cooking_difficulty: like.user_recipes?.cooking_difficulty,
      cuisines: like.user_recipes?.cuisines,
      courses: like.user_recipes?.courses,
      author: like.user_recipes?.author,
      liked_at: like.created_at
    })).filter((recipe: any) => recipe.id) // Filter out any null recipes

    return NextResponse.json({
      success: true,
      recipes: formattedRecipes || [],
      count: formattedRecipes?.length || 0
    })

  } catch (error) {
    console.error('Get liked recipes error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch liked recipes'
    }, { status: 500 })
  }
}