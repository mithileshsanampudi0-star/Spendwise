const crypto = require('crypto');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { setAuthCookie, clearAuthCookie } = require('../utils/cookies');
const { createDefaultCategories } = require('../services/userService');
const { createDemoUser } = require('../services/demoService');
const { sendPasswordReset } = require('../services/emailService');

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const str = (v) => (typeof v === 'string' ? v : '');
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();

exports.register = asyncHandler(async (req, res) => {
  const name = str(req.body.name);
  const email = str(req.body.email);
  const password = str(req.body.password);
  const currency = str(req.body.currency) || 'INR';
  const errors = [];
  if (name.trim().length < 2) errors.push('Name must be at least 2 characters');
  if (!EMAIL_RE.test(email)) errors.push('A valid email is required');
  if (password.length < 6) errors.push('Password must be at least 6 characters');
  if (errors.length) throw new AppError(errors[0], 400, errors);

  if (await User.findOne({ email: email.toLowerCase().trim() })) throw new AppError('An account with this email already exists', 409);

  const user = await User.create({ name, email, password, currency });
  await createDefaultCategories(user._id);
  setAuthCookie(res, user._id);
  res.status(201).json({ success: true, data: { user } });
});

exports.login = asyncHandler(async (req, res) => {
  const email = str(req.body.email);
  const password = str(req.body.password);
  if (!email || !password) throw new AppError('Email and password are required', 400);

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw new AppError('Invalid email or password', 401);

  setAuthCookie(res, user._id);
  res.json({ success: true, data: { user } });
});

/** One-click demo: a private account pre-filled with clearly labelled sample data. */
exports.demo = asyncHandler(async (_req, res) => {
  const user = await createDemoUser();
  setAuthCookie(res, user._id);
  res.status(201).json({ success: true, data: { user } });
});

exports.me = asyncHandler(async (req, res) => {
  // Sliding session: refresh the cookie when fewer than 3 days remain.
  if (req.tokenPayload.exp * 1000 - Date.now() < 3 * 86400000) setAuthCookie(res, req.user._id);
  res.json({ success: true, data: { user: req.user } });
});

exports.logout = (_req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out' });
};

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, currency } = req.body;
  if (name !== undefined) {
    if (str(name).trim().length < 2) throw new AppError('Name must be at least 2 characters', 400);
    req.user.name = name;
  }
  if (currency !== undefined) {
    if (!/^[A-Za-z]{3}$/.test(str(currency))) throw new AppError('Currency must be a 3-letter code', 400);
    req.user.currency = currency;
  }
  await req.user.save();
  res.json({ success: true, data: { user: req.user } });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const currentPassword = str(req.body.currentPassword);
  const newPassword = str(req.body.newPassword);
  if (!currentPassword || !newPassword) throw new AppError('Current and new password are required', 400);
  if (newPassword.length < 6) throw new AppError('New password must be at least 6 characters', 400);

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) throw new AppError('Current password is incorrect', 401);

  user.password = newPassword;
  user.passwordChangedAt = new Date(); // signs out every other session
  await user.save();
  setAuthCookie(res, user._id);
  res.json({ success: true, message: 'Password updated' });
});

/** Always answers the same way so the endpoint cannot be used to discover which emails have accounts. */
exports.forgot = asyncHandler(async (req, res) => {
  const email = str(req.body.email).toLowerCase().trim();
  if (!EMAIL_RE.test(email)) throw new AppError('A valid email is required', 400);

  const payload = { success: true, message: 'If an account exists for that email, a reset link has been sent.' };
  const user = await User.findOne({ email });
  if (user && !user.isDemo) {
    const token = crypto.randomBytes(32).toString('hex');
    await User.updateOne({ _id: user._id }, { resetTokenHash: sha256(token), resetTokenExpires: new Date(Date.now() + 30 * 60 * 1000) });
    const link = `${clientUrl()}/reset-password?token=${token}`;
    const { sent } = await sendPasswordReset(user.email, link);
    // Without SMTP, development builds return the link so the flow can be tried end to end.
    if (!sent && process.env.NODE_ENV !== 'production') payload.devResetLink = link;
  }
  res.json(payload);
});

exports.reset = asyncHandler(async (req, res) => {
  const token = str(req.body.token);
  const password = str(req.body.password);
  if (!token) throw new AppError('Reset token is required', 400);
  if (password.length < 6) throw new AppError('Password must be at least 6 characters', 400);

  const user = await User.findOne({ resetTokenHash: sha256(token), resetTokenExpires: { $gt: new Date() } }).select('+password');
  if (!user) throw new AppError('This reset link is invalid or has expired', 400);

  user.password = password;
  user.passwordChangedAt = new Date();
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();
  res.json({ success: true, message: 'Password updated. You can log in now.' });
});
