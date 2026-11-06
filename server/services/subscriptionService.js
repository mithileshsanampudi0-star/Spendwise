const Expense = require('../models/Expense');
const Recurring = require('../models/Recurring');
const { detectSubscriptions, normalize } = require('../utils/subscriptions');
const { addDays, startOfTodayUTC } = require('../utils/dates');

/** Repeating charges that are not yet tracked as recurring rules. */
async function findSubscriptions(userId) {
  const since = addDays(startOfTodayUTC(), -200);
  const [expenses, rules] = await Promise.all([
    Expense.find({ userId, deletedAt: null, recurringId: null, date: { $gte: since } }).select('title amount date category'),
    Recurring.find({ userId, type: 'expense' }).select('title'),
  ]);
  const tracked = new Set(rules.map((r) => normalize(r.title)));
  return detectSubscriptions(expenses).filter((s) => !tracked.has(normalize(s.title)));
}

module.exports = { findSubscriptions };
