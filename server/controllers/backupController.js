const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const SavingsGoal = require('../models/SavingsGoal');
const Recurring = require('../models/Recurring');
const Debt = require('../models/Debt');
const asyncHandler = require('../utils/asyncHandler');

const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

// Quote every field and neutralise spreadsheet formulas (=, +, -, @) so an exported title cannot run in Excel.
const cell = (v) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/** GET /api/backup: everything the signed-in user owns, as one downloadable JSON file. */
exports.exportJson = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const live = { userId, deletedAt: null };
  const [expenses, income, budgets, categories, savings, recurring, debts] = await Promise.all([
    Expense.find(live).sort({ date: -1 }).lean(),
    Income.find(live).sort({ date: -1 }).lean(),
    Budget.find({ userId }).lean(),
    Category.find({ userId }).lean(),
    SavingsGoal.find({ userId }).lean(),
    Recurring.find({ userId }).lean(),
    Debt.find({ userId }).lean(),
  ]);

  const payload = {
    app: 'SpendWise',
    exportedAt: new Date().toISOString(),
    user: { name: req.user.name, email: req.user.email, currency: req.user.currency },
    counts: { expenses: expenses.length, income: income.length, budgets: budgets.length, categories: categories.length, savings: savings.length, recurring: recurring.length, debts: debts.length },
    expenses, income, budgets, categories, savings, recurring, debts,
  };

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="spendwise-backup-${day(new Date())}.json"`);
  res.send(JSON.stringify(payload, null, 2));
});

/** GET /api/backup/transactions.csv: expenses and income in one spreadsheet-friendly file. */
exports.exportCsv = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const live = { userId, deletedAt: null };
  const [expenses, income] = await Promise.all([
    Expense.find(live).lean(),
    Income.find(live).lean(),
  ]);

  const rows = [
    ...expenses.map((e) => ({ type: 'Expense', ...e })),
    ...income.map((i) => ({ type: 'Income', paymentMethod: '', ...i })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const lines = ['Date,Type,Title,Category,Amount,Payment method,Notes'];
  for (const r of rows) {
    lines.push([day(r.date), r.type, r.title, r.category, r.amount, r.paymentMethod, r.description].map(cell).join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="spendwise-transactions-${day(new Date())}.csv"`);
  res.send('\uFEFF' + lines.join('\r\n'));
});
