/**
 * Alerting System - Send critical alerts to team email
 * 
 * Alert types:
 * - CRITICAL: System down, major crash
 * - ERROR: Component failure, API errors
 * - WARNING: Performance degradation, high load
 */

// Team email for alerts - stored server-side only
const ALERT_EMAIL = 'teamvybe25@gmail.com';

// Alert levels
export const AlertLevel = {
  CRITICAL: 'critical',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Track sent alerts to prevent spam (dedupe by key)
const sentAlerts = new Map();
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between duplicate alerts

/**
 * Send an alert to the team
 */
export async function sendAlert({
  level = AlertLevel.ERROR,
  title,
  message,
  details = {},
  dedupeKey = null,
}) {
  const key = dedupeKey || `${level}-${title}`;
  
  // Check cooldown to prevent spam
  const lastSent = sentAlerts.get(key);
  if (lastSent && Date.now() - lastSent < ALERT_COOLDOWN_MS) {
    console.log(`[Alerting] Skipping duplicate alert: ${key}`);
    return false;
  }

  // Mark as sent
  sentAlerts.set(key, Date.now());

  const levelEmoji = {
    [AlertLevel.CRITICAL]: '🚨',
    [AlertLevel.ERROR]: '❌',
    [AlertLevel.WARNING]: '⚠️',
    [AlertLevel.INFO]: 'ℹ️',
  };

  const subject = `${levelEmoji[level]} [Vybe ${level.toUpperCase()}] ${title}`;
  
  const body = `
${levelEmoji[level]} VYBE ALERT - ${level.toUpperCase()}
${'═'.repeat(50)}

${title}

${'─'.repeat(50)}

${message}

${Object.keys(details).length > 0 ? `
${'─'.repeat(50)}
DETAILS:

${Object.entries(details).map(([k, v]) => `${k}: ${JSON.stringify(v, null, 2)}`).join('\n')}
` : ''}

${'─'.repeat(50)}
Time: ${new Date().toISOString()}
Environment: ${process.env.NODE_ENV || 'development'}
${'═'.repeat(50)}
  `.trim();

  console.log(`[Alerting] Sending ${level} alert: ${title}`);

  // Try to send email
  const sent = await sendAlertEmail(subject, body);
  
  if (!sent) {
    // At minimum, log to console
    console.error('[Alerting] Failed to send email, logging alert:');
    console.error(body);
  }

  return sent;
}

/**
 * Send alert email
 */
async function sendAlertEmail(subject, body) {
  // Try Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Vybe Alerts <alerts@vybe.app>',
          to: [ALERT_EMAIL],
          subject,
          text: body,
        }),
      });

      if (response.ok) {
        console.log('[Alerting] Alert email sent via Resend');
        return true;
      }
    } catch (error) {
      console.error('[Alerting] Resend error:', error);
    }
  }

  // Try SendGrid
  if (process.env.SENDGRID_API_KEY) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: ALERT_EMAIL }] }],
          from: { email: 'alerts@vybe.app', name: 'Vybe Alerts' },
          subject,
          content: [{ type: 'text/plain', value: body }],
        }),
      });

      if (response.ok || response.status === 202) {
        console.log('[Alerting] Alert email sent via SendGrid');
        return true;
      }
    } catch (error) {
      console.error('[Alerting] SendGrid error:', error);
    }
  }

  return false;
}

// ═══════════════════════════════════════════════════════════
// PRE-DEFINED ALERT FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Alert: Smart Sort system overloaded
 */
export async function alertSortSystemOverload(queueStatus) {
  return sendAlert({
    level: AlertLevel.WARNING,
    title: 'Smart Sort System High Load',
    message: 'The smart sort queue is experiencing high demand. Users may experience delays.',
    details: queueStatus,
    dedupeKey: 'sort-overload',
  });
}

/**
 * Alert: Smart Sort system in stress mode
 */
export async function alertSortSystemStress(queueStatus) {
  return sendAlert({
    level: AlertLevel.ERROR,
    title: 'Smart Sort System Stress Mode',
    message: 'Smart sort has entered stress mode due to slow AI responses. Falling back to heuristic sorting.',
    details: queueStatus,
    dedupeKey: 'sort-stress',
  });
}

/**
 * Alert: API rate limit exceeded
 */
export async function alertRateLimitExceeded(userId, endpoint) {
  return sendAlert({
    level: AlertLevel.WARNING,
    title: 'Rate Limit Exceeded',
    message: `User ${userId} exceeded rate limit on ${endpoint}`,
    details: { userId, endpoint },
    dedupeKey: `rate-limit-${userId}`,
  });
}

/**
 * Alert: Database connection issue
 */
export async function alertDatabaseIssue(error) {
  return sendAlert({
    level: AlertLevel.CRITICAL,
    title: 'Database Connection Issue',
    message: 'Failed to connect to Supabase database. Users may not be able to load data.',
    details: { error: error.message },
    dedupeKey: 'db-connection',
  });
}

/**
 * Alert: OpenAI API issue
 */
export async function alertOpenAIIssue(error) {
  return sendAlert({
    level: AlertLevel.ERROR,
    title: 'OpenAI API Issue',
    message: 'OpenAI API is experiencing issues. Smart sort will use heuristic fallback.',
    details: { error: error.message },
    dedupeKey: 'openai-issue',
  });
}

/**
 * Alert: Critical server error
 */
export async function alertCriticalError(error, context = {}) {
  return sendAlert({
    level: AlertLevel.CRITICAL,
    title: 'Critical Server Error',
    message: `A critical error occurred: ${error.message}`,
    details: {
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      ...context,
    },
    dedupeKey: `critical-${error.message?.substring(0, 50)}`,
  });
}

/**
 * Alert: High error rate detected
 */
export async function alertHighErrorRate(errorRate, timeWindow) {
  return sendAlert({
    level: AlertLevel.ERROR,
    title: 'High Error Rate Detected',
    message: `Error rate is at ${errorRate}% over the last ${timeWindow}. Investigating recommended.`,
    details: { errorRate, timeWindow },
    dedupeKey: 'high-error-rate',
  });
}

// ═══════════════════════════════════════════════════════════
// HEALTH CHECK & AUTO-ALERTING
// ═══════════════════════════════════════════════════════════

let healthCheckInterval = null;

/**
 * Start periodic health checks with alerting
 */
export function startHealthMonitoring(options = {}) {
  const {
    interval = 60000, // Check every minute
    getQueueStatus,   // Function to get queue status
    getErrorRate,     // Function to get error rate
  } = options;

  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  healthCheckInterval = setInterval(async () => {
    try {
      // Check queue status
      if (getQueueStatus) {
        const status = getQueueStatus();
        
        if (status.isUnderStress) {
          await alertSortSystemStress(status);
        } else if (status.queued > 50) {
          await alertSortSystemOverload(status);
        }
      }

      // Check error rate
      if (getErrorRate) {
        const { rate, window } = getErrorRate();
        if (rate > 10) { // More than 10% errors
          await alertHighErrorRate(rate, window);
        }
      }
    } catch (error) {
      console.error('[Alerting] Health check failed:', error);
    }
  }, interval);

  console.log('[Alerting] Health monitoring started');
}

/**
 * Stop health monitoring
 */
export function stopHealthMonitoring() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    console.log('[Alerting] Health monitoring stopped');
  }
}

