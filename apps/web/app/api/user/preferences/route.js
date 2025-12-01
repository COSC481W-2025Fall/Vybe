import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * GET /api/user/preferences
 * Get user preferences
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    // Handle case where table doesn't exist or no rows returned
    if (error) {
      // PGRST116 = no rows returned (table exists but no record)
      // 42P01 = relation does not exist (table doesn't exist)
      // PGRST205 = table not found in schema cache
      if (error.code === 'PGRST116' || error.code === '42P01' || error.code === 'PGRST205') {
        // Return defaults if no preferences exist or table doesn't exist yet
        return NextResponse.json({
          smart_sort_data_collection: false,
        });
      }
      console.error('[user/preferences] Error fetching preferences:', error);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    // Return preferences or defaults
    return NextResponse.json({
      smart_sort_data_collection: preferences?.smart_sort_data_collection || false,
    });
  } catch (error) {
    console.error('[user/preferences] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/user/preferences
 * Update user preferences
 * 
 * Request body:
 * {
 *   smart_sort_data_collection: boolean
 * }
 */
export async function PUT(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { smart_sort_data_collection } = body;

    if (typeof smart_sort_data_collection !== 'boolean') {
      return NextResponse.json({ 
        error: 'smart_sort_data_collection must be a boolean' 
      }, { status: 400 });
    }

    // Upsert preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: session.user.id,
        smart_sort_data_collection: smart_sort_data_collection,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('[user/preferences] Error updating preferences:', error);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      preferences: {
        smart_sort_data_collection: data.smart_sort_data_collection
      }
    });
  } catch (error) {
    console.error('[user/preferences] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

