import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import {
  validateDeletionRequest,
  verifyPassword,
  deleteAccount,
  checkAccountAge,
} from '@/lib/services/accountDeletion';
import {
  sanitizeRequestBody,
  createErrorResponse,
  checkRateLimit,
} from '@/lib/validation/serverValidation';

export const dynamic = 'force-dynamic';

async function makeSupabase() {
  const cookieStore = await cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}

/**
 * POST /api/user/account/delete
 * Permanently delete user account and all associated data
 * 
 * Request body:
 * {
 *   password: string (required for email-based auth)
 *   confirmation_phrase: string (should be "DELETE MY ACCOUNT")
 *   reason?: string (optional feedback)
 * }
 * 
 * Returns:
 * - 200: Account deletion successful
 * - 400: Validation error (password incorrect, confirmation phrase incorrect, account too new)
 * - 401: Unauthorized
 * - 403: Account too new (less than 24 hours old)
 * - 500: Server error
 */
export async function POST(request) {
  try {
    const supabase = await makeSupabase();
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting (strict for account deletion)
    const rateLimitKey = user.id || 'anonymous';
    const rateLimit = checkRateLimit(rateLimitKey, {
      limit: 5, // 5 deletion attempts per hour
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      const resetSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        createErrorResponse(
          'Rate limit exceeded',
          429,
          {
            message: `Too many deletion requests. Please try again in ${Math.ceil(resetSeconds / 60)} minutes.`,
            retryAfter: resetSeconds,
          }
        ),
        {
          status: 429,
          headers: {
            'Retry-After': String(resetSeconds),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
          },
        }
      );
    }

    // Parse and sanitize request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        createErrorResponse('Invalid JSON in request body', 400),
        { status: 400 }
      );
    }

    // Sanitize input (preserve password field as it's needed for verification)
    const sanitizedBody = sanitizeRequestBody(body, {
      deep: true,
      preserveUrls: false,
    });

    // Validate deletion request
    const validation = validateDeletionRequest(user, sanitizedBody);
    if (!validation.valid) {
      const status = validation.hoursRemaining !== undefined ? 403 : 400;
      return NextResponse.json(
        {
          error: validation.error,
          message: validation.message,
          hoursRemaining: validation.hoursRemaining,
        },
        { status }
      );
    }

    // Verify password (for email-based authentication)
    const authProvider = user.app_metadata?.provider || 'email';
    
    if (authProvider === 'email') {
      const passwordValid = await verifyPassword(supabase, user, validation.data.password);
      if (!passwordValid) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 400 }
        );
      }
    } else {
      // For OAuth providers (Spotify, Google), password verification is not applicable
      // The user is already authenticated via OAuth
      console.log('[account deletion] OAuth user deletion:', authProvider);
    }

    // Perform account deletion using service layer
    const deletionResult = await deleteAccount(supabase, user, {
      reason: validation.data.reason,
    });

    if (!deletionResult.success) {
      return NextResponse.json(
        {
          error: 'Failed to delete account',
          message: deletionResult.error || 'An error occurred during account deletion',
        },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Account deletion initiated successfully',
      note: 'Your account and all associated data will be permanently deleted. You have been signed out.',
      deleted: deletionResult.deleted,
    });
  } catch (error) {
    console.error('[account deletion] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to delete account' },
      { status: 500 }
    );
  }
}

