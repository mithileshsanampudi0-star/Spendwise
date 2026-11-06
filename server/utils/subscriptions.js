const { nextOccurrence } = require('./recurrence');

const DAY_MS = 86400000;
const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const normalize = (t) => String(t || '').toLowerCase().replace(/[0-9]+/g, ' ').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Finds expenses that repeat on a steady schedule (monthly or weekly) at a steady amount.
 * Input rows: { title, amount, date: Date, category }.
 */
function detectSubscriptions(expenses) {
  const groups = new Map();
  for (const e of expenses) {
    const key = normalize(e.title);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }

  const found = [];
  for (const items of groups.values()) {
    if (items.length < 3) continue;
    const sorted = [...items].sort((a, b) => new Date(a.date) - new Date(b.date));
    const gaps = sorted.slice(1).map((e, i) => (new Date(e.date) - new Date(sorted[i].date)) / DAY_MS);
    const gap = median(gaps);
    const amounts = sorted.map((e) => Number(e.amount));
    const amount = median(amounts);
    const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const sd = Math.sqrt(amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length);
    if (mean === 0 || sd / mean > 0.15) continue;

    let frequency = null;
    let tolerance = 0;
    if (gap >= 26 && gap <= 35) { frequency = 'monthly'; tolerance = 4; }
    else if (gap >= 6 && gap <= 8 && sorted.length >= 4) { frequency = 'weekly'; tolerance = 1; }
    if (!frequency) continue;
    if (gaps.filter((g) => Math.abs(g - gap) <= tolerance).length / gaps.length < 0.7) continue;

    const last = sorted[sorted.length - 1];
    found.push({
      title: last.title,
      amount: Math.round(amount * 100) / 100,
      frequency,
      category: last.category,
      lastDate: new Date(last.date).toISOString().slice(0, 10),
      nextExpected: nextOccurrence(last.date, frequency).toISOString().slice(0, 10),
      occurrences: sorted.length,
      monthlyCost: Math.round((frequency === 'monthly' ? amount : (amount * 52) / 12) * 100) / 100,
    });
  }
  return found.sort((a, b) => b.monthlyCost - a.monthlyCost);
}

module.exports = { detectSubscriptions, normalize };
