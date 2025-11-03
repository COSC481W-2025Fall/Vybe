# Scheduled Account Deletion Job Setup Guide (Task 5.6)

This document outlines how to set up and configure the scheduled account deletion job for processing pending account deletions after their grace period.

**Status:** ✅ Setup Documentation Ready  
**Task:** Task 5.6  
**Files:**
- `apps/web/app/api/admin/account-deletion-job/route.js` - API endpoint
- `apps/web/lib/jobs/accountDeletionJob.js` - Job logic

---

## Overview

The scheduled deletion job processes accounts that have been marked for deletion and have passed their grace period (typically 7 days). This provides users with a window to recover their accounts before permanent deletion.

**Note:** The current implementation deletes accounts immediately. This job is structured and ready for when a grace period feature is implemented.

---

## Architecture Options

### Option 1: Vercel Cron Jobs (Recommended for Vercel deployments)

If your Next.js app is deployed on Vercel, you can use Vercel Cron Jobs:

#### Setup Steps:

1. **Create `vercel.json` in project root:**

```json
{
  "crons": [
    {
      "path": "/api/admin/account-deletion-job",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Schedule:** `0 2 * * *` means "run daily at 2 AM UTC"

2. **Add API Key Authentication:**

Update the API endpoint to require authentication:

```javascript
// In route.js
const apiKey = request.headers.get('X-API-Key');
if (apiKey !== process.env.ACCOUNT_DELETION_JOB_API_KEY) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

3. **Set Environment Variable:**

In Vercel dashboard:
- `ACCOUNT_DELETION_JOB_API_KEY` - Secret API key for authentication

4. **Configure Cron Job:**

Vercel will automatically set up the cron job when `vercel.json` is present.

---

### Option 2: Supabase Edge Functions with pg_cron

If using Supabase, you can use pg_cron to schedule database functions:

#### Setup Steps:

1. **Enable pg_cron extension:**

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

2. **Create database function:**

```sql
CREATE OR REPLACE FUNCTION process_pending_account_deletions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- This would call your deletion logic
  -- For now, it's a placeholder
  RAISE NOTICE 'Deletion job would run here';
END;
$$;
```

3. **Schedule the function:**

```sql
SELECT cron.schedule(
  'process-account-deletions',  -- Job name
  '0 2 * * *',                  -- Daily at 2 AM UTC
  'SELECT process_pending_account_deletions();'
);
```

4. **Verify schedule:**

```sql
SELECT * FROM cron.job;
```

---

### Option 3: External Cron Service

Use an external service like:
- **GitHub Actions** (with schedule)
- **Cron-job.org**
- **EasyCron**
- **AWS EventBridge**
- **Google Cloud Scheduler**

#### Setup Example (Cron-job.org):

1. Create account on cron-job.org
2. Set URL: `https://yourdomain.com/api/admin/account-deletion-job`
3. Set schedule: Daily at 2 AM
4. Set method: POST
5. Add header: `X-API-Key: your-secret-key`

---

### Option 4: Next.js API Route with External Scheduler

Create an API route that can be called by any scheduler:

```javascript
// apps/web/app/api/admin/account-deletion-job/route.js
// (Already created)
```

Then configure your preferred scheduler to call this endpoint.

---

## Database Schema Requirements

### For Grace Period Feature

To implement a grace period, you'll need to add a column to track pending deletions:

```sql
-- Add column to users table (or create separate table)
ALTER TABLE users
ADD COLUMN pending_deletion_at TIMESTAMP WITH TIME ZONE;

-- Or create separate table
CREATE TABLE IF NOT EXISTS pending_account_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marked_for_deletion_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,
  grace_period_days INTEGER DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_pending_deletions_marked_at
ON pending_account_deletions(marked_for_deletion_at);
```

---

## Job Implementation

### Current Status

The job structure is ready but requires:
1. Grace period feature implementation (soft delete)
2. `pending_deletion_at` or `marked_for_deletion_at` column
3. Email service for final warnings

### Job Logic

The job will:
1. Query accounts with `pending_deletion_at < (now - grace_period)`
2. For each account:
   - Send final confirmation email (optional)
   - Execute hard delete using `deleteAccount()` service
   - Delete from `auth.users` using admin API
   - Log deletion to audit table
3. Return results (processed, deleted, failed)

### Retry Logic

For failed deletions:
- Log errors to audit table
- Can be retried on next run
- Manual intervention may be needed for persistent failures

---

## Security Considerations

### API Key Protection

**Required for Production:**

1. **Environment Variable:**
   ```bash
   ACCOUNT_DELETION_JOB_API_KEY=your-secret-key-here
   ```

2. **API Route Protection:**
   ```javascript
   const apiKey = request.headers.get('X-API-Key');
   if (apiKey !== process.env.ACCOUNT_DELETION_JOB_API_KEY) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }
   ```

### Service Role Key

**Required for Admin Operations:**

1. **Supabase Service Role Key:**
   - Stored securely in environment variables
   - Never exposed to client
   - Used only in server-side code

2. **Access Control:**
   - Only scheduled job should have access
   - Log all job executions
   - Monitor for unauthorized access

---

## Job Execution Flow

```
1. Scheduler triggers job (daily at 2 AM)
   ↓
2. Job authenticates (API key check)
   ↓
3. Query accounts pending deletion (past grace period)
   ↓
4. For each account:
   a. Send final email (optional)
   b. Execute hard delete
   c. Delete from auth.users
   d. Log to audit table
   ↓
5. Return results summary
```

---

## Monitoring and Logging

### Audit Logging

All deletions are logged to `account_deletion_log` table:

```sql
SELECT * FROM account_deletion_log
WHERE deletion_method = 'scheduled_job'
ORDER BY created_at DESC;
```

### Job Execution Logging

Log job executions:

```javascript
// Log job start/end times
// Track success/failure rates
// Monitor processing times
```

### Alerts

Set up alerts for:
- High failure rates
- Job execution failures
- Unusual deletion patterns

---

## Testing

### Manual Testing

Test the job endpoint manually:

```bash
curl -X POST https://yourdomain.com/api/admin/account-deletion-job \
  -H "X-API-Key: your-secret-key" \
  -H "Content-Type: application/json"
```

### Health Check

Check job status:

```bash
curl https://yourdomain.com/api/admin/account-deletion-job
```

---

## Configuration

### Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
- `ACCOUNT_DELETION_JOB_API_KEY` - Secret key for job authentication (optional but recommended)

Optional:
- `GRACE_PERIOD_DAYS` - Default grace period in days (default: 7)
- `DELETION_JOB_BATCH_SIZE` - Accounts to process per run (default: 100)

### Schedule Configuration

**Recommended:** Daily at 2 AM UTC (low traffic time)

**Common Schedules:**
- Daily: `0 2 * * *` (2 AM UTC daily)
- Twice daily: `0 2,14 * * *` (2 AM and 2 PM UTC)
- Every 12 hours: `0 */12 * * *`

---

## Error Handling

### Graceful Failures

- Individual account failures don't stop the job
- Errors are logged for each account
- Job continues processing remaining accounts

### Retry Logic

Failed deletions can be:
- Retried on next run
- Manually processed if needed
- Investigated if persistent

---

## Compliance

### GDPR Requirements

- Log all deletions for compliance
- Provide audit trail
- Document deletion process
- Maintain records per retention policy

### Data Retention

- Audit logs should be retained per policy
- Deletion records for compliance
- Monitoring data for operations

---

## Production Checklist

Before deploying to production:

- [ ] API key authentication enabled
- [ ] Service role key configured
- [ ] Grace period feature implemented
- [ ] Email service configured
- [ ] Cron job scheduled
- [ ] Monitoring set up
- [ ] Alerts configured
- [ ] Audit logging verified
- [ ] Error handling tested
- [ ] Rate limiting considered
- [ ] Documentation updated

---

## Notes

1. **Current Implementation:** Accounts are deleted immediately. This job is ready for when grace period is implemented.

2. **Grace Period:** To implement grace period:
   - Add `pending_deletion_at` column to users table
   - Update deletion API to mark for deletion instead of deleting immediately
   - Update job to process marked accounts

3. **Email Service:** Final confirmation emails require email service integration.

4. **Monitoring:** Set up proper monitoring for job execution and failures.

5. **Testing:** Test thoroughly in staging before production deployment.

---

**Created:** Task 5.6  
**Last Updated:** [Current Date]  
**Status:** Ready for Implementation (requires grace period feature)

