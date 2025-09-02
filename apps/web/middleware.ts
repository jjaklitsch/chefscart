import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Skip middleware for API routes, static files, auth callback, and geo-restriction page
  if (
    path.startsWith('/api/') ||
    path.startsWith('/_next/') ||
    path === '/auth/callback' ||
    path === '/us-only' ||
    path === '/legal' ||
    path === '/favicon.ico' ||
    path === '/favicon.svg' ||
    path.includes('.')
  ) {
    return NextResponse.next()
  }

  // Perform geo-location check for main user-facing pages
  const geoRestrictedRoutes = ['/', '/login', '/dashboard', '/quick-plan', '/cart-builder', '/meal-plan', '/profile', '/recipes', '/shop', '/community']
  const shouldCheckGeo = geoRestrictedRoutes.some(route => 
    path === route || path.startsWith(route + '/')
  )

  if (shouldCheckGeo) {
    try {
      // Get client IP from headers
      const forwarded = request.headers.get('x-forwarded-for')
      const clientIP = forwarded?.split(',')[0] || 
                      request.headers.get('x-real-ip') || 
                      '127.0.0.1'

      // For development/local testing, allow access
      if (clientIP === '127.0.0.1' || 
          clientIP === '::1' || 
          clientIP.startsWith('192.168.') || 
          clientIP.startsWith('10.') || 
          clientIP.startsWith('172.')) {
        // Continue to auth middleware for local development
      } else {
        // Check if user's country is cached in cookies
        const isUSFromCookie = request.cookies.get('is-us')?.value

        if (isUSFromCookie === 'false') {
          // Non-US user, redirect to restriction page
          const url = request.nextUrl.clone()
          url.pathname = '/us-only'
          return NextResponse.redirect(url)
        } else if (isUSFromCookie === undefined) {
          // No cached data, perform IP geolocation lookup
          try {
            const geoResponse = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,country`, {
              headers: {
                'User-Agent': 'ChefsCart-Geolocation/1.0'
              },
              // Add timeout to prevent slow responses
              signal: AbortSignal.timeout(3000)
            })

            if (geoResponse.ok) {
              const geoData = await geoResponse.json()
              
              if (geoData.status === 'success') {
                const isUS = geoData.country === 'United States'
                
                if (!isUS) {
                  // Non-US user, redirect with cookies set
                  const url = request.nextUrl.clone()
                  url.pathname = '/us-only'
                  const redirectResponse = NextResponse.redirect(url)
                  
                  redirectResponse.cookies.set('user-country', geoData.country, {
                    maxAge: 86400, // 1 day
                    httpOnly: false,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax'
                  })
                  
                  redirectResponse.cookies.set('is-us', 'false', {
                    maxAge: 86400,
                    httpOnly: false,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax'
                  })
                  
                  return redirectResponse
                }
                
                // US user, set cookies and continue
                const response = NextResponse.next({
                  request: {
                    headers: request.headers,
                  },
                })
                
                response.cookies.set('user-country', geoData.country, {
                  maxAge: 86400,
                  httpOnly: false,
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: 'lax'
                })
                
                response.cookies.set('is-us', 'true', {
                  maxAge: 86400,
                  httpOnly: false,
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: 'lax'
                })
                
                // Continue with Supabase auth middleware below
                return await handleSupabaseAuth(request, response)
              }
            }
          } catch (geoError) {
            console.error('Geo-location lookup error:', geoError)
            // If geolocation fails, allow access (fail open)
          }
        }
      }
    } catch (error) {
      console.error('Geo-location middleware error:', error)
      // If there's an error, allow access (fail open)
    }
  }

  // Continue with existing auth middleware
  return await handleSupabaseAuth(request)
}

async function handleSupabaseAuth(request: NextRequest, existingResponse?: NextResponse) {
  const path = request.nextUrl.pathname
  
  let response = existingResponse || NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
            response = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Only refresh session for protected routes, not for public pages
    const protectedRoutes = ['/dashboard', '/preferences', '/profile', '/quick-plan']
    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))
    
    if (isProtectedRoute) {
      // Try to get session but don't fail if it doesn't work
      const { data: { session }, error } = await supabase.auth.getSession()
      
      // If there's an error or no session on protected route, let the page handle it
      // Don't redirect from middleware to avoid conflicts with client-side redirects
      if (!session && isProtectedRoute) {
        console.log('No session found for protected route:', path)
      }
    }
  } catch (error) {
    console.error('Middleware error:', error)
    // Continue even if there's an error
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}