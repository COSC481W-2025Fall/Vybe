import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

/**
 * GET /api/export-jobs
 * List user's export jobs
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Optional filter
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    let query = supabase
      .from('export_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error('[export-jobs] Error fetching jobs:', error);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('[export-jobs] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/export-jobs
 * Queue a new background export job
 * 
 * Body:
 * {
 *   sourceType: 'group' | 'community',
 *   sourceId: string (UUID),
 *   playlistId?: string (UUID or 'all'),
 *   name: string,
 *   description?: string,
 *   isPublic?: boolean,
 *   isCollaborative?: boolean
 * }
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      platform = 'spotify',
      sourceType = 'group',
      sourceId,
      playlistId,
      name,
      description,
      isPublic = false,
      isCollaborative = false
    } = body;

    // Validate required fields
    if (!sourceId) {
      return NextResponse.json({ error: 'sourceId is required' }, { status: 400 });
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Playlist name is required' }, { status: 400 });
    }
    if (!['group', 'community'].includes(sourceType)) {
      return NextResponse.json({ error: 'Invalid sourceType' }, { status: 400 });
    }
    if (!['spotify', 'youtube'].includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform. Must be spotify or youtube' }, { status: 400 });
    }

    // Check for existing pending/processing job for same source and platform
    const { data: existingJobs } = await supabase
      .from('export_jobs')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .in('status', ['pending', 'processing'])
      .limit(1);

    if (existingJobs && existingJobs.length > 0) {
      return NextResponse.json({
        error: `A ${platform} export job for this playlist is already in progress`,
        existingJobId: existingJobs[0].id
      }, { status: 409 });
    }

    // Create the job
    const { data: job, error: insertError } = await supabase
      .from('export_jobs')
      .insert({
        user_id: user.id,
        platform,
        source_type: sourceType,
        source_id: sourceId,
        playlist_id: playlistId || null,
        playlist_name: name.trim(),
        playlist_description: description?.trim() || null,
        is_public: isPublic,
        is_collaborative: isCollaborative,
        status: 'pending',
        current_step: `Queued for ${platform === 'youtube' ? 'YouTube' : 'Spotify'} export`
      })
      .select()
      .single();

    if (insertError) {
      console.error('[export-jobs] Error creating job:', insertError);
      return NextResponse.json({ error: 'Failed to create export job' }, { status: 500 });
    }

    // Trigger processing (fire and forget - will continue in background)
    // We call the process endpoint but don't await it
    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL;
    fetch(`${baseUrl}/api/export-jobs/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id })
    }).catch(err => {
      console.log('[export-jobs] Background processing triggered (non-blocking):', err?.message || 'started');
    });

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        currentStep: job.current_step,
        createdAt: job.created_at
      },
      message: 'Export job queued. You can close this page and the export will continue in the background.'
    });
  } catch (error) {
    console.error('[export-jobs] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

