const round = (n) => Math.round(n * 100) / 100;

/**
 * Month-end spending projection. Recurring bills are handled separately from everyday
 * ("variable") spending so a rent payment on day 1 does not inflate the daily run-rate.
 */
function projectMonth({ spent, recurringSpent = 0, elapsedDays, daysInMonth, upcomingRecurring = 0, transactionCount = 0 }) {
  const remainingDays = Math.max(0, daysInMonth - elapsedDays);
  if (remainingDays === 0) {
    return { sufficient: true, final: true, projected: round(spent), dailyRate: round(spent / Math.max(1, daysInMonth)), remainingDays: 0, confidence: 'high', upcomingRecurring: 0 };
  }
  if (elapsedDays < 3 || transactionCount < 3) {
    return { sufficient: false, reason: 'A forecast needs at least 3 days and 3 transactions in the month.' };
  }
  const variable = Math.max(0, spent - recurringSpent);
  const dailyRate = variable / elapsedDays;
  const projected = spent + dailyRate * remainingDays + upcomingRecurring;
  let confidence = 'low';
  if (elapsedDays >= 14 && transactionCount >= 10) confidence = 'high';
  else if (elapsedDays >= 7 && transactionCount >= 5) confidence = 'medium';
  return {
    sufficient: true,
    final: false,
    projected: round(projected),
    dailyRate: round(dailyRate),
    remainingDays,
    confidence,
    upcomingRecurring: round(upcomingRecurring),
  };
}

/** Daily amount you can still spend and finish the month within the total budget. */
function safeDailySpend({ budgetTotal, spent, upcomingRecurring = 0, remainingDays }) {
  if (!(budgetTotal > 0) || remainingDays <= 0) return null;
  return round((budgetTotal - spent - upcomingRecurring) / remainingDays);
}

module.exports = { projectMonth, safeDailySpend };
