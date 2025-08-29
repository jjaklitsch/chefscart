import { NextRequest, NextResponse } from 'next/server'
import { createServerAuthClient } from '../../../../lib/supabase-server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token = requestUrl.searchParams.get('token')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  
  console.log('Params:', {
    code: code ? `present (${code.substring(0, 20)}...)` : 'missing',
    token: token ? `present (${token.substring(0, 20)}...)` : 'missing',
    tokenHash: tokenHash ? 'present' : 'missing',
    type,
    error,
    errorDescription,
    allParams: Object.fromEntries(requestUrl.searchParams)
  })
  
  // Handle error cases from Supabase
  if (error) {
    console.error('Auth callback error from Supabase:', { error, errorDescription })
    
    if (error === 'access_denied') {
      const errorCode = requestUrl.searchParams.get('error_code')
      
      if (errorCode === 'otp_expired') {
        return NextResponse.redirect(`${requestUrl.origin}/login?error=link_expired`)
      }
    }
    
    return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`)
  }
  
  // First, check if this is just the redirect from Supabase verify endpoint
  // In PKCE flow, Supabase first verifies at their endpoint, then redirects here
  // The session should already be set in cookies by that point
  
  // Try to get existing session first
  try {
    const supabase = createServerAuthClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log('Session check result:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email || 'none',
      error: sessionError?.message || 'none'
    })
    
    if (session?.user) {
      
      // Check if this is a new user
      const user = session.user
      const userCreatedAt = new Date(user.created_at)
      const now = new Date()
      const timeDiff = now.getTime() - userCreatedAt.getTime()
      const isNewUser = timeDiff < 60000 // Less than 1 minute ago = new user
      
      // Redirect to dashboard
      const redirectTo = isNewUser ? '/dashboard?welcome=true' : '/dashboard'
      
      if (isNewUser) {
        return NextResponse.redirect(`${requestUrl.origin}/dashboard?welcome=true`)
      } else {
        return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
      }
    } else {
    }
  } catch (error) {
    console.error('Error checking for existing session:', error)
  }
  
  // Handle auth parameters if no session exists
  if (code || token || tokenHash) {
    try {
      const supabase = createServerAuthClient()
      
      let data, error
      
      if (token && type === 'magiclink') {
        // PKCE Magic link flow - the token is the PKCE verifier
        
        // For PKCE magic links, Supabase handles the verification automatically
        // We just need to get the session that should be set after following the link
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (!sessionError && session) {
          // Session exists, auth successful
          data = { session, user: session.user }
          error = null
        } else {
          // No session means the link verification failed
          error = sessionError || new Error('Magic link verification failed')
          data = null
        }
      } else if (code) {
        // OAuth flow - exchange code for session
        ;({ data, error } = await supabase.auth.exchangeCodeForSession(code))
      } else if (tokenHash) {
        // Old magic link flow with token_hash
        ;({ data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'magiclink'
        }))
      }
      
      console.log('Token exchange result:', {
        hasData: !!data,
        hasSession: !!data?.session,
        hasUser: !!data?.session?.user,
        error: error?.message,
        errorDetails: error
      })
      
      if (error) {
        console.error('Auth callback error - FULL DETAILS:', {
          error,
          message: error.message,
          status: (error as any).status,
          code: (error as any).code,
          details: error
        })
        return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed&message=${encodeURIComponent(error.message || 'Unknown error')}`)
      }
      
      if (data?.session?.user) {
        
        // Check if this is a new user (created_at is recent)
        const user = data.session.user
        const userCreatedAt = new Date(user.created_at)
        const now = new Date()
        const timeDiff = now.getTime() - userCreatedAt.getTime()
        const isNewUser = timeDiff < 60000 // Less than 1 minute ago = new user
        
        // Redirect to dashboard
        if (isNewUser) {
          // New user: redirect to dashboard with welcome flag
          return NextResponse.redirect(`${requestUrl.origin}/dashboard?welcome=true`)
        } else {
          // Returning user: go directly to dashboard
          return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
        }
      } else {
        console.error('No session found after token exchange')
        return NextResponse.redirect(`${requestUrl.origin}/login?error=no_session`)
      }
    } catch (error) {
      console.error('Auth callback exception:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`)
    }
  }

  // If no code or authentication failed, redirect to login
  console.log('No auth parameters found. Expected code, token, or token_hash. Got:', {
    allParams: Object.fromEntries(requestUrl.searchParams),
    url: request.url
  })
  return NextResponse.redirect(`${requestUrl.origin}/login?error=no_params`)
}