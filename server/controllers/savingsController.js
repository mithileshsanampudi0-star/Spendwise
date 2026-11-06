const SavingsGoal = require('../models/SavingsGoal');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const findOwned = require('../utils/findOwned');
const { parseDate } = require('../utils/dates');

const clean = (body, partial = false) => {
  const out = {};
  const errors = [];

  if (!partial || body.name !== undefined) {
    if (!body.name || !String(body.name).trim()) errors.push('Goal name is required');
    else out.name = String(body.name).trim();
  }
  if (!partial || body.targetAmount !== undefined) {
    const t = Number(body.targetAmount);
    if (!Number.isFinite(t) || t <= 0) errors.push('Target amount must be greater than 0');
    else out.targetAmount = t;
  }
  if (body.currentAmount !== undefined && body.currentAmount !== '') {
    const c = Number(body.currentAmount);
    if (!Number.isFinite(c) || c < 0) errors.push('Saved amount cannot be negative');
    else out.currentAmount = c;
  }
  if (body.targetDate !== undefined) {
    if (body.targetDate === '' || body.targetDate === null) out.targetDate = null;
    else {
      const d = parseDate(body.targetDate);
      if (!d) errors.push('Target date is invalid');
      else out.targetDate = d;
    }
  }
  if (body.description !== undefined) out.description = body.description;

  if (errors.length) throw new AppError(errors[0], 400, errors);
  return out;
};

exports.list = asyncHandler(async (req, res) => {
  const goals = await SavingsGoal.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: goals });
});

exports.create = asyncHandler(async (req, res) => {
  const goal = await SavingsGoal.create({ ...clean(req.body), userId: req.user._id });
  res.status(201).json({ success: true, data: goal });
});

exports.update = asyncHandler(async (req, res) => {
  const goal = await findOwned(SavingsGoal, req.params.id, req.user._id);
  goal.set(clean(req.body, true));
  await goal.save();
  res.json({ success: true, data: goal });
});

exports.remove = asyncHandler(async (req, res) => {
  const goal = await findOwned(SavingsGoal, req.params.id, req.user._id);
  await goal.deleteOne();
  res.json({ success: true, message: 'Savings goal deleted' });
});
