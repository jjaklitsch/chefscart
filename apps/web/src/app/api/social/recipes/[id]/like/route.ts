import { NextRequest, NextResponse } from 'next/server'
import { createServerAuthClient } from '../../../../../../../lib/supabase-server'
import { getSupabaseClient } from '../../../../../../../lib/supabase'

export const dynamic = 'force-dynamic'

// POST /api/social/recipes/[id]/like - Like a recipe
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const recipeId = params.id
    const supabase = getSupabaseClient()

    // Check if recipe exists and is published
    const { data: recipe, error: recipeError } = await supabase
      .from('user_recipes')
      .select('id, status')
      .eq('id', recipeId)
      .eq('status', 'published')
      .single()

    if (recipeError || !recipe) {
      return NextResponse.json({
        success: false,
        error: 'Recipe not found'
      }, { status: 404 })
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('recipe_interactions')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('recipe_id', recipeId)
      .eq('interaction_type', 'like')
      .single()

    if (existingLike) {
      // Unlike - remove the interaction
      const { error: deleteError } = await supabase
        .from('recipe_interactions')
        .delete()
        .eq('id', existingLike.id)

      if (deleteError) {
        console.error('Unlike error:', deleteError)
        return NextResponse.json({
          success: false,
          error: 'Failed to unlike recipe'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        liked: false,
        message: 'Recipe unliked'
      })
    } else {
      // Like - create interaction
      const { data, error: insertError } = await supabase
        .from('recipe_interactions')
        .insert({
          user_id: session.user.id,
          recipe_id: recipeId,
          interaction_type: 'like'
        })
        .select()
        .single()

      if (insertError) {
        console.error('Like error:', insertError)
        return NextResponse.json({
          success: false,
          error: 'Failed to like recipe'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        liked: true,
        interaction: data
      })
    }

  } catch (error) {
    console.error('Like recipe error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process like'
    }, { status: 500 })
  }
}

// GET /api/social/recipes/[id]/like - Check if user has liked recipe
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authSupabase = createServerAuthClient()
    const { data: { session }, error: sessionError } = await authSupabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({
        success: true,
        liked: false
      })
    }

    const recipeId = params.id
    const supabase = getSupabaseClient()

    // Check if liked
    const { data: like } = await supabase
      .from('recipe_interactions')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('recipe_id', recipeId)
      .eq('interaction_type', 'like')
      .single()

    return NextResponse.json({
      success: true,
      liked: !!like
    })

  } catch (error) {
    console.error('Check like error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check like status'
    }, { status: 500 })
  }
}