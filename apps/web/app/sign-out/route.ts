import { NextResponse } from 'next/server';
import { supabaseRoute } from '@/lib/supabase/route';

export async function POST(request: Request) {
  const supabase = supabaseRoute();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', request.url));
}
