import { NextResponse } from 'next/server';
import { supabaseRoute } from '@/lib/supabase/route';

// GET /api/history?limit=20&before=ISO_DATE
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const before = searchParams.get('before'); // ISO string or timestamp

    const sb = supabaseRoute();
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = sb
      .from('play_history')
      .select('*')
      .eq('user_id', session.user.id)
      .order('played_at', { ascending: false })
      .limit(limit);

    if (before) {
      const beforeDate = new Date(isNaN(Number(before)) ? before : Number(before));
      if (!isNaN(beforeDate.getTime())) {
        query = query.lt('played_at', beforeDate.toISOString());
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ items: data || [] });
  } catch (err) {
    console.error('[api/history] error', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}


