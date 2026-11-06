const Budget = require('../models/Budget');
const Category = require('../models/Category');
const analytics = require('../services/analyticsService');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const findOwned = require('../utils/findOwned');
const { computeBudgetStatus } = require('../utils/budgetCalc');
const { monthRange } = require('../utils/dates');

const parseMonthYear = (src) => {
  const now = new Date();
  const month = parseInt(src.month, 10) || now.getUTCMonth() + 1;
  const year = parseInt(src.year, 10) || now.getUTCFullYear();
  if (month < 1 || month > 12) throw new AppError('Month must be between 1 and 12', 400);
  return { month, year };
};

const withStatus = (budget, spentMap) => ({
  ...budget.toObject(),
  ...computeBudgetStatus(budget.amount, spentMap.get(budget.category) || 0),
});

exports.list = asyncHandler(async (req, res) => {
  const { month, year } = parseMonthYear(req.query);
  const { start, end } = monthRange(year, month);
  const [budgets, spentMap] = await Promise.all([
    Budget.find({ userId: req.user._id, month, year }).sort({ category: 1 }),
    analytics.getSpentMap(req.user._id, start, end),
  ]);
  res.json({ success: true, data: budgets.map((b) => withStatus(b, spentMap)) });
});

exports.create = asyncHandler(async (req, res) => {
  const { category, amount } = req.body;
  const { month, year } = parseMonthYear(req.body);
  if (!category) throw new AppError('Category is required', 400);
  if (!(Number(amount) > 0)) throw new AppError('Budget amount must be greater than 0', 400);
  if (!(await Category.exists({ userId: req.user._id, name: category }))) {
    throw new AppError('Selected category does not exist', 400);
  }

  const duplicate = await Budget.exists({ userId: req.user._id, category, month, year });
  if (duplicate) throw new AppError(`A budget for ${category} already exists for this month`, 409);

  const budget = await Budget.create({ userId: req.user._id, category, amount: Number(amount), month, year });
  const { start, end } = monthRange(year, month);
  const spentMap = await analytics.getSpentMap(req.user._id, start, end);
  res.status(201).json({ success: true, data: withStatus(budget, spentMap) });
});

exports.update = asyncHandler(async (req, res) => {
  const budget = await findOwned(Budget, req.params.id, req.user._id);
  if (req.body.amount !== undefined) {
    if (!(Number(req.body.amount) > 0)) throw new AppError('Budget amount must be greater than 0', 400);
    budget.amount = Number(req.body.amount);
  }
  if (req.body.category !== undefined && req.body.category !== budget.category) {
    if (!(await Category.exists({ userId: req.user._id, name: req.body.category }))) {
      throw new AppError('Selected category does not exist', 400);
    }
    const clash = await Budget.exists({
      userId: req.user._id,
      category: req.body.category,
      month: budget.month,
      year: budget.year,
      _id: { $ne: budget._id },
    });
    if (clash) throw new AppError(`A budget for ${req.body.category} already exists for this month`, 409);
    budget.category = req.body.category;
  }
  await budget.save();
  const { start, end } = monthRange(budget.year, budget.month);
  const spentMap = await analytics.getSpentMap(req.user._id, start, end);
  res.json({ success: true, data: withStatus(budget, spentMap) });
});

exports.remove = asyncHandler(async (req, res) => {
  const budget = await findOwned(Budget, req.params.id, req.user._id);
  await budget.deleteOne();
  res.json({ success: true, message: 'Budget deleted' });
});
