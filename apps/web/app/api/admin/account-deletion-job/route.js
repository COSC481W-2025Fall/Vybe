import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deleteAccount } from '@/lib/services/accountDeletion';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/account-deletion-job
 * 
 * Scheduled job endpoint for processing pending account deletions.
 * This endpoint should be called by a cron job or scheduled task.
 * 
 * Security: Should be protected by API key or secret token in production.
 * 
 * Request headers:
 * - X-API-Key: (optional) API key for authentication
 * 
 * Returns:
 * - 200: Job completed successfully
 * - 401: Unauthorized (if API key check fails)
 * - 500: Server error
 */
export async function POST(request) {
  try {
    // TODO: Add API key authentication in production
    // const apiKey = request.headers.get('X-API-Key');
    // if (apiKey !== process.env.ACCOUNT_DELETION_JOB_API_KEY) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Create Supabase client with service role (for admin operations)
    // In production, use service role key for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Query accounts marked for deletion past grace period
    // Note: Current implementation deletes immediately, so this would need
    // a "pending_deletion" or "marked_for_deletion_at" field in the database
    // For now, we'll document this as a placeholder for when grace period is implemented

    const results = {
      processed: 0,
      deleted: 0,
      failed: 0,
      errors: [],
    };

    try {
      // TODO: Query accounts with pending_deletion_at < (now - grace_period)
      // Example query (when grace period is implemented):
      // const { data: pendingDeletions, error } = await supabase
      //   .from('users')
      //   .select('*')
      //   .not('pending_deletion_at', 'is', null)
      //   .lt('pending_deletion_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      //   .limit(100); // Process in batches

      // For now, return message about grace period requirement
      // In production with grace period, would process each account:

      /*
      for (const userRecord of pendingDeletions || []) {
        try {
          // Get full user object from auth
          const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userRecord.id);
          
          if (userError || !user) {
            results.failed++;
            results.errors.push({
              user_id: userRecord.id,
              error: 'User not found in auth',
            });
            continue;
          }

          // Send final confirmation email before deletion
          // TODO: Implement email sending
          // await sendDeletionConfirmationEmail(user.email);

          // Execute hard delete
          const deletionResult = await deleteAccount(supabase, user, {
            reason: 'Scheduled deletion after grace period',
          });

          if (deletionResult.success) {
            // Delete from auth.users using admin API
            await supabase.auth.admin.deleteUser(user.id);
            
            results.deleted++;
          } else {
            results.failed++;
            results.errors.push({
              user_id: user.id,
              error: deletionResult.error || 'Unknown error',
            });
          }

          results.processed++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            user_id: userRecord?.id || 'unknown',
            error: error.message,
          });
          console.error('[deletion job] Error processing user:', error);
        }
      }
      */

      return NextResponse.json({
        success: true,
        message: 'Account deletion job completed',
        note: 'Grace period feature not yet implemented. This job is ready for when soft delete is added.',
        results: {
          processed: results.processed,
          deleted: results.deleted,
          failed: results.failed,
          errors: results.errors,
        },
      });
    } catch (error) {
      console.error('[deletion job] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to process deletion job',
          message: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[deletion job] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/account-deletion-job
 * Health check endpoint for the deletion job
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'account-deletion-job',
    note: 'POST to this endpoint to run the deletion job',
  });
}

