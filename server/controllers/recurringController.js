const Recurring = require('../models/Recurring');
const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const findOwned = require('../utils/findOwned');
const { parseDate } = require('../utils/dates');
const { INCOME_SOURCES, PAYMENT_METHODS } = require('../utils/constants');
const { materialize } = require('../services/recurringService');
const { findSubscriptions } = require('../services/subscriptionService');

const FREQUENCIES = ['weekly', 'monthly', 'yearly'];
const UPDATABLE = ['title', 'amount', 'category', 'paymentMethod', 'frequency', 'endDate', 'active'];

const validCategory = async (userId, type, name) =>
  typeof name === 'string' && (type === 'income' ? INCOME_SOURCES.includes(name) : !!(await Category.exists({ userId, name })));

exports.list = asyncHandler(async (req, res) => {
  const data = await Recurring.find({ userId: req.user._id }).sort({ active: -1, nextDate: 1 });
  res.json({ success: true, data });
});

exports.create = asyncHandler(async (req, res) => {
  const { type, title, amount, category, frequency, paymentMethod } = req.body;
  const startDate = parseDate(req.body.startDate);
  const endDate = req.body.endDate ? parseDate(req.body.endDate) : null;

  if (!['expense', 'income'].includes(type)) throw new AppError('Type must be expense or income', 400);
  if (typeof title !== 'string' || !title.trim()) throw new AppError('Title is required', 400);
  if (!(Number(amount) > 0)) throw new AppError('Amount must be greater than 0', 400);
  if (!FREQUENCIES.includes(frequency)) throw new AppError('Frequency must be weekly, monthly or yearly', 400);
  if (!startDate) throw new AppError('A valid start date is required', 400);
  if (req.body.endDate && !endDate) throw new AppError('End date is not valid', 400);
  if (endDate && endDate < startDate) throw new AppError('End date cannot be before the start date', 400);
  if (paymentMethod !== undefined && !PAYMENT_METHODS.includes(paymentMethod)) throw new AppError('Invalid payment method', 400);
  if (!(await validCategory(req.user._id, type, category))) throw new AppError('Selected category does not exist', 400);

  const rule = await Recurring.create({
    userId: req.user._id, type, title, amount: Number(amount), category, frequency, paymentMethod,
    startDate, nextDate: startDate, anchorDay: startDate.getUTCDate(), endDate,
  });
  // Post anything already due (e.g. a rule that started earlier this month).
  await materialize(req.user._id);
  res.status(201).json({ success: true, data: await Recurring.findById(rule._id) });
});

exports.update = asyncHandler(async (req, res) => {
  const rule = await findOwned(Recurring, req.params.id, req.user._id);
  const data = {};
  UPDATABLE.forEach((k) => { if (req.body[k] !== undefined) data[k] = req.body[k]; });

  if (data.title !== undefined && (typeof data.title !== 'string' || !data.title.trim())) throw new AppError('Title is required', 400);
  if (data.amount !== undefined) {
    if (!(Number(data.amount) > 0)) throw new AppError('Amount must be greater than 0', 400);
    data.amount = Number(data.amount);
  }
  if (data.frequency !== undefined && !FREQUENCIES.includes(data.frequency)) throw new AppError('Invalid frequency', 400);
  if (data.paymentMethod !== undefined && !PAYMENT_METHODS.includes(data.paymentMethod)) throw new AppError('Invalid payment method', 400);
  if (data.category !== undefined && !(await validCategory(req.user._id, rule.type, data.category))) throw new AppError('Selected category does not exist', 400);
  if (data.endDate !== undefined) {
    if (data.endDate === null || data.endDate === '') data.endDate = null;
    else if (!(data.endDate = parseDate(data.endDate))) throw new AppError('End date is not valid', 400);
  }
  if (data.active !== undefined) data.active = data.active === true || data.active === 'true';

  rule.set(data);
  await rule.save();
  res.json({ success: true, data: rule });
});

exports.remove = asyncHandler(async (req, res) => {
  const rule = await findOwned(Recurring, req.params.id, req.user._id);
  await rule.deleteOne(); // transactions already created from it stay in the user's history
  res.json({ success: true, message: 'Recurring rule deleted' });
});

/** Post anything that is due now (also runs hourly on the server). */
exports.run = asyncHandler(async (req, res) => {
  const { created } = await materialize(req.user._id);
  res.json({ success: true, data: { created } });
});

exports.detected = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await findSubscriptions(req.user._id) });
});
