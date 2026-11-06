const { generateInsights } = require('../services/insightsService');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

exports.get = asyncHandler(async (req, res) => {
  const now = new Date();
  const match = /^(\d{4})-(\d{2})$/.exec(req.query.month || '');
  const year = match ? Number(match[1]) : now.getUTCFullYear();
  const month = match ? Number(match[2]) : now.getUTCMonth() + 1;
  if (month < 1 || month > 12) throw new AppError('Month must be YYYY-MM', 400);

  const data = await generateInsights(req.user._id, year, month);
  res.json({ success: true, data });
});
