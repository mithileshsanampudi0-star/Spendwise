const Income = require('../models/Income');
const makeTransactionController = require('./transactionFactory');
const { INCOME_SOURCES } = require('../utils/constants');

module.exports = makeTransactionController({
  Model: Income,
  fields: ['title', 'amount', 'category', 'date', 'description'],
  categoryExists: async (_userId, name) => INCOME_SOURCES.includes(name),
});
