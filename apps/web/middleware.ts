import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Skip middleware for API routes, static files, and auth callback
  const path = request.nextUrl.pathname
  if (
    path.startsWith('/api/') ||
    path.startsWith('/_next/') ||
    path === '/auth/callback' ||
    path === '/favicon.ico' ||
    path === '/favicon.svg' ||
    path.includes('.')
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
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