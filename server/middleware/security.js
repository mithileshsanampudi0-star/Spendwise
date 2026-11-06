const rateLimit = require('express-rate-limit');

// Disabled under NODE_ENV=test unless a test explicitly opts in with RATE_LIMIT_TEST=1.
const enabled = () => process.env.NODE_ENV !== 'test' || process.env.RATE_LIMIT_TEST === '1';

const make = (windowMs, limit, message, extra = {}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => !enabled(),
    message: { success: false, message },
    ...extra,
  });

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

module.exports = {
  apiLimiter: make(MIN, 600, 'Too many requests. Please slow down.'),
  loginLimiter: make(15 * MIN, 10, 'Too many login attempts. Try again in 15 minutes.', { skipSuccessfulRequests: true }),
  registerLimiter: make(HOUR, 15, 'Too many sign-ups from this network. Try again later.'),
  demoLimiter: make(HOUR, 20, 'Too many demo sessions from this network. Try again later.'),
  forgotLimiter: make(HOUR, 5, 'Too many reset requests. Try again later.'),
};
