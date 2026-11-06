const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { parseDate, startOfTodayUTC, addDays, toISODate } = require('../utils/dates');
const { parseQuickAdd } = require('../utils/quickParse');
const { parseBankCsv, MAX_ROWS } = require('../utils/bankCsv');
const { INCOME_SOURCES } = require('../utils/constants');

const expenseCategoryNames = async (userId) => (await Category.find({ userId }).select('name')).map((c) => c.name);
const keyOf = (type, date, amount, title) => `${type}|${toISODate(date)}|${Number(amount).toFixed(2)}|${String(title).trim().toLowerCase()}`;

/** Turns a sentence like "coffee 120 yesterday upi" into a draft the user confirms. Nothing is saved. */
exports.quick = asyncHandler(async (req, res) => {
  const text = typeof req.body.text === 'string' ? req.body.text : '';
  if (!text.trim()) throw new AppError('Type something like "coffee 120 yesterday"', 400);
  const result = parseQuickAdd(text, {
    today: startOfTodayUTC(),
    expenseCategories: await expenseCategoryNames(req.user._id),
    incomeSources: INCOME_SOURCES,
  });
  if (!result.ok) throw new AppError(result.message, 422);
  res.json({ success: true, data: result.draft });
});

/** Parses a bank statement and flags rows that already exist. Nothing is saved. */
exports.preview = asyncHandler(async (req, res) => {
  const text = typeof req.body.csv === 'string' ? req.body.csv : '';
  if (!text.trim()) throw new AppError('Choose a CSV file to import', 400);

  const parsed = parseBankCsv(text, { expenseCategories: await expenseCategoryNames(req.user._id), incomeSources: INCOME_SOURCES });
  if (parsed.error) throw new AppError(parsed.error, 422);

  // The parser returns ISO date strings (YYYY-MM-DD).
  let rows = parsed.rows.map((r) => ({ ...r, dateObj: parseDate(r.date) })).filter((r) => r.dateObj);
  if (rows.length) {
    const dates = rows.map((r) => r.dateObj.getTime());
    const from = new Date(Math.min(...dates));
    const to = addDays(new Date(Math.max(...dates)), 1);
    const [exp, inc] = await Promise.all([
      Expense.find({ userId: req.user._id, deletedAt: null, date: { $gte: from, $lt: to } }).select('title amount date'),
      Income.find({ userId: req.user._id, deletedAt: null, date: { $gte: from, $lt: to } }).select('title amount date'),
    ]);
    const existing = new Set([
      ...exp.map((e) => keyOf('expense', e.date, e.amount, e.title)),
      ...inc.map((e) => keyOf('income', e.date, e.amount, e.title)),
    ]);
    rows = rows.map(({ dateObj, ...r }) => ({ ...r, duplicate: existing.has(keyOf(r.type, dateObj, r.amount, r.title)) }));
  }
  res.json({ success: true, data: { ...parsed, rows } });
});

/** Saves the rows the user approved. Every row is validated again; the client is never trusted. */
exports.commit = asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : null;
  if (!rows || !rows.length) throw new AppError('No rows to import', 400);
  if (rows.length > MAX_ROWS) throw new AppError(`You can import up to ${MAX_ROWS} rows at a time`, 400);

  const names = new Set(await expenseCategoryNames(req.user._id));
  const expenses = [];
  const incomes = [];
  const rejected = [];

  rows.forEach((r, i) => {
    const date = parseDate(r && r.date);
    const amount = Number(r && r.amount);
    const title = r && typeof r.title === 'string' ? r.title.trim().slice(0, 100) : '';
    if (!date || !(amount > 0) || !title) return rejected.push({ index: i, reason: 'Invalid date, amount or title' });
    if (r.type === 'income') {
      if (!INCOME_SOURCES.includes(r.category)) return rejected.push({ index: i, reason: 'Unknown income source' });
      incomes.push({ userId: req.user._id, title, amount, date, category: r.category, description: 'Imported' });
    } else if (r.type === 'expense') {
      expenses.push({ userId: req.user._id, title, amount, date, category: names.has(r.category) ? r.category : 'Other', description: 'Imported' });
    } else rejected.push({ index: i, reason: 'Unknown type' });
  });

  const [e, n] = await Promise.all([
    expenses.length ? Expense.insertMany(expenses) : [],
    incomes.length ? Income.insertMany(incomes) : [],
  ]);
  res.status(201).json({ success: true, data: { expenses: e.length, income: n.length, rejected } });
});
