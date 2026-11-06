import { test } from 'node:test';
import assert from 'node:assert/strict';
import { goalProgress, budgetTotals, percentOf, withCategoryMeta } from '../src/utils/calc.js';
import { monthRange, splitMonth, lastWeeks } from '../src/utils/dateRanges.js';
import { formatCurrency } from '../src/utils/format.js';

test('goalProgress: suggested monthly contribution', () => {
  const inTwoMonths = new Date(Date.now() + 61 * 86400000).toISOString();
  const g = goalProgress({ currentAmount: 1000, targetAmount: 5000, targetDate: inTwoMonths });
  assert.equal(g.remaining, 4000);
  assert.equal(g.monthsLeft, 3);
  assert.equal(g.suggestedMonthly, Math.ceil(4000 / 3));
});

test('goalProgress: no suggestion without a date, when done, or when overdue', () => {
  assert.equal(goalProgress({ currentAmount: 0, targetAmount: 100 }).suggestedMonthly, null);
  assert.equal(goalProgress({ currentAmount: 100, targetAmount: 100, targetDate: new Date(Date.now() + 9e8).toISOString() }).suggestedMonthly, null);
  assert.equal(goalProgress({ currentAmount: 0, targetAmount: 100, targetDate: new Date(Date.now() - 9e8).toISOString() }).suggestedMonthly, null);
});

test('budgetTotals adds up and flags alerts', () => {
  const t = budgetTotals([{ amount: 1000, spent: 900, status: 'warning' }, { amount: 500, spent: 100, status: 'ok' }]);
  assert.equal(t.total, 1500);
  assert.equal(t.remaining, 500);
  assert.equal(t.warningCount, 1);
  assert.equal(t.hasAlert, true);
});

test('percentOf caps at 100 and guards zero', () => {
  assert.equal(percentOf(5, 0), 0);
  assert.equal(percentOf(150, 100), 100);
});

test('withCategoryMeta falls back to a neutral colour', () => {
  const [a, b] = withCategoryMeta([{ category: 'Food' }, { category: 'Gone' }], [{ name: 'Food', color: '#111111', icon: 'Utensils' }]);
  assert.equal(a.color, '#111111');
  assert.equal(b.color, '#94A3B8');
});

test('monthRange and splitMonth', () => {
  assert.deepEqual(monthRange('2026-02'), { from: '2026-02-01', to: '2026-02-28' });
  assert.deepEqual(monthRange('2028-02'), { from: '2028-02-01', to: '2028-02-29' });
  assert.deepEqual(splitMonth('2026-11'), { month: 11, year: 2026 });
});

test('lastWeeks starts on a Monday and ends today', () => {
  const r = lastWeeks(12);
  assert.equal(new Date(`${r.from}T00:00:00`).getDay(), 1);
  const days = (new Date(`${r.to}T00:00:00`) - new Date(`${r.from}T00:00:00`)) / 86400000;
  assert.ok(days >= 77 && days <= 83, `span ${days}`);
});

test('formatCurrency formats INR and survives a bad currency code', () => {
  assert.match(formatCurrency(1234.5, 'INR'), /1,234\.50/);
  assert.equal(formatCurrency(1000, 'INR', true).includes('K'), true);
  assert.match(formatCurrency(5, 'XXXX'), /5\.00/);
});
