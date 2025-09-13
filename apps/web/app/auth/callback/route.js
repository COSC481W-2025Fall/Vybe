// app/auth/callback/route.js
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(req) {
  const url  = new URL(req.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/'

  if (!code) {
    console.error('Callback: missing code')
    return NextResponse.redirect(new URL('/sign-in?e=missing_code', req.url))
  }

  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('Callback: exchange failed', error)
    return NextResponse.redirect(new URL('/sign-in?e=exchange_failed', req.url))
  }

  // success -> session cookie is now set
  return NextResponse.redirect(new URL(next, req.url))
}
