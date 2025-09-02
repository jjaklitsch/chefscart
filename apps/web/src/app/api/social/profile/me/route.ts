import { NextRequest, NextResponse } from 'next/server'
import { createServerAuthClient } from '../../../../../../lib/supabase-server'
import { createClient } from '../../../../../../lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerAuthClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const dbSupabase = createClient()

    // Get user's social profile
    const { data: profile, error: profileError } = await dbSupabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({
        success: false,
        error: 'Profile not found',
        user_email: user.email
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      profile,
      user_email: user.email
    })

  } catch (error) {
    console.error('Error getting user profile:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}