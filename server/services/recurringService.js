const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Recurring = require('../models/Recurring');
const Category = require('../models/Category');
const { nextOccurrence } = require('../utils/recurrence');
const { startOfTodayUTC } = require('../utils/dates');

const MODELS = { expense: Expense, income: Income };

/**
 * Creates the transactions that recurring rules owe up to today.
 * Safe to call repeatedly and from several processes: each occurrence is "claimed" by atomically
 * moving the rule's nextDate forward, and only the caller that wins the claim creates the record.
 */
async function materialize(userId = null, today = startOfTodayUTC()) {
  const filter = { active: true, nextDate: { $lte: today } };
  if (userId) filter.userId = userId;
  const rules = await Recurring.find(filter).limit(500);

  let created = 0;
  for (const rule of rules) {
    let current = rule.nextDate;
    let guard = 0;
    let validCategories = null;

    while (current <= today && guard < 400) {
      guard += 1;
      if (rule.endDate && current > rule.endDate) {
        await Recurring.updateOne({ _id: rule._id, nextDate: current }, { active: false });
        break;
      }
      const next = nextOccurrence(current, rule.frequency, rule.anchorDay);
      const claim = await Recurring.updateOne({ _id: rule._id, nextDate: current }, { nextDate: next });
      if (claim.modifiedCount !== 1) break; // another worker already took this occurrence

      let category = rule.category;
      if (rule.type === 'expense') {
        if (!validCategories) validCategories = new Set((await Category.find({ userId: rule.userId })).map((c) => c.name));
        if (!validCategories.has(category)) category = 'Other';
      }
      const doc = {
        userId: rule.userId,
        title: rule.title,
        amount: rule.amount,
        category,
        date: current,
        description: 'Recurring',
        recurringId: rule._id,
      };
      if (rule.type === 'expense') doc.paymentMethod = rule.paymentMethod;
      await MODELS[rule.type].create(doc);
      created += 1;
      current = next;
    }
  }
  return { created };
}

/** Sum of expense rules that will fall due inside [from, end). Includes occurrences not yet posted. */
async function upcomingExpenseTotal(userId, from, end) {
  const rules = await Recurring.find({ userId, type: 'expense', active: true });
  let total = 0;
  for (const rule of rules) {
    let d = rule.nextDate;
    let guard = 0;
    while (d < end && guard < 400) {
      guard += 1;
      if (rule.endDate && d > rule.endDate) break;
      if (d >= from) total += rule.amount;
      d = nextOccurrence(d, rule.frequency, rule.anchorDay);
    }
  }
  return Math.round(total * 100) / 100;
}

module.exports = { materialize, upcomingExpenseTotal };
