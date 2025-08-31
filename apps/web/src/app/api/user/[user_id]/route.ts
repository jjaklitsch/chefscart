import { NextRequest, NextResponse } from 'next/server'
import { createServerAuthClient } from '../../../../../lib/supabase-server'

// GET /api/user/[user_id] - Get user profile by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { user_id: string } }
) {
  try {
    const { user_id } = params

    if (!user_id) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    const supabase = createServerAuthClient()

    // Get current session to check if user can see private profiles
    const { data: { session } } = await supabase.auth.getSession()
    const currentUserId = session?.user?.id

    // Get user profile
    const { data: profile, error } = await supabase
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
      .eq('id', user_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'User not found'
        }, { status: 404 })
      }
      
      console.error('Error fetching user profile:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch user profile'
      }, { status: 500 })
    }

    // Check privacy - only allow access if profile is public or user is viewing their own profile
    const isOwner = currentUserId === user_id
    if (!profile.is_public && !isOwner) {
      return NextResponse.json({
        success: false,
        error: 'This profile is private'
      }, { status: 403 })
    }

    // Check if current user is following this profile (if authenticated and not own profile)
    let isFollowing = false
    if (currentUserId && !isOwner) {
      const { data: followData } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', user_id)
        .single()
      
      isFollowing = !!followData
    }

    return NextResponse.json({
      success: true,
      profile,
      isFollowing,
      isOwner
    })

  } catch (error) {
    console.error('Error in user profile API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// PUT /api/user/[user_id] - Update user profile (owner only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { user_id: string } }
) {
  try {
    const { user_id } = params
    const body = await request.json()

    if (!user_id) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    const supabase = createServerAuthClient()

    // Get current session - must be authenticated
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    // Only allow users to update their own profile
    if (session.user.id !== user_id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - can only update your own profile'
      }, { status: 403 })
    }

    const {
      username,
      display_name,
      bio,
      location,
      website_url,
      is_public,
      avatar_url,
      cover_image_url
    } = body

    // Validate required fields
    if (!username || !display_name) {
      return NextResponse.json({
        success: false,
        error: 'Username and display name are required'
      }, { status: 400 })
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({
        success: false,
        error: 'Username can only contain letters, numbers, and underscores'
      }, { status: 400 })
    }

    // Check if username is already taken (excluding current user)
    if (username) {
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .neq('id', user_id)
        .single()

      if (existingUser) {
        return NextResponse.json({
          success: false,
          error: 'Username is already taken'
        }, { status: 409 })
      }
    }

    // Update profile
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        username: username.toLowerCase(),
        display_name: display_name.trim(),
        bio: bio?.trim() || null,
        location: location?.trim() || null,
        website_url: website_url?.trim() || null,
        is_public: is_public !== false,
        avatar_url: avatar_url || null,
        cover_image_url: cover_image_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to update profile'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      profile: data
    })

  } catch (error) {
    console.error('Error in update profile API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}