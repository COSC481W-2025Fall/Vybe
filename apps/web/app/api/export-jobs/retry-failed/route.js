import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy initialization of supabase admin client
let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return _supabaseAdmin;
}

/**
 * POST /api/export-jobs/retry-failed
 * 
 * Daily cron job to retry failed export jobs.
 * - Only retries jobs that failed more than 24 hours ago
 * - Checks if the external playlist already exists before retrying
 * - Respects max_daily_retries limit (default: 7 days)
 * 
 * Can be called by:
 * - Vercel Cron (vercel.json)
 * - GitHub Actions
 * - Any external scheduler
 * 
 * Optional: Pass a secret header for security
 * Header: x-cron-secret: <your-secret>
 */
export async function POST(request) {
  try {
    // Optional: Verify cron secret for security
    const cronSecret = request.headers.get('x-cron-secret');
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find failed jobs that:
    // 1. Failed at least 24 hours ago
    // 2. Haven't been retried today (or never retried)
    // 3. Haven't exceeded max daily retries
    const { data: failedJobs, error: fetchError } = await supabase
      .from('export_jobs')
      .select('*')
      .eq('status', 'failed')
      .lt('completed_at', oneDayAgo.toISOString())
      .or(`last_daily_retry_at.is.null,last_daily_retry_at.lt.${oneDayAgo.toISOString()}`)
      .lt('daily_retry_count', 7) // Default max, will check per-job below
      .order('completed_at', { ascending: true })
      .limit(10); // Process up to 10 jobs per cron run to avoid timeouts

    if (fetchError) {
      console.error('[retry-failed] Error fetching failed jobs:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    if (!failedJobs || failedJobs.length === 0) {
      return NextResponse.json({ 
        message: 'No failed jobs to retry',
        processed: 0
      });
    }

    const results = {
      processed: 0,
      requeued: 0,
      skipped: 0,
      alreadyFulfilled: 0,
      maxRetriesExceeded: 0,
      errors: []
    };

    for (const job of failedJobs) {
      try {
        // Check if max daily retries exceeded
        const maxRetries = job.max_daily_retries || 7;
        if (job.daily_retry_count >= maxRetries) {
          results.maxRetriesExceeded++;
          results.processed++;
          
          // Mark as permanently failed
          await supabase
            .from('export_jobs')
            .update({
              status: 'cancelled',
              current_step: `Gave up after ${maxRetries} daily retry attempts`,
              error_message: `Max daily retries (${maxRetries}) exceeded. Original error: ${job.error_message}`
            })
            .eq('id', job.id);
          
          continue;
        }

        // Check if the playlist was already created (user might have retried manually)
        if (job.external_playlist_id) {
          const isValid = await checkPlaylistExists(job.platform, job.external_playlist_id, job.user_id, supabase);
          
          if (isValid) {
            // Playlist already exists - mark as completed
            results.alreadyFulfilled++;
            results.processed++;
            
            await supabase
              .from('export_jobs')
              .update({
                status: 'completed',
                current_step: 'Playlist already exists (verified on retry)',
                completed_at: now.toISOString()
              })
              .eq('id', job.id);
            
            continue;
          }
        }

        // Reset job for retry
        await supabase
          .from('export_jobs')
          .update({
            status: 'pending',
            progress: 0,
            current_step: `Queued for daily retry (attempt ${job.daily_retry_count + 1}/${maxRetries})`,
            retry_count: 0,
            daily_retry_count: job.daily_retry_count + 1,
            last_daily_retry_at: now.toISOString(),
            error_message: null,
            external_playlist_id: null,
            external_playlist_url: null
          })
          .eq('id', job.id);

        // Trigger processing
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin');
        if (baseUrl) {
          fetch(`${baseUrl}/api/export-jobs/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: job.id })
          }).catch(() => {
            // Fire and forget
          });
        }

        results.requeued++;
        results.processed++;

      } catch (err) {
        console.error(`[retry-failed] Error processing job ${job.id}:`, err);
        results.errors.push({ jobId: job.id, error: err.message });
        results.processed++;
      }
    }

    console.log('[retry-failed] Daily retry completed:', results);

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} failed jobs`,
      results
    });

  } catch (error) {
    console.error('[retry-failed] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Check if a playlist already exists on the platform
 */
async function checkPlaylistExists(platform, playlistId, userId, supabase) {
  try {
    if (platform === 'spotify') {
      // Get user's Spotify token
      const { getValidAccessToken } = await import('@/lib/spotify');
      const accessToken = await getValidAccessToken(supabase, userId);
      
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      return response.ok;
    } else if (platform === 'youtube') {
      // Get user's YouTube token
      const { getValidAccessToken } = await import('@/lib/youtube');
      const accessToken = await getValidAccessToken(supabase, userId);
      
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?part=id&id=${playlistId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      if (!response.ok) return false;
      const data = await response.json();
      return data.items && data.items.length > 0;
    }
    
    return false;
  } catch (err) {
    console.error(`[retry-failed] Error checking playlist ${playlistId}:`, err);
    return false; // Assume doesn't exist on error, will retry
  }
}

/**
 * GET /api/export-jobs/retry-failed
 * Health check / status endpoint
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Count jobs eligible for retry
    const { count: eligibleCount } = await supabase
      .from('export_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .lt('completed_at', oneDayAgo.toISOString())
      .or(`last_daily_retry_at.is.null,last_daily_retry_at.lt.${oneDayAgo.toISOString()}`)
      .lt('daily_retry_count', 7);

    // Count total failed jobs
    const { count: totalFailed } = await supabase
      .from('export_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed');

    return NextResponse.json({
      status: 'ok',
      eligibleForRetry: eligibleCount || 0,
      totalFailed: totalFailed || 0,
      nextRetryWindow: 'Jobs failed >24h ago with <7 daily retries'
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}

