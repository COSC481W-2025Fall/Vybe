// middleware.js
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { CONFIG } from './config/constants.js'

// Paths that are always public (exclude '/sign-in' so we can handle it explicitly)
const PUBLIC = new Set([
  '/auth/callback', // Supabase OAuth will hit this
  '/sign-in', // Sign-in page is public
  '/favicon.ico',
  '/api/health',
])

// Path prefixes that are public (for dynamic routes)
const PUBLIC_PREFIXES = [
  '/u/', // Public user profiles
]

export async function middleware(req) {
  const { pathname } = req.nextUrl

  // Skip CORS preflights quickly
  if (req.method === 'OPTIONS') return NextResponse.next()

  // Public routes - allow without auth
  if (PUBLIC.has(pathname)) return NextResponse.next()
  
  // Public prefixes - allow without auth
  if (PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) return NextResponse.next()

  // Track cookies that need to be set
  const cookiesToSet = []

  // Create response first
  let res = NextResponse.next({
    request: { headers: req.headers },
  })

  const isProduction = process.env.NODE_ENV === 'production' ||
                       req.url.startsWith('https://')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookies) {
          // Store cookies to set later
          cookies.forEach(({ name, value, options }) => {
            cookiesToSet.push({ name, value, options })
            // Also set on request for downstream
            req.cookies.set(name, value)
          })
          // Update response with new cookies
          res = NextResponse.next({
            request: { headers: req.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = {
              ...options,
              path: options?.path || '/',
              secure: isProduction ? true : (options?.secure ?? false),
              sameSite: options?.sameSite || 'lax',
            }
            res.cookies.set(name, value, cookieOptions)
          })
        },
      },
    }
  )
  
  // getSession will refresh the token if needed and set cookies
  const { data: { session } } = await supabase.auth.getSession()
  console.log('[mw] path:', req.nextUrl.pathname, 'session?', !!session)

  // Helper to create redirect while preserving cookies
  const redirectWithCookies = (url) => {
    const redirectResponse = NextResponse.redirect(url)
    cookiesToSet.forEach(({ name, value, options }) => {
      const cookieOptions = {
        ...options,
        path: options?.path || '/',
        secure: isProduction ? true : (options?.secure ?? false),
        sameSite: options?.sameSite || 'lax',
      }
      redirectResponse.cookies.set(name, value, cookieOptions)
    })
    return redirectResponse
  }

  // If not authenticated:
  // - allow access to '/sign-in'
  // - allow API routes to handle their own auth (return JSON errors)
  // - otherwise redirect to '/sign-in?next=...'
  if (!session) {
    if (pathname === '/sign-in') return res
    // Let API routes handle their own authentication
    if (pathname.startsWith('/api/')) return res
    const url = req.nextUrl.clone()
    url.pathname = CONFIG.AUTH_REDIRECT_PATH
    url.searchParams.set('next', pathname + req.nextUrl.search)
    return redirectWithCookies(url)
  }

  // If authenticated and visiting '/sign-in' → bounce to next or home page
  if (pathname === '/sign-in') {
    const url = req.nextUrl.clone()
    const nextParam = req.nextUrl.searchParams.get('next')
    if (nextParam) {
      // next may contain path + query (e.g., /groups/123)
      const dest = new URL(nextParam, req.nextUrl.origin)
      url.pathname = dest.pathname
      url.search = dest.search
    } else {
      url.pathname = '/' // Redirect to home instead of library
      url.search = ''
    }
    return redirectWithCookies(url)
  }

  return res
}

// Run middleware on everything except static assets & well-known files
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
