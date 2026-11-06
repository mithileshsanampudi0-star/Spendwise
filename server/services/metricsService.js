const Budget = require('../models/Budget');
const analytics = require('./analyticsService');
const recurring = require('./recurringService');
const { projectMonth, safeDailySpend } = require('../utils/forecast');
const { computeHealth } = require('../utils/health');
const { monthRange, startOfTodayUTC, DAY_MS } = require('../utils/dates');
const { daysInMonth } = require('../utils/recurrence');

/** Where the month is heading: projection, vs budget, and the daily amount that keeps you on budget. */
async function getForecast(userId, year, month) {
  const { start, end } = monthRange(year, month);
  const today = startOfTodayUTC();
  const total = daysInMonth(year, month - 1);

  if (today < start) return { year, month, sufficient: false, reason: 'This month has not started yet.' };

  const isCurrent = today < end;
  const elapsedDays = isCurrent ? Math.floor((today - start) / DAY_MS) + 1 : total;

  const [spent, recurringSpent, budgets, income] = await Promise.all([
    analytics.getTotals(userId, start, end),
    analytics.getRecurringSpent(userId, start, end),
    Budget.find({ userId, month, year }),
    analytics.getIncomeTotals(userId, start, end),
  ]);
  const upcoming = isCurrent ? await recurring.upcomingExpenseTotal(userId, start, end) : 0;

  const projection = projectMonth({
    spent: spent.total,
    recurringSpent: recurringSpent.total,
    elapsedDays,
    daysInMonth: total,
    upcomingRecurring: upcoming,
    transactionCount: spent.count,
  });
  const budgetTotal = budgets.reduce((s, b) => s + b.amount, 0);

  const result = { year, month, isCurrent, spent: spent.total, incomeSoFar: income.total, budgetTotal, ...projection };
  if (projection.sufficient) {
    if (budgetTotal > 0) {
      result.projectedVsBudget = Math.round((projection.projected - budgetTotal) * 100) / 100;
      result.safeDailySpend = isCurrent
        ? safeDailySpend({ budgetTotal, spent: spent.total, upcomingRecurring: upcoming, remainingDays: projection.remainingDays })
        : null;
    }
    if (income.total > 0) result.projectedSavings = Math.round((income.total - projection.projected) * 100) / 100;
  }
  return result;
}

/** Financial health score for a month. */
async function getHealth(userId, year, month) {
  const { start, end } = monthRange(year, month);
  const today = startOfTodayUTC();
  const isCurrent = today >= start && today < end;
  const total = daysInMonth(year, month - 1);
  const elapsedDays = today < start ? 0 : isCurrent ? Math.floor((today - start) / DAY_MS) + 1 : total;

  const [budgets, spentMap, totals, income, daily] = await Promise.all([
    Budget.find({ userId, month, year }),
    analytics.getSpentMap(userId, start, end),
    analytics.getTotals(userId, start, end),
    analytics.getIncomeTotals(userId, start, end),
    analytics.getTrends(userId, start, end, 'day'),
  ]);

  return {
    year,
    month,
    ...computeHealth({
      budgets: budgets.map((b) => ({ amount: b.amount, spent: spentMap.get(b.category) || 0 })),
      income: income.total,
      expenses: totals.total,
      expenseCount: totals.count,
      dailyTotals: daily.map((d) => d.total),
      elapsedDays: Math.max(1, elapsedDays),
    }),
  };
}

module.exports = { getForecast, getHealth };
