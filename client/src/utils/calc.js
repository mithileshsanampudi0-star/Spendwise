/**
 * Shared derived-data helpers. Components call these instead of re-implementing the math.
 */

export const sumBy = (items, key) => items.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);

/** Attach colour / icon from the user's category list to rows that carry a `category` name. */
export const withCategoryMeta = (rows, categories) =>
  rows.map((row) => {
    const meta = categories.find((c) => c.name === row.category);
    return { ...row, color: meta?.color || '#94A3B8', icon: meta?.icon || 'Wallet' };
  });

export const percentOf = (part, whole) => (whole > 0 ? Math.min(100, (part / whole) * 100) : 0);

/** Combined budget numbers for the Remaining Monthly Budget card. */
export const budgetTotals = (budgets) => {
  const total = sumBy(budgets, 'amount');
  const spent = sumBy(budgets, 'spent');
  return {
    total,
    spent,
    remaining: total - spent,
    utilization: total > 0 ? (spent / total) * 100 : 0,
    hasAlert: budgets.some((b) => b.status !== 'ok'),
    criticalCount: budgets.filter((b) => b.status === 'critical').length,
    warningCount: budgets.filter((b) => b.status === 'warning').length,
  };
};

/** Budgets that need attention, worst first. */
export const budgetAlerts = (budgets) =>
  budgets
    .filter((b) => b.status !== 'ok')
    .sort((a, b) => b.utilization - a.utilization);

export const goalProgress = (goal) => {
  const pct = percentOf(goal.currentAmount, goal.targetAmount);
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  let daysLeft = null;
  if (goal.targetDate) {
    const target = new Date(goal.targetDate);
    daysLeft = Math.ceil((target.getTime() - Date.now()) / 86400000);
  }
  const done = goal.currentAmount >= goal.targetAmount;
  // What to set aside each month to arrive on the target date. Null without a date, once reached, or when overdue.
  let monthsLeft = null;
  let suggestedMonthly = null;
  if (!done && daysLeft !== null && daysLeft > 0) {
    monthsLeft = Math.max(1, Math.ceil(daysLeft / 30.4375));
    suggestedMonthly = Math.ceil(remaining / monthsLeft);
  }
  return { pct, remaining, daysLeft, done, monthsLeft, suggestedMonthly };
};

/** Minimum for a <input type="date"> style value of today. */
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
