const Category = require('../models/Category');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const Recurring = require('../models/Recurring');
const analytics = require('../services/analyticsService');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const findOwned = require('../utils/findOwned');
const { buildRange, parseDate } = require('../utils/dates');

const HEX = /^#[0-9a-fA-F]{6}$/;
const FALLBACK_CATEGORY = 'Other';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Lists categories with total spending. Without from/to the totals cover all time. */
exports.list = asyncHandler(async (req, res) => {
  const categories = await Category.find({ userId: req.user._id }).sort({ isDefault: -1, name: 1 });
  const range = buildRange(req.query.from, req.query.to);
  const start = range?.start || parseDate('1970-01-01');
  const end = range?.end || new Date('2100-01-01T00:00:00.000Z');
  const totals = await analytics.getCategoryTotals(req.user._id, start, end);

  const data = categories.map((c) => {
    const t = totals.find((x) => x.category === c.name);
    return { ...c.toObject(), total: t?.total || 0, count: t?.count || 0, percentage: t?.percentage || 0 };
  });
  res.json({ success: true, data });
});

exports.create = asyncHandler(async (req, res) => {
  const { name, color, icon } = req.body;
  if (!name || !name.trim()) throw new AppError('Category name is required', 400);
  if (color && !HEX.test(color)) throw new AppError('Color must be a hex value like #4CC9F0', 400);

  const clash = await Category.exists({
    userId: req.user._id,
    name: new RegExp(`^${escapeRegex(name.trim())}$`, 'i'),
  });
  if (clash) throw new AppError('A category with this name already exists', 409);

  const category = await Category.create({
    userId: req.user._id,
    name: name.trim(),
    color: color || undefined,
    icon: icon || undefined,
    isDefault: false,
  });
  res.status(201).json({ success: true, data: category });
});

exports.update = asyncHandler(async (req, res) => {
  const category = await findOwned(Category, req.params.id, req.user._id);
  const { name, color, icon } = req.body;

  if (color !== undefined) {
    if (!HEX.test(color)) throw new AppError('Color must be a hex value like #4CC9F0', 400);
    category.color = color;
  }
  if (icon !== undefined) category.icon = icon;

  const oldName = category.name;
  if (name !== undefined && name.trim() !== oldName) {
    if (category.isDefault) throw new AppError('Default category names cannot be changed', 403);
    if (!name.trim()) throw new AppError('Category name is required', 400);
    const clash = await Category.exists({
      userId: req.user._id,
      name: new RegExp(`^${escapeRegex(name.trim())}$`, 'i'),
      _id: { $ne: category._id },
    });
    if (clash) throw new AppError('A category with this name already exists', 409);
    category.name = name.trim();
  }

  await category.save();

  if (category.name !== oldName) {
    await Promise.all([
      Expense.updateMany({ userId: req.user._id, category: oldName }, { category: category.name }),
      Budget.updateMany({ userId: req.user._id, category: oldName }, { category: category.name }),
      Recurring.updateMany({ userId: req.user._id, type: 'expense', category: oldName }, { category: category.name }),
    ]);
  }
  res.json({ success: true, data: category });
});

exports.remove = asyncHandler(async (req, res) => {
  const category = await findOwned(Category, req.params.id, req.user._id);
  if (category.isDefault) throw new AppError('Default categories cannot be deleted', 403);

  // Keep the user's history intact: move expenses to "Other" and drop the category's budgets.
  const moved = await Expense.updateMany(
    { userId: req.user._id, category: category.name },
    { category: FALLBACK_CATEGORY }
  );
  await Budget.deleteMany({ userId: req.user._id, category: category.name });
  await Recurring.updateMany({ userId: req.user._id, type: 'expense', category: category.name }, { category: FALLBACK_CATEGORY });
  await category.deleteOne();

  res.json({
    success: true,
    message: `Category deleted. ${moved.modifiedCount} expense(s) moved to ${FALLBACK_CATEGORY}.`,
  });
});
