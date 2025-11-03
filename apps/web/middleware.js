// middleware.js
import { NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { CONFIG } from './config/constants.js'

// Paths that are always public (exclude '/sign-in' so we can handle it explicitly)
const PUBLIC = new Set([
  '/',              // landing
  '/home',          // home page
  '/auth/callback', // Supabase OAuth will hit this
  '/favicon.ico',
  '/api/health',
])

export async function middleware(req) {
  const { pathname } = req.nextUrl

  // Skip CORS preflights quickly
  if (req.method === 'OPTIONS') return NextResponse.next()

  // Public routes
  if (PUBLIC.has(pathname)) return NextResponse.next()

  // Create a response up front so auth-helpers can refresh cookies if needed
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
  console.log('[mw] path:', req.nextUrl.pathname, 'session?', !!session)

  // If not authenticated:
  // - allow access to '/sign-in'
  // - otherwise redirect to '/sign-in?next=...'
  if (!session) {
    if (pathname === '/sign-in') return res
    const url = req.nextUrl.clone()
    url.pathname = CONFIG.AUTH_REDIRECT_PATH
    url.searchParams.set('next', pathname + req.nextUrl.search)
    return NextResponse.redirect(url)
  }

  // If authenticated and visiting '/sign-in' → bounce to next or '/library'
  if (pathname === '/sign-in') {
    const url = req.nextUrl.clone()
    const nextParam = req.nextUrl.searchParams.get('next')
    if (nextParam) {
      // Validate that nextParam is a relative path (prevents open redirect)
      // Must start with / and not contain protocol schemes (http://, https://, //)
      if (nextParam.startsWith('/') && !nextParam.match(/^\/\/|^https?:\/\//i)) {
        try {
          // Parse as relative URL to safely extract pathname and search
          const dest = new URL(nextParam, req.nextUrl.origin)
          // Double-check the origin matches (prevents protocol-relative URLs)
          if (dest.origin === req.nextUrl.origin) {
            url.pathname = dest.pathname
            url.search = dest.search
          } else {
            // If origin doesn't match, fallback to default
            url.pathname = '/library'
            url.search = ''
          }
        } catch {
          // If URL parsing fails, fallback to default
          url.pathname = '/library'
          url.search = ''
        }
      } else {
        // Invalid redirect path, use default
        url.pathname = '/library'
        url.search = ''
      }
    } else {
      url.pathname = '/library'
      url.search = ''
    }
    return NextResponse.redirect(url)
  }

  return res
}

// Run middleware on everything except static assets & well-known files
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
