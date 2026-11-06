const WARNING_THRESHOLD = 80;
const CRITICAL_THRESHOLD = 100;

/** Single source of truth for budget math on the server. */
const computeBudgetStatus = (amount, spent) => {
  const utilization = amount > 0 ? (spent / amount) * 100 : 0;
  let status = 'ok';
  if (utilization >= CRITICAL_THRESHOLD) status = 'critical';
  else if (utilization >= WARNING_THRESHOLD) status = 'warning';
  return {
    spent: Math.round(spent * 100) / 100,
    remaining: Math.round((amount - spent) * 100) / 100,
    utilization: Math.round(utilization * 10) / 10,
    status,
  };
};

module.exports = { computeBudgetStatus, WARNING_THRESHOLD, CRITICAL_THRESHOLD };
