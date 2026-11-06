const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n) => Math.round(n);

const WEIGHTS = { budget: 0.35, savings: 0.35, stability: 0.15, consistency: 0.15 };

const gradeFor = (score) => (score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs attention');

/** 100 while a budget is under 80% used, falling to 70 at 100% and 0 at 150%. */
function budgetPoints(ratio) {
  if (ratio <= 0.8) return 100;
  if (ratio <= 1) return 100 - ((ratio - 0.8) / 0.2) * 30;
  if (ratio <= 1.5) return 70 - ((ratio - 1) / 0.5) * 70;
  return 0;
}

/** 100 at a 20%+ savings rate, 50 when breaking even, 0 when spending 50% more than earned. */
function savingsPoints(rate) {
  if (rate >= 0.2) return 100;
  if (rate >= 0) return 50 + (rate / 0.2) * 50;
  return clamp(50 + rate * 100);
}

/**
 * Financial health score, 0-100, from four transparent components. Components without enough
 * data are left out and the remaining weights are rescaled, so the score never rests on guesses.
 */
function computeHealth({ budgets = [], income = 0, expenses = 0, expenseCount = 0, dailyTotals = [], elapsedDays = 1 }) {
  if (expenseCount < 5) {
    return { sufficient: false, message: 'Add at least 5 expenses this month to calculate your score.' };
  }

  const components = [];

  if (budgets.length) {
    const total = budgets.reduce((s, b) => s + b.amount, 0);
    const pts = budgets.reduce((s, b) => s + budgetPoints(b.spent / b.amount) * (b.amount / total), 0);
    const over = budgets.filter((b) => b.spent > b.amount).length;
    components.push({ key: 'budget', label: 'Budget adherence', score: round(pts), weight: WEIGHTS.budget,
      detail: over ? `${over} of ${budgets.length} budgets exceeded.` : `All ${budgets.length} budgets within limit.` });
  }

  if (income > 0) {
    const rate = (income - expenses) / income;
    components.push({ key: 'savings', label: 'Savings rate', score: round(savingsPoints(rate)), weight: WEIGHTS.savings,
      detail: `You kept ${Math.round(rate * 100)}% of your income (20% or more is excellent).` });
  }

  const active = dailyTotals.filter((t) => t > 0);
  if (active.length >= 7) {
    const mean = active.reduce((s, t) => s + t, 0) / active.length;
    const sd = Math.sqrt(active.reduce((s, t) => s + (t - mean) ** 2, 0) / active.length);
    const cv = mean > 0 ? sd / mean : 0;
    const pts = cv <= 0.6 ? 100 : cv >= 2 ? 0 : (100 * (2 - cv)) / 1.4;
    components.push({ key: 'stability', label: 'Spending stability', score: round(pts), weight: WEIGHTS.stability,
      detail: cv <= 0.6 ? 'Your daily spending is steady.' : 'Your daily spending swings a lot between days.' });
  }

  const activeRatio = clamp(active.length / Math.max(1, elapsedDays), 0, 1);
  components.push({ key: 'consistency', label: 'Tracking consistency', score: round(clamp((activeRatio / 0.5) * 100)), weight: WEIGHTS.consistency,
    detail: `You logged spending on ${active.length} of ${elapsedDays} days.` });

  if (!components.some((c) => c.key === 'budget' || c.key === 'savings')) {
    return { sufficient: false, message: 'Set a budget or add income so the score has something to measure.' };
  }

  const weightSum = components.reduce((s, c) => s + c.weight, 0);
  const score = round(components.reduce((s, c) => s + c.score * (c.weight / weightSum), 0));
  const normalized = components.map((c) => ({ ...c, weight: Math.round((c.weight / weightSum) * 100) }));

  const tips = [...normalized]
    .filter((c) => c.score < 70)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((c) => ({
      budget: 'Review the budgets you have exceeded and trim the largest category first.',
      savings: 'Aim to keep at least 20% of income: automate a transfer to savings on payday.',
      stability: 'Plan big purchases ahead so a single day does not dominate the month.',
      consistency: 'Log expenses the same day you spend; it keeps every chart trustworthy.',
    }[c.key]));

  return { sufficient: true, score, grade: gradeFor(score), components: normalized, tips };
}

module.exports = { computeHealth, budgetPoints, savingsPoints };
