import { NextRequest, NextResponse } from 'next/server'
import { createServerAuthClient } from '../../../../../lib/supabase-server'
import { getSupabaseClient } from '../../../../../lib/supabase'

export const dynamic = 'force-dynamic'

// POST /api/social/follow - Follow a user
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { following_id } = body

    if (!following_id) {
      return NextResponse.json({
        success: false,
        error: 'User ID required'
      }, { status: 400 })
    }

    // Can't follow yourself
    if (following_id === session.user.id) {
      return NextResponse.json({
        success: false,
        error: 'You cannot follow yourself'
      }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', session.user.id)
      .eq('following_id', following_id)
      .single()

    if (existingFollow) {
      return NextResponse.json({
        success: false,
        error: 'Already following this user'
      }, { status: 400 })
    }

    // Create follow relationship
    // @ts-ignore - Supabase types not fully generated for social tables
    const { data, error } = await supabase
      .from('user_follows')
      .insert({
        follower_id: session.user.id,
        following_id: following_id
      })
      .select()
      .single()

    if (error) {
      console.error('Follow error:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to follow user'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      follow: data
    })

  } catch (error) {
    console.error('Follow error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to follow user'
    }, { status: 500 })
  }
}

// DELETE /api/social/follow - Unfollow a user
export async function DELETE(request: NextRequest) {
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

    const body = await request.json()
    const { following_id } = body

    if (!following_id) {
      return NextResponse.json({
        success: false,
        error: 'User ID required'
      }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    // Delete follow relationship
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', session.user.id)
      .eq('following_id', following_id)

    if (error) {
      console.error('Unfollow error:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to unfollow user'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unfollowed user'
    })

  } catch (error) {
    console.error('Unfollow error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to unfollow user'
    }, { status: 500 })
  }
}

// GET /api/social/follow - Get followers or following list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const type = searchParams.get('type') || 'followers' // 'followers' or 'following'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID required'
      }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    if (type === 'followers') {
      // Get users who follow this user
      const { data, error, count } = await supabase
        .from('user_follows')
        .select(`
          follower:user_profiles!follower_id(
            id,
            username,
            display_name,
            avatar_url,
            bio,
            follower_count,
            recipe_count,
            is_verified
          )
        `, { count: 'exact' })
        .eq('following_id', userId)
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Followers fetch error:', error)
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch followers'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        users: data?.map(item => item.follower) || [],
        total_count: count || 0,
        has_more: (offset + limit) < (count || 0)
      })

    } else if (type === 'following') {
      // Get users that this user follows
      const { data, error, count } = await supabase
        .from('user_follows')
        .select(`
          following:user_profiles!following_id(
            id,
            username,
            display_name,
            avatar_url,
            bio,
            follower_count,
            recipe_count,
            is_verified
          )
        `, { count: 'exact' })
        .eq('follower_id', userId)
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Following fetch error:', error)
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch following'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        users: data?.map(item => item.following) || [],
        total_count: count || 0,
        has_more: (offset + limit) < (count || 0)
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid type parameter'
    }, { status: 400 })

  } catch (error) {
    console.error('Follow list error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch follow list'
    }, { status: 500 })
  }
}