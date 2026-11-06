const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'sw_token';
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const cookieOptions = () => ({
  httpOnly: true, // not readable from JavaScript, so an XSS bug cannot steal the session
  sameSite: process.env.COOKIE_SAMESITE || 'lax',
  secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
  maxAge: MAX_AGE_MS,
  path: '/',
});

const setAuthCookie = (res, userId) => res.cookie(COOKIE_NAME, signToken(userId), cookieOptions());
const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });

module.exports = { COOKIE_NAME, signToken, setAuthCookie, clearAuthCookie };
