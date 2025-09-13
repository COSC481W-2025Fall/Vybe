// middleware.js
import { NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

const PUBLIC = [
  '/', '/auth/callback', '/sign-in', '/favicon.ico',
  // static assets:
  '/_next', '/api/health'
]

export async function middleware(req) {
  const res = NextResponse.next()

  // refresh/attach session cookies if needed
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname
  const isPublic = PUBLIC.some(p => path === p || path.startsWith(p))

  if (!session && !isPublic) {
    const url = req.nextUrl.clone()
    url.pathname = '/sign-in'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/((?!.*\\.).*)'], // everything except files
}
