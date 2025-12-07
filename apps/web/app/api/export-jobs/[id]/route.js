import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

/**
 * GET /api/export-jobs/[id]
 * Get status of a specific export job
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: job, error } = await supabase
      .from('export_jobs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('[export-jobs] Error fetching job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/export-jobs/[id]
 * Cancel a pending/processing export job
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First check if job exists and belongs to user
    const { data: job, error: fetchError } = await supabase
      .from('export_jobs')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (!['pending', 'processing'].includes(job.status)) {
      return NextResponse.json({ 
        error: 'Cannot cancel job',
        message: `Job is already ${job.status}`
      }, { status: 400 });
    }

    // Update job status to cancelled
    const { error: updateError } = await supabase
      .from('export_jobs')
      .update({ 
        status: 'cancelled',
        current_step: 'Cancelled by user',
        completed_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[export-jobs] Error cancelling job:', updateError);
      return NextResponse.json({ error: 'Failed to cancel job' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Job cancelled successfully' 
    });
  } catch (error) {
    console.error('[export-jobs] Error cancelling job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

