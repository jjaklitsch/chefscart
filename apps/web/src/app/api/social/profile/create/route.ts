import { NextRequest, NextResponse } from 'next/server'
import { createServerAuthClient } from '../../../../../../lib/supabase-server'
import { createClient } from '../../../../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerAuthClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const dbSupabase = createClient()

    // Check if social profile already exists
    const { data: existingProfile } = await dbSupabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      return NextResponse.json({
        success: true,
        profile: existingProfile,
        message: 'Profile already exists'
      })
    }

    // Generate username from email
    const email = user.email
    if (!email) {
      return NextResponse.json({ success: false, error: 'No email found' }, { status: 400 })
    }

    let baseUsername = email.split('@')[0]?.toLowerCase() || 'user'
    // Clean username to only include alphanumeric and underscores
    baseUsername = baseUsername.replace(/[^a-z0-9_]/g, '_')

    // Ensure username is unique
    let username = baseUsername
    let counter = 1
    
    while (true) {
      const { data: usernameExists } = await dbSupabase
        .from('user_profiles')
        .select('username')
        .eq('username', username)
        .single()
      
      if (!usernameExists) break
      username = `${baseUsername}_${counter}`
      counter++
    }

    // Create display name from email
    const displayName = email.split('@')[0]
      ?.split(/[._-]/)
      ?.map(word => word.charAt(0).toUpperCase() + word.slice(1))
      ?.join(' ') || 'User'

    // Create new social profile
    const profileData = {
      id: user.id,
      username,
      display_name: displayName,
      bio: null,
      avatar_url: null,
      cover_image_url: null,
      location: null,
      website_url: null,
      follower_count: 0,
      following_count: 0,
      recipe_count: 0,
      total_likes_received: 0,
      is_public: true,
      is_verified: false,
      zip_code: null,
      preferences: null,
      completed_onboarding: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: newProfile, error: insertError } = await dbSupabase
      .from('user_profiles')
      .insert([profileData] as any)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating profile:', insertError)
      return NextResponse.json({ success: false, error: 'Failed to create profile' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      profile: newProfile,
      message: 'Profile created successfully'
    })

  } catch (error) {
    console.error('Error in create profile:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}