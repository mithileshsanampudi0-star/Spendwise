const Expense = require('../models/Expense');
const Category = require('../models/Category');
const makeTransactionController = require('./transactionFactory');

module.exports = makeTransactionController({
  Model: Expense,
  fields: ['title', 'amount', 'category', 'date', 'paymentMethod', 'description'],
  categoryExists: (userId, name) => Category.exists({ userId, name }),
});
