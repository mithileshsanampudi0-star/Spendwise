const crypto = require('crypto');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const SavingsGoal = require('../models/SavingsGoal');
const Debt = require('../models/Debt');
const Recurring = require('../models/Recurring');
const { createDefaultCategories } = require('./userService');
const { materialize } = require('./recurringService');
const { startOfTodayUTC } = require('../utils/dates');

const DAY = 86400000;
const DEMO_TTL_MS = 24 * 3600 * 1000;
const FIXED_DEMO_EMAIL = 'demo@spendwise.app';

const TEMPLATES = {
  Food: [['Groceries', 400, 1500], ['Lunch', 120, 350], ['Dinner out', 400, 1200], ['Coffee', 80, 220]],
  Travel: [['Cab ride', 150, 600], ['Metro recharge', 200, 500], ['Fuel', 500, 2000]],
  Education: [['Online course', 500, 3000], ['Books', 300, 1200]],
  Entertainment: [['Movie tickets', 300, 900], ['Gaming', 200, 1500]],
  Shopping: [['Clothes', 800, 3500], ['Accessories', 300, 1500], ['Home items', 400, 2500]],
  Healthcare: [['Pharmacy', 150, 900], ['Doctor consultation', 400, 1200]],
  'Bills & Utilities': [['Electricity bill', 900, 2200], ['Phone recharge', 239, 599]],
  Other: [['Miscellaneous', 100, 800], ['Gift', 300, 1500]],
};
const WEIGHTS = ['Food', 'Food', 'Food', 'Travel', 'Travel', 'Shopping', 'Entertainment', 'Bills & Utilities', 'Healthcare', 'Education', 'Other'];
const METHODS = ['UPI', 'UPI', 'Cash', 'Debit Card', 'Credit Card', 'Net Banking'];

/** Removes a user's records (used for demo cleanup and re-seeding). */
async function wipeUserData(userId) {
  await Promise.all([
    Expense.deleteMany({ userId }), Income.deleteMany({ userId }), Budget.deleteMany({ userId }),
    Category.deleteMany({ userId }), SavingsGoal.deleteMany({ userId }), Recurring.deleteMany({ userId }),
    Debt.deleteMany({ userId }),
  ]);
}

/**
 * Fills an account with clearly fake sample data, relative to `today`. Deterministic.
 * Rent and salary come from real recurring rules, so seeding also exercises the recurring engine.
 */
async function seedDemoData(userId, today = startOfTodayUTC()) {
  let seed = 42;
  const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const at = (daysAgo) => new Date(today.getTime() - daysAgo * DAY);

  const expenses = [];
  for (let i = 0; i < 100; i += 1) {
    const count = i < 14 ? 1 + Math.floor(rand() * 2) : rand() < 0.25 ? 0 : 1 + Math.floor(rand() * 3);
    for (let j = 0; j < count; j += 1) {
      const category = pick(WEIGHTS);
      const [title, min, max] = pick(TEMPLATES[category]);
      expenses.push({ userId, title, category, amount: Math.round(min + rand() * (max - min)), date: at(i), paymentMethod: pick(METHODS), description: 'Demo data' });
    }
  }
  // Steady monthly charges that are not yet tracked: the subscription detector should find these.
  [['Netflix', 649, 'Entertainment', 5], ['Spotify', 119, 'Entertainment', 12], ['Gym membership', 1200, 'Healthcare', 20]].forEach(([title, amount, category, offset]) => {
    for (let k = 0; k < 4; k += 1) expenses.push({ userId, title, category, amount, date: at(offset + 30 * k), paymentMethod: 'UPI', description: 'Demo data' });
  });
  await Expense.insertMany(expenses);

  await Income.insertMany([
    { userId, title: 'Freelance project', category: 'Freelance', amount: 12000, date: at(20), description: 'Demo data' },
    { userId, title: 'Savings interest', category: 'Investments', amount: 1800, date: at(45), description: 'Demo data' },
  ]);

  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 3, 1));
  await Recurring.insertMany([
    { userId, type: 'expense', title: 'Rent', amount: 15000, category: 'Bills & Utilities', paymentMethod: 'Net Banking', frequency: 'monthly', startDate: monthStart, nextDate: monthStart, anchorDay: 1 },
    { userId, type: 'income', title: 'Monthly salary', amount: 60000, category: 'Salary', frequency: 'monthly', startDate: monthStart, nextDate: monthStart, anchorDay: 1 },
  ]);
  await materialize(userId, today);

  const month = today.getUTCMonth() + 1;
  const year = today.getUTCFullYear();
  const prev = month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
  const limits = [['Food', 8000], ['Travel', 4000], ['Entertainment', 2500], ['Shopping', 5000]];
  await Budget.insertMany([...limits.map(([category, amount]) => ({ userId, category, amount, month, year })), ...limits.map(([category, amount]) => ({ userId, category, amount, ...prev }))]);

  await SavingsGoal.insertMany([
    { userId, name: 'Emergency fund', targetAmount: 100000, currentAmount: 35000, targetDate: new Date(Date.UTC(year + 1, 5, 30)), description: 'Six months of expenses (demo)' },
    { userId, name: 'New laptop', targetAmount: 70000, currentAmount: 12000, targetDate: new Date(Date.UTC(year + 1, 1, 28)), description: 'Demo goal' },
  ]);
}

async function purgeExpiredDemos() {
  const expired = await User.find({ isDemo: true, demoExpiresAt: { $lt: new Date() } }).limit(50);
  for (const u of expired) {
    await wipeUserData(u._id);
    await u.deleteOne();
  }
  return expired.length;
}

/** One throw-away demo account per visitor, deleted automatically after 24 hours. */
async function createDemoUser() {
  await purgeExpiredDemos();
  const user = await User.create({
    name: 'Demo User',
    email: `demo-${crypto.randomBytes(5).toString('hex')}@spendwise.demo`,
    password: crypto.randomBytes(16).toString('hex'),
    currency: 'INR',
    isDemo: true,
    demoExpiresAt: new Date(Date.now() + DEMO_TTL_MS),
  });
  await createDefaultCategories(user._id);
  await seedDemoData(user._id);
  return user;
}

/** Used by `npm run seed`: a fixed, resettable demo login. */
async function resetFixedDemo() {
  const existing = await User.findOne({ email: FIXED_DEMO_EMAIL });
  if (existing) {
    await wipeUserData(existing._id);
    await existing.deleteOne();
  }
  const user = await User.create({ name: 'Demo User', email: FIXED_DEMO_EMAIL, password: 'Demo@1234', currency: 'INR', isDemo: true, demoExpiresAt: new Date('2100-01-01') });
  await createDefaultCategories(user._id);
  await seedDemoData(user._id);
  return user;
}

module.exports = { createDemoUser, resetFixedDemo, seedDemoData, purgeExpiredDemos, wipeUserData, FIXED_DEMO_EMAIL };
