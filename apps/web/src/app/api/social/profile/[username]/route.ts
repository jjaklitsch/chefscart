import { NextRequest, NextResponse } from 'next/server'
import { createServerAuthClient } from '../../../../../../lib/supabase-server'
import { getSupabaseClient } from '../../../../../../lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/social/profile/[username] - Get user profile by username
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params
    const supabase = getSupabaseClient()

    // Get user profile by username
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        created_at,
        updated_at,
        username,
        display_name,
        bio,
        avatar_url,
        cover_image_url,
        location,
        website_url,
        follower_count,
        following_count,
        recipe_count,
        total_likes_received,
        is_public,
        is_verified
      `)
      .eq('username', username)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    // Check if profile is public or if user is viewing their own profile
    const authSupabase = createServerAuthClient()
    const { data: { session } } = await authSupabase.auth.getSession()
    const isOwnProfile = session?.user?.id === profile.id
    const canView = profile.is_public || isOwnProfile

    if (!canView) {
      return NextResponse.json({
        success: false,
        error: 'Profile is private'
      }, { status: 403 })
    }

    // Check if current user is following this profile (if authenticated)
    let isFollowing = false
    if (session?.user?.id && session.user.id !== profile.id) {
      const { data: followData } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', session.user.id)
        .eq('following_id', profile.id)
        .single()

      isFollowing = !!followData
    }

    return NextResponse.json({
      success: true,
      profile,
      isFollowing,
      isOwnProfile
    })

  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch profile'
    }, { status: 500 })
  }
}

// PUT /api/social/profile/[username] - Update user profile (own profile only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params
    const body = await request.json()

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

    // Verify user owns this profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, username')
      .eq('username', username)
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({
        success: false,
        error: 'Profile not found or access denied'
      }, { status: 404 })
    }

    // Update profile with allowed fields only
    const allowedFields = [
      'display_name', 'bio', 'avatar_url', 'cover_image_url', 
      'location', 'website_url', 'is_public'
    ]
    
    const updateData: any = {}
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    })

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', session.user.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: updateError.message
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile
    })

  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update profile'
    }, { status: 500 })
  }
}