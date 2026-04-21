const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

/**
 * Redis client used as the backing store for rate-limit counters.
 * Falls back gracefully to the in-memory store when REDIS_URL is not set
 * (e.g. local development without Redis).
 */
const redisClient =
  process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, {
        enableOfflineQueue: false,
        lazyConnect: true,
      })
    : null;

/**
 * Builds an express-rate-limit instance.
 *
 * @param {object} options
 * @param {number}  options.windowMs      - Rolling window in milliseconds.
 * @param {number}  options.max           - Maximum requests allowed per window.
 * @param {string}  options.keyPrefix     - Redis key prefix (used to isolate counters per endpoint).
 * @param {string}  options.message       - Human-readable error message returned to the client.
 * @param {boolean} [options.skipSuccessfulRequests=false] - When true, only failed responses count.
 * @returns {import('express').RequestHandler}
 */
function buildLimiter({
  windowMs,
  max,
  keyPrefix,
  message,
  skipSuccessfulRequests = false,
}) {
  const storeOptions = redisClient
    ? {
        store: new RedisStore({
          sendCommand: (...args) => redisClient.call(...args),
          prefix: keyPrefix,
        }),
      }
    : {}; // express-rate-limit uses its built-in memory store as fallback

  return rateLimit({
    windowMs,
    max,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.ip || req.headers['x-forwarded-for'] || 'unknown';
    },
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
    ...storeOptions,
  });
}

const loginRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyPrefix: 'rl:login:',
  message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
  skipSuccessfulRequests: true,
});

const passwordResetRateLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyPrefix: 'rl:password-reset:',
  message: 'Too many password reset requests from this IP. Please try again after 1 hour.',
  skipSuccessfulRequests: false,
});

module.exports = {
  loginRateLimiter,
  passwordResetRateLimiter,
  buildLimiter,
  _redisClient: redisClient,
};
