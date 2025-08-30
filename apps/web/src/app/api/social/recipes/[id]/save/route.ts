import { NextRequest, NextResponse } from 'next/server'
import { createServerAuthClient } from '../../../../../../../lib/supabase-server'
import { getSupabaseClient } from '../../../../../../../lib/supabase'

export const dynamic = 'force-dynamic'

// POST /api/social/recipes/[id]/save - Save/bookmark a recipe
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

    // Check if already saved
    const { data: existingSave } = await supabase
      .from('recipe_interactions')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('recipe_id', recipeId)
      .eq('interaction_type', 'save')
      .single()

    if (existingSave) {
      // Unsave - remove the interaction
      const { error: deleteError } = await supabase
        .from('recipe_interactions')
        .delete()
        .eq('id', existingSave.id)

      if (deleteError) {
        console.error('Unsave error:', deleteError)
        return NextResponse.json({
          success: false,
          error: 'Failed to unsave recipe'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        saved: false,
        message: 'Recipe removed from saved'
      })
    } else {
      // Save - create interaction
      const { data, error: insertError } = await supabase
        .from('recipe_interactions')
        .insert({
          user_id: session.user.id,
          recipe_id: recipeId,
          interaction_type: 'save'
        })
        .select()
        .single()

      if (insertError) {
        console.error('Save error:', insertError)
        return NextResponse.json({
          success: false,
          error: 'Failed to save recipe'
        }, { status: 500 })
      }

      // Optionally, add to default collection (future feature)
      // await addToDefaultCollection(session.user.id, recipeId)

      return NextResponse.json({
        success: true,
        saved: true,
        interaction: data
      })
    }

  } catch (error) {
    console.error('Save recipe error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process save'
    }, { status: 500 })
  }
}

// GET /api/social/recipes/[id]/save - Check if user has saved recipe
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
        saved: false
      })
    }

    const recipeId = params.id
    const supabase = getSupabaseClient()

    // Check if saved
    const { data: save } = await supabase
      .from('recipe_interactions')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('recipe_id', recipeId)
      .eq('interaction_type', 'save')
      .single()

    return NextResponse.json({
      success: true,
      saved: !!save
    })

  } catch (error) {
    console.error('Check save error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check save status'
    }, { status: 500 })
  }
}