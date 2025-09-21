// middleware.js
import { NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { CONFIG } from './config/constants.js'

// Paths that are always public
const PUBLIC = new Set(CONFIG.PUBLIC_ROUTES)

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

  // Not authenticated and path isn't public → send to sign-in
  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = CONFIG.AUTH_REDIRECT_PATH
    url.searchParams.set('next', pathname + req.nextUrl.search)
    return NextResponse.redirect(url)
  }

  // Already authenticated but visiting /sign-in → bounce to next or default
  if (pathname === CONFIG.AUTH_REDIRECT_PATH) {
    const url = req.nextUrl.clone()
    url.pathname = req.nextUrl.searchParams.get('next') || CONFIG.DEFAULT_REDIRECT_PATH
    url.search = ''
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
