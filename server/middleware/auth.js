const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { COOKIE_NAME } = require('../utils/cookies');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Authenticates from the httpOnly session cookie (or an Authorization: Bearer header for API clients).
 * Cookie-authenticated requests that change data must carry `X-Requested-With: SpendWise`; a
 * cross-site form or script cannot add that header, which blocks CSRF on top of SameSite cookies.
 */
const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = bearer || req.cookies?.[COOKIE_NAME];
  if (!token) throw new AppError('Authentication required', 401);

  if (!bearer && !SAFE_METHODS.has(req.method) && req.headers['x-requested-with'] !== 'SpendWise') {
    throw new AppError('Missing CSRF protection header', 403);
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select('+passwordChangedAt');
  if (!user) throw new AppError('User no longer exists', 401);
  if (user.passwordChangedAt && decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    throw new AppError('Password was changed. Please log in again.', 401);
  }
  if (user.isDemo && user.demoExpiresAt && user.demoExpiresAt < new Date()) {
    throw new AppError('This demo session has expired.', 401);
  }

  req.user = user;
  req.tokenPayload = decoded;
  next();
});

module.exports = { protect };
