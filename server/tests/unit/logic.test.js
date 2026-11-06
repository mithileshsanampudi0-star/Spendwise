const test = require('node:test');
const assert = require('node:assert/strict');
const { nextOccurrence } = require('../../utils/recurrence');
const { categorizeExpense, categorizeIncome } = require('../../utils/categorize');
const { parseQuickAdd } = require('../../utils/quickParse');
const { parseCsv, parseBankCsv, parseAmount, parseDateCell } = require('../../utils/bankCsv');
const { projectMonth, safeDailySpend } = require('../../utils/forecast');
const { computeHealth, budgetPoints, savingsPoints } = require('../../utils/health');
const { detectSubscriptions } = require('../../utils/subscriptions');
const { computeBudgetStatus } = require('../../utils/budgetCalc');
const { runWith } = require('../../utils/context');
const { startOfTodayUTC, buildRange, effectiveDays } = require('../../utils/dates');

const D = (s) => new Date(`${s}T00:00:00.000Z`);
const iso = (d) => d.toISOString().slice(0, 10);

test('recurrence: monthly keeps the anchor day and clamps to short months', () => {
  assert.equal(iso(nextOccurrence(D('2026-01-31'), 'monthly', 31)), '2026-02-28');
  assert.equal(iso(nextOccurrence(D('2026-02-28'), 'monthly', 31)), '2026-03-31');
  assert.equal(iso(nextOccurrence(D('2026-12-15'), 'monthly', 15)), '2027-01-15');
});
test('recurrence: weekly and yearly (leap day)', () => {
  assert.equal(iso(nextOccurrence(D('2026-11-05'), 'weekly')), '2026-11-12');
  assert.equal(iso(nextOccurrence(D('2024-02-29'), 'yearly', 29)), '2025-02-28');
  assert.equal(iso(nextOccurrence(D('2027-02-28'), 'yearly', 29)), '2028-02-29');
  assert.throws(() => nextOccurrence(D('2026-01-01'), 'daily'));
});

test('categorize: brands, word boundaries and availability', () => {
  assert.equal(categorizeExpense('UPI-ZOMATO LTD-123456'), 'Food');
  assert.equal(categorizeExpense('Uber trip'), 'Travel');
  assert.equal(categorizeExpense('Coca cola 2L'), 'Other'); // "ola" must not match inside "cola"
  assert.equal(categorizeExpense('Netflix subscription'), 'Entertainment');
  assert.equal(categorizeExpense('Netflix', ['Food', 'Other']), 'Other'); // category not available to the user
  assert.equal(categorizeIncome('Monthly salary credited'), 'Salary');
  assert.equal(categorizeIncome('random'), 'Other');
});

test('quick add: expense with relative date and payment method', () => {
  const r = parseQuickAdd('Coffee 120 yesterday upi', { today: D('2026-11-05') });
  assert.equal(r.ok, true);
  assert.deepEqual(r.draft, { kind: 'expense', title: 'Coffee', amount: 120, date: '2026-11-04', category: 'Food', paymentMethod: 'UPI' });
});
test('quick add: income with k suffix', () => {
  const r = parseQuickAdd('got salary 50k', { today: D('2026-11-05') });
  assert.equal(r.draft.kind, 'income');
  assert.equal(r.draft.amount, 50000);
  assert.equal(r.draft.category, 'Salary');
});
test('quick add: currency symbol, commas, explicit dates and weekdays', () => {
  const t = D('2026-11-05'); // a Thursday
  assert.equal(parseQuickAdd('paid ₹1,299 netflix', { today: t }).draft.amount, 1299);
  assert.equal(parseQuickAdd('uber 250 on 12 oct cash', { today: t }).draft.date, '2026-10-12');
  assert.equal(parseQuickAdd('lunch 200 last monday', { today: t }).draft.date, '2026-11-02');
  assert.equal(parseQuickAdd('lunch 200 03/11', { today: t }).draft.date, '2026-11-03');
  assert.equal(parseQuickAdd('gift 500 20 dec', { today: t }).draft.date, '2025-12-20'); // future date rolls back a year
});
test('quick add: no amount and empty input fail clearly', () => {
  assert.equal(parseQuickAdd('just words', { today: D('2026-11-05') }).ok, false);
  assert.equal(parseQuickAdd('   ').ok, false);
});

test('csv: quotes, delimiters and amounts', () => {
  assert.deepEqual(parseCsv('a,b\n"x, y","he said ""hi"""\n'), [['a', 'b'], ['x, y', 'he said "hi"']]);
  assert.deepEqual(parseCsv('a;b\n1;2'), [['a', 'b'], ['1', '2']]);
  assert.equal(parseAmount('1,23,456.50'), 123456.5);
  assert.equal(parseAmount('(250.00)'), -250);
  assert.equal(parseAmount('500 Dr'), -500);
  assert.equal(parseAmount(''), null);
});
test('csv: date order detection', () => {
  assert.equal(parseDateCell('05/11/2026', 'dmy'), '2026-11-05');
  assert.equal(parseDateCell('05/11/2026', 'mdy'), '2026-05-11');
  assert.equal(parseDateCell('2026-11-05', 'dmy'), '2026-11-05');
  assert.equal(parseDateCell('05 Nov 2026', 'dmy'), '2026-11-05');
  assert.equal(parseDateCell('31/02/2026', 'dmy'), null);
});
test('csv: debit/credit bank statement with a preamble', () => {
  const csv = ['Account Statement', 'Customer: X', 'Date,Narration,Withdrawal Amt.,Deposit Amt.,Balance',
    '01/11/2026,UPI-SWIGGY-9981,450.00,,10000', '02/11/2026,SALARY NOV,,60000.00,70000', '25/11/2026,bad,,,0', 'xx/11/2026,bad date,10,,0'].join('\n');
  const r = parseBankCsv(csv, {});
  assert.equal(r.rows.length, 2);
  assert.deepEqual(r.rows[0], { line: 4, date: '2026-11-01', title: 'UPI-SWIGGY-9981', amount: 450, type: 'expense', category: 'Food' });
  assert.equal(r.rows[1].type, 'income');
  assert.equal(r.rows[1].category, 'Salary');
  assert.equal(r.skipped.length, 2);
});
test('csv: single signed amount column and all-positive exports', () => {
  const signed = parseBankCsv('Date,Description,Amount\n2026-11-01,Uber,-250\n2026-11-02,Refund,100', {});
  assert.deepEqual(signed.rows.map((r) => r.type), ['expense', 'income']);
  const positive = parseBankCsv('Date,Title,Amount\n2026-11-01,Lunch,250\n2026-11-02,Bus,40', {});
  assert.deepEqual(positive.rows.map((r) => r.type), ['expense', 'expense']);
});
test('csv: helpful errors', () => {
  assert.match(parseBankCsv('a,b,c\n1,2,3', {}).error, /date column/);
  assert.match(parseBankCsv('Date,Notes,Thing\n2026-01-01,x,y', {}).error, /amount/);
  assert.match(parseBankCsv('Date', {}).error, /no data/);
});

test('forecast: run-rate excludes recurring spend and adds upcoming bills', () => {
  const r = projectMonth({ spent: 20000, recurringSpent: 15000, elapsedDays: 10, daysInMonth: 30, upcomingRecurring: 650, transactionCount: 12 });
  assert.equal(r.dailyRate, 500); // (20000-15000)/10
  assert.equal(r.projected, 20000 + 500 * 20 + 650);
  assert.equal(r.confidence, 'medium');
});
test('forecast: not enough data, and a finished month', () => {
  assert.equal(projectMonth({ spent: 100, elapsedDays: 2, daysInMonth: 30, transactionCount: 5 }).sufficient, false);
  assert.equal(projectMonth({ spent: 100, elapsedDays: 10, daysInMonth: 30, transactionCount: 2 }).sufficient, false);
  const done = projectMonth({ spent: 900, elapsedDays: 30, daysInMonth: 30, transactionCount: 9 });
  assert.equal(done.final, true);
  assert.equal(done.projected, 900);
});
test('forecast: safe daily spend', () => {
  assert.equal(safeDailySpend({ budgetTotal: 10000, spent: 4000, upcomingRecurring: 1000, remainingDays: 10 }), 500);
  assert.equal(safeDailySpend({ budgetTotal: 0, spent: 1, remainingDays: 5 }), null);
  assert.equal(safeDailySpend({ budgetTotal: 100, spent: 1, remainingDays: 0 }), null);
});

test('health: component curves', () => {
  assert.equal(budgetPoints(0.5), 100);
  assert.equal(budgetPoints(1), 70);
  assert.equal(budgetPoints(1.5), 0);
  assert.equal(savingsPoints(0.25), 100);
  assert.equal(savingsPoints(0), 50);
  assert.equal(savingsPoints(-0.5), 0);
});
test('health: weights rescale when data is missing', () => {
  const none = computeHealth({ expenseCount: 2 });
  assert.equal(none.sufficient, false);
  const noBase = computeHealth({ expenseCount: 10, dailyTotals: [100, 100, 100, 100, 100, 100, 100], elapsedDays: 10 });
  assert.equal(noBase.sufficient, false); // needs a budget or income to be meaningful
  const r = computeHealth({ expenseCount: 10, income: 50000, expenses: 30000, dailyTotals: [1, 1, 1, 1, 1, 1, 1].map((x) => x * 1000), elapsedDays: 10 });
  assert.equal(r.sufficient, true);
  assert.equal(r.components.reduce((s, c) => s + c.weight, 0) >= 99, true);
  assert.ok(r.score >= 0 && r.score <= 100);
});
test('health: overspending scores poorly and yields tips', () => {
  const r = computeHealth({ expenseCount: 20, budgets: [{ amount: 1000, spent: 1800 }], income: 10000, expenses: 14000, dailyTotals: [10, 3000, 20, 4000, 10, 10, 5000], elapsedDays: 30 });
  assert.equal(r.sufficient, true);
  assert.ok(r.score < 40, `score ${r.score}`);
  assert.equal(r.grade, 'Needs attention');
  assert.ok(r.tips.length > 0);
});

test('subscriptions: finds monthly and ignores irregular spending', () => {
  const rows = [];
  ['2026-08-03', '2026-09-03', '2026-10-04', '2026-11-03'].forEach((d) => rows.push({ title: 'Netflix', amount: 649, date: D(d), category: 'Entertainment' }));
  ['2026-08-01', '2026-08-20', '2026-10-30'].forEach((d, i) => rows.push({ title: 'Lunch', amount: 100 + i * 80, date: D(d), category: 'Food' }));
  const out = detectSubscriptions(rows);
  assert.equal(out.length, 1);
  assert.equal(out[0].title, 'Netflix');
  assert.equal(out[0].frequency, 'monthly');
  assert.equal(out[0].nextExpected, '2026-12-03');
  assert.equal(out[0].monthlyCost, 649);
});
test('subscriptions: varying amounts are not subscriptions', () => {
  const rows = ['2026-08-03', '2026-09-03', '2026-10-03'].map((d, i) => ({ title: 'Electricity', amount: 500 + i * 400, date: D(d), category: 'Bills' }));
  assert.equal(detectSubscriptions(rows).length, 0);
});

test('budget status thresholds', () => {
  assert.equal(computeBudgetStatus(1000, 799).status, 'ok');
  assert.equal(computeBudgetStatus(1000, 800).status, 'warning');
  assert.equal(computeBudgetStatus(1000, 1000).status, 'critical');
  assert.equal(computeBudgetStatus(1000, 1200).remaining, -200);
});

test('dates: client "today" overrides the server UTC day inside a request context', () => {
  runWith({ today: D('2030-01-02') }, () => {
    assert.equal(iso(startOfTodayUTC()), '2030-01-02');
    // a range that ends before "today" counts every day; one that includes today stops at today
    const past = buildRange('2029-12-01', '2029-12-31');
    assert.equal(effectiveDays(past.start, past.end), 31);
    const cur = buildRange('2030-01-01', '2030-01-31');
    assert.equal(effectiveDays(cur.start, cur.end), 2);
  });
  assert.notEqual(iso(startOfTodayUTC()), '2030-01-02');
});
