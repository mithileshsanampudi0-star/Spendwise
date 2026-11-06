const { categorizeExpense, categorizeIncome } = require('./categorize');

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const WEEKDAYS = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const DAY_MS = 86400000;

const iso = (d) => d.toISOString().slice(0, 10);
const utc = (y, m, d) => new Date(Date.UTC(y, m, d));
const validDate = (y, m, d) => {
  const x = utc(y, m, d);
  return x.getUTCFullYear() === y && x.getUTCMonth() === m && x.getUTCDate() === d ? x : null;
};

const INCOME_WORDS = /\b(got|received|earned|income|salary|credited|bonus|refund|cashback|stipend)\b/i;
const FILLER = /\b(spent|paid|pay|on|for|at|via|using|by|with|from|got|received|earned|rupees|rs|inr|of|the|a|an|to|my)\b/gi;

const PAYMENT = [
  [/\bnet\s?banking\b/i, 'Net Banking'],
  [/\bcredit\s?card\b|\bcc\b/i, 'Credit Card'],
  [/\bdebit\s?card\b|\bdc\b/i, 'Debit Card'],
  [/\bupi\b|\bgpay\b|\bphonepe\b|\bpaytm\b/i, 'UPI'],
  [/\bcash\b/i, 'Cash'],
];

const monthPattern = Object.keys(MONTHS).join('|');
const weekdayPattern = Object.keys(WEEKDAYS).join('|');

function extractDate(text, today) {
  let m;
  const rel = (days) => new Date(today.getTime() + days * DAY_MS);

  if ((m = /\bday before yesterday\b/i.exec(text))) return { date: rel(-2), rest: text.replace(m[0], ' ') };
  if ((m = /\byesterday\b/i.exec(text))) return { date: rel(-1), rest: text.replace(m[0], ' ') };
  if ((m = /\btoday\b/i.exec(text))) return { date: rel(0), rest: text.replace(m[0], ' ') };

  if ((m = new RegExp(`\\b(last|on)\\s+(${weekdayPattern})\\b`, 'i').exec(text))) {
    const target = WEEKDAYS[m[2].toLowerCase()];
    let diff = (today.getUTCDay() - target + 7) % 7;
    if (m[1].toLowerCase() === 'last' && diff === 0) diff = 7;
    return { date: rel(-diff), rest: text.replace(m[0], ' ') };
  }

  const fix = (d) => (d > rel(1) ? utc(d.getUTCFullYear() - 1, d.getUTCMonth(), d.getUTCDate()) : d);

  if ((m = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthPattern})[a-z]*(?:\\s+(\\d{4}))?\\b`, 'i').exec(text))) {
    const d = validDate(m[3] ? Number(m[3]) : today.getUTCFullYear(), MONTHS[m[2].toLowerCase().slice(0, 3)], Number(m[1]));
    if (d) return { date: m[3] ? d : fix(d), rest: text.replace(m[0], ' ') };
  }
  if ((m = new RegExp(`\\b(${monthPattern})[a-z]*\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i').exec(text))) {
    const d = validDate(today.getUTCFullYear(), MONTHS[m[1].toLowerCase().slice(0, 3)], Number(m[2]));
    if (d) return { date: fix(d), rest: text.replace(m[0], ' ') };
  }
  if ((m = /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/.exec(text))) {
    let year = m[3] ? Number(m[3]) : today.getUTCFullYear();
    if (year < 100) year += 2000;
    const d = validDate(year, Number(m[2]) - 1, Number(m[1])); // day/month, as is common in India
    if (d) return { date: m[3] ? d : fix(d), rest: text.replace(m[0], ' ') };
  }
  return { date: today, rest: text };
}

function extractAmount(text) {
  const re = /(?:(₹|rs\.?|inr|\$|usd|€|£)\s*)?(\d[\d,]*(?:\.\d+)?)(\s*k\b)?/gi;
  let best = null;
  let m;
  while ((m = re.exec(text))) {
    const candidate = { match: m[0], value: parseFloat(m[2].replace(/,/g, '')) * (m[3] ? 1000 : 1), hasCurrency: Boolean(m[1]) };
    if (!Number.isFinite(candidate.value)) continue;
    if (!best || (candidate.hasCurrency && !best.hasCurrency)) best = candidate;
    if (candidate.hasCurrency) break;
  }
  return best;
}

/**
 * Turns "Coffee 120 yesterday upi" into a structured draft. The UI always shows the draft for
 * confirmation before saving, so a wrong guess never silently creates a record.
 */
function parseQuickAdd(input, { today = new Date(), expenseCategories = [], incomeSources = [] } = {}) {
  const raw = String(input || '').trim();
  if (!raw) return { ok: false, message: 'Type something like "Coffee 120 yesterday upi".' };

  const todayUTC = utc(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const kind = INCOME_WORDS.test(raw) ? 'income' : 'expense';

  let rest = raw;
  let paymentMethod;
  for (const [re, name] of PAYMENT) {
    const m = re.exec(rest);
    if (m) {
      paymentMethod = name;
      rest = rest.replace(m[0], ' ');
      break;
    }
  }

  const dated = extractDate(rest, todayUTC);
  rest = dated.rest;

  const amount = extractAmount(rest);
  if (!amount || amount.value <= 0) return { ok: false, message: 'Could not find an amount. Try "Lunch 250".' };
  rest = rest.replace(amount.match, ' ');

  let title = rest.replace(FILLER, ' ').replace(/[,;:]+/g, ' ').replace(/\s+/g, ' ').trim();
  const category = kind === 'income' ? categorizeIncome(raw, incomeSources) : categorizeExpense(raw, expenseCategories);
  if (!title) title = kind === 'income' ? category : category === 'Other' ? 'Expense' : category;
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return {
    ok: true,
    draft: {
      kind,
      title,
      amount: Math.round(amount.value * 100) / 100,
      date: iso(dated.date),
      category,
      ...(kind === 'expense' ? { paymentMethod: paymentMethod || 'UPI' } : {}),
    },
  };
}

module.exports = { parseQuickAdd };
