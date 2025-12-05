import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getSystemHealth } from '@/lib/services/smartSortEngine';
import { alertCriticalError } from '@/lib/monitoring/alerting';

/**
 * GET /api/health
 * Health check endpoint for monitoring
 */
export async function GET(request) {
  const startTime = Date.now();
  const checks = {
    database: { status: 'unknown', latency: null },
    sortEngine: { status: 'unknown', details: null },
    openai: { status: 'unknown' },
  };

  // Check database connection
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const dbStart = Date.now();
    const { error } = await supabase.from('users').select('id').limit(1);
    checks.database.latency = Date.now() - dbStart;
    
    if (error) {
      checks.database.status = 'unhealthy';
      checks.database.error = error.message;
    } else {
      checks.database.status = 'healthy';
    }
  } catch (error) {
    checks.database.status = 'unhealthy';
    checks.database.error = error.message;
    
    // Send critical alert for database issues
    alertCriticalError(error, { component: 'database' }).catch(() => {});
  }

  // Check sort engine
  try {
    const sortHealth = getSystemHealth();
    checks.sortEngine.status = sortHealth.overall;
    checks.sortEngine.details = {
      score: sortHealth.score,
      queue: sortHealth.queue,
      capabilities: sortHealth.capabilities,
    };
  } catch (error) {
    checks.sortEngine.status = 'unhealthy';
    checks.sortEngine.error = error.message;
  }

  // Check OpenAI availability
  checks.openai.status = process.env.OPENAI_API_KEY ? 'configured' : 'not_configured';

  // Calculate overall health
  const isHealthy = 
    checks.database.status === 'healthy' &&
    checks.sortEngine.status !== 'unhealthy';

  const overallStatus = isHealthy ? 'healthy' : 
    checks.database.status !== 'healthy' ? 'critical' : 'degraded';

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime ? Math.round(process.uptime()) : null,
    responseTime: Date.now() - startTime,
    checks,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  // Set appropriate status code
  const statusCode = overallStatus === 'healthy' ? 200 : 
    overallStatus === 'critical' ? 503 : 200;

  return NextResponse.json(response, { 
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Status': overallStatus,
    },
  });
}

