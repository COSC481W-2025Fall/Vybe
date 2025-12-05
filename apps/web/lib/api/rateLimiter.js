/**
 * Rate Limiter - Protect API routes from abuse
 * 
 * Features:
 * - Per-user rate limiting
 * - Sliding window algorithm
 * - Configurable limits per route
 * - Memory-efficient using LRU-style cleanup
 */

// In-memory rate limit storage
// In production, use Redis for distributed rate limiting
const rateLimitStore = new Map();

// Clean up old entries every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
      if (now - data.lastRequest > 60000) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000);
}

/**
 * Rate limit configuration by route pattern
 */
const RATE_LIMITS = {
  // Smart sort - expensive operation
  '/api/groups/*/smart-sort': {
    windowMs: 60000,      // 1 minute window
    maxRequests: 3,       // 3 requests per minute
    message: "You've sorted a few times recently. Please wait a moment before trying again.",
  },
  // Export operations - moderate
  '/api/export/*': {
    windowMs: 60000,
    maxRequests: 10,
    message: "You've exported several playlists. Please wait a moment before trying again.",
  },
  // Default - generous
  default: {
    windowMs: 60000,
    maxRequests: 100,
    message: "Slow down! You're making too many requests. Please wait a moment.",
  },
};

/**
 * Get rate limit config for a route
 */
function getConfig(path) {
  for (const [pattern, config] of Object.entries(RATE_LIMITS)) {
    if (pattern === 'default') continue;
    
    // Convert pattern to regex
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '[^/]+') + '$'
    );
    
    if (regex.test(path)) {
      return config;
    }
  }
  return RATE_LIMITS.default;
}

/**
 * Check if request should be rate limited
 * 
 * @param {string} identifier - User ID or IP address
 * @param {string} path - API route path
 * @returns {{ allowed: boolean, remaining: number, resetIn: number, message?: string }}
 */
export function checkRateLimit(identifier, path) {
  const config = getConfig(path);
  const key = `${identifier}:${path}`;
  const now = Date.now();

  let data = rateLimitStore.get(key);

  if (!data) {
    data = {
      requests: [],
      lastRequest: now,
    };
    rateLimitStore.set(key, data);
  }

  // Remove requests outside the window
  const windowStart = now - config.windowMs;
  data.requests = data.requests.filter(time => time > windowStart);
  data.lastRequest = now;

  // Check if limit exceeded
  if (data.requests.length >= config.maxRequests) {
    const oldestRequest = data.requests[0];
    const resetIn = Math.ceil((oldestRequest + config.windowMs - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetIn,
      message: config.message,
    };
  }

  // Add this request
  data.requests.push(now);

  return {
    allowed: true,
    remaining: config.maxRequests - data.requests.length,
    resetIn: Math.ceil(config.windowMs / 1000),
  };
}

/**
 * Express/Next.js middleware-style rate limiter
 */
export function rateLimitMiddleware(identifier, path) {
  const result = checkRateLimit(identifier, path);

  if (!result.allowed) {
    return {
      status: 429,
      headers: {
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetIn.toString(),
        'Retry-After': result.resetIn.toString(),
      },
      body: {
        error: result.message,
        code: 'RATE_LIMITED',
        retryAfter: result.resetIn,
      },
    };
  }

  return {
    status: 200,
    headers: {
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetIn.toString(),
    },
  };
}

/**
 * Reset rate limit for a specific identifier and path
 */
export function resetRateLimit(identifier, path) {
  const key = `${identifier}:${path}`;
  rateLimitStore.delete(key);
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(identifier, path) {
  const config = getConfig(path);
  const key = `${identifier}:${path}`;
  const now = Date.now();

  const data = rateLimitStore.get(key);
  if (!data) {
    return {
      remaining: config.maxRequests,
      limit: config.maxRequests,
      resetIn: config.windowMs / 1000,
    };
  }

  const windowStart = now - config.windowMs;
  const validRequests = data.requests.filter(time => time > windowStart);

  return {
    remaining: Math.max(0, config.maxRequests - validRequests.length),
    limit: config.maxRequests,
    used: validRequests.length,
    resetIn: Math.ceil(config.windowMs / 1000),
  };
}

