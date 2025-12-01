// middleware.js
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { CONFIG } from './config/constants.js'

// Paths that are always public
const PUBLIC = new Set([
  '/auth/callback',
  '/sign-in',
  '/favicon.ico',
  '/api/health',
])

// Path prefixes that are public
const PUBLIC_PREFIXES = ['/u/']

export async function middleware(req) {
  const { pathname } = req.nextUrl

  // Skip CORS preflights
  if (req.method === 'OPTIONS') return NextResponse.next()

  // Public routes - skip auth check entirely
  if (PUBLIC.has(pathname)) return NextResponse.next()
  if (PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) return NextResponse.next()

  // Create response
  let response = NextResponse.next({
    request: { headers: req.headers },
  })
  
  // Track cookies that need to be set
  const cookiesToSet = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            cookiesToSet.push({ name, value, options })
            req.cookies.set(name, value)
          })
          // Rebuild response with updated cookies
          response = NextResponse.next({
            request: { headers: req.headers },
          })
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              path: '/',
              secure: req.nextUrl.origin.startsWith('https://'),
              sameSite: options?.sameSite ?? 'lax',
            })
          })
        },
      },
    }
  )
  
  // This refreshes the session if needed
  const { data: { session } } = await supabase.auth.getSession()
  
  console.log('[mw] path:', pathname, 'session?', !!session, 'cookies:', cookiesToSet.length)

  // Helper to redirect with cookies
  const redirectWithCookies = (url) => {
    const redirectResponse = NextResponse.redirect(url)
    cookiesToSet.forEach(({ name, value, options }) => {
      redirectResponse.cookies.set(name, value, {
        ...options,
        path: '/',
        secure: req.nextUrl.origin.startsWith('https://'),
        sameSite: options?.sameSite ?? 'lax',
      })
    })
    return redirectResponse
  }

  if (!session) {
    if (pathname === '/sign-in') return response
    if (pathname.startsWith('/api/')) return response
    
    const url = req.nextUrl.clone()
    url.pathname = CONFIG.AUTH_REDIRECT_PATH
    url.searchParams.set('next', pathname + req.nextUrl.search)
    return redirectWithCookies(url)
  }

  // Authenticated user visiting sign-in -> redirect away
  if (pathname === '/sign-in') {
    const url = req.nextUrl.clone()
    const nextParam = req.nextUrl.searchParams.get('next')
    if (nextParam) {
      const dest = new URL(nextParam, req.nextUrl.origin)
      url.pathname = dest.pathname
      url.search = dest.search
    } else {
      url.pathname = '/'
      url.search = ''
    }
    return redirectWithCookies(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
