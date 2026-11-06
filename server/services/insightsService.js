const Budget = require('../models/Budget');
const analytics = require('./analyticsService');
const { getForecast } = require('./metricsService');
const { findSubscriptions } = require('./subscriptionService');
const { computeBudgetStatus } = require('../utils/budgetCalc');
const { monthRange, DAY_MS, startOfTodayUTC, addDays } = require('../utils/dates');

const MIN_EXPENSES = 3;

const pct = (n) => `${Math.abs(Math.round(n))}%`;

/**
 * Rule-based insights. Every insight is derived from the user's real records.
 * Returns { sufficient: false } when there is not enough data to say anything honest.
 */
const generateInsights = async (userId, year, month) => {
  const { start, end } = monthRange(year, month);
  const prevStart = new Date(Date.UTC(year, month - 2, 1));
  const prevMonthEnd = start;

  const current = await analytics.getTotals(userId, start, end);
  if (current.count < MIN_EXPENSES) {
    return {
      sufficient: false,
      message: `Add at least ${MIN_EXPENSES} expenses in this month to unlock insights.`,
      insights: [],
    };
  }

  const insights = [];
  const [categories, prevCategories, trends, budgets, spentMap] = await Promise.all([
    analytics.getCategoryTotals(userId, start, end),
    analytics.getCategoryTotals(userId, prevStart, prevMonthEnd),
    analytics.getTrends(userId, start, end, 'day'),
    Budget.find({ userId, month, year }),
    analytics.getSpentMap(userId, start, end),
  ]);

  // 1. Highest spending category
  const top = categories[0];
  insights.push({
    type: 'highest-category',
    severity: 'info',
    title: `${top.category} is your biggest expense`,
    message: `${top.category} accounts for ${top.percentage}% of this month's spending across ${top.count} transaction${top.count === 1 ? '' : 's'}.`,
    meta: { category: top.category, total: top.total },
  });

  // 2. Average daily spending
  const days = Math.max(1, trends.length);
  insights.push({
    type: 'daily-average',
    severity: 'info',
    title: 'Average daily spending',
    message: `You are spending about ${Math.round(current.total / days).toLocaleString()} per day over the ${days} day${days === 1 ? '' : 's'} counted so far this month.`,
    meta: { dailyAverage: Math.round((current.total / days) * 100) / 100 },
  });

  // 3. Month-over-month comparison (same elapsed days if the month is still running)
  const today = startOfTodayUTC();
  const ongoing = today >= start && today < end;
  const elapsed = ongoing ? Math.floor((today - start) / DAY_MS) + 1 : null;
  const prevEnd = ongoing ? new Date(Math.min(addDays(prevStart, elapsed).getTime(), prevMonthEnd.getTime())) : prevMonthEnd;
  const prevTotals = await analytics.getTotals(userId, prevStart, prevEnd);
  if (prevTotals.total > 0) {
    const change = ((current.total - prevTotals.total) / prevTotals.total) * 100;
    const direction = change > 0 ? 'more' : 'less';
    insights.push({
      type: 'month-comparison',
      severity: change > 10 ? 'warning' : change < -10 ? 'success' : 'info',
      title: Math.abs(change) < 1 ? 'Spending is flat versus last month' : `Spending is ${pct(change)} ${direction} than last month`,
      message: ongoing
        ? `So far this month you have spent ${current.total.toLocaleString()} compared with ${prevTotals.total.toLocaleString()} over the same days last month.`
        : `You spent ${current.total.toLocaleString()} this month compared with ${prevTotals.total.toLocaleString()} last month.`,
      meta: { change },
    });
  }

  // 4. Categories with notable increases (needs previous history for that category)
  categories
    .filter((c) => {
      const prev = prevCategories.find((p) => p.category === c.category);
      return prev && prev.total > 0 && c.total >= prev.total * 1.3 && c.total - prev.total >= 1;
    })
    .slice(0, 2)
    .forEach((c) => {
      const prev = prevCategories.find((p) => p.category === c.category);
      const change = ((c.total - prev.total) / prev.total) * 100;
      insights.push({
        type: 'category-increase',
        severity: 'warning',
        title: `${c.category} spending is up ${pct(change)}`,
        message: `You have spent ${c.total.toLocaleString()} on ${c.category} versus ${prev.total.toLocaleString()} last month.`,
        meta: { category: c.category, change },
      });
    });

  // 5. Budget utilization
  budgets.forEach((b) => {
    const s = computeBudgetStatus(b.amount, spentMap.get(b.category) || 0);
    if (s.status === 'ok') return;
    insights.push({
      type: 'budget',
      severity: s.status === 'critical' ? 'danger' : 'warning',
      title: s.status === 'critical' ? `${b.category} budget exceeded` : `${b.category} budget almost used`,
      message: `You have used ${s.utilization}% of your ${b.category} budget (${s.spent.toLocaleString()} of ${b.amount.toLocaleString()}).`,
      meta: { category: b.category, utilization: s.utilization },
    });
  });

  // 6. Unusual spending: a day well above the monthly norm (needs 7+ days of spending)
  const spendDays = trends.filter((t) => t.total > 0);
  if (spendDays.length >= 7) {
    const mean = spendDays.reduce((sum, t) => sum + t.total, 0) / spendDays.length;
    const variance = spendDays.reduce((sum, t) => sum + (t.total - mean) ** 2, 0) / spendDays.length;
    const sd = Math.sqrt(variance);
    const spike = [...spendDays].sort((a, b) => b.total - a.total)[0];
    if (sd > 0 && spike.total > mean + 2 * sd) {
      insights.push({
        type: 'unusual-spike',
        severity: 'warning',
        title: 'Unusual spending day',
        message: `On ${spike.label} you spent ${spike.total.toLocaleString()}, well above your typical ${Math.round(mean).toLocaleString()} on days with spending.`,
        meta: { date: spike.label, total: spike.total },
      });
    }
  }

  // 7. Cash flow: savings rate (needs income recorded this month)
  const cash = await analytics.getCashflow(userId, start, end);
  if (cash.income > 0) {
    const rate = cash.savingsRate;
    insights.push({
      type: 'savings-rate',
      severity: rate >= 20 ? 'success' : rate < 0 ? 'danger' : 'info',
      title: rate < 0 ? 'You are spending more than you earn' : `You kept ${Math.round(rate)}% of your income`,
      message: rate < 0
        ? `Expenses of ${cash.expenses.toLocaleString()} exceed income of ${cash.income.toLocaleString()} this month.`
        : `Income ${cash.income.toLocaleString()}, expenses ${cash.expenses.toLocaleString()}. ${rate >= 20 ? 'That is a healthy savings rate.' : 'Aim for 20% or more.'}`,
      meta: { savingsRate: rate },
    });
  }

  // 8. Forecast vs budget
  const forecast = await getForecast(userId, year, month);
  if (forecast.sufficient && !forecast.final && forecast.budgetTotal > 0 && forecast.projectedVsBudget > 0) {
    insights.push({
      type: 'forecast',
      severity: 'warning',
      title: 'On track to exceed your budgets',
      message: `At this pace you will spend about ${Math.round(forecast.projected).toLocaleString()} this month, ${Math.round(forecast.projectedVsBudget).toLocaleString()} over your total budget.`,
      meta: { projected: forecast.projected },
    });
  }

  // 9. Untracked subscriptions
  const subs = await findSubscriptions(userId);
  if (subs.length) {
    const monthly = Math.round(subs.reduce((sum, x) => sum + x.monthlyCost, 0));
    insights.push({
      type: 'subscriptions',
      severity: 'info',
      title: `${subs.length} repeating charge${subs.length === 1 ? '' : 's'} detected`,
      message: `${subs.map((x) => x.title).slice(0, 3).join(', ')}${subs.length > 3 ? '...' : ''} cost about ${monthly.toLocaleString()} per month. Track them under Recurring.`,
      meta: { monthly },
    });
  }

  return { sufficient: true, insights };
};

module.exports = { generateInsights };
