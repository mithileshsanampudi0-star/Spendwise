const mongoose = require('mongoose');
const { PAYMENT_METHODS } = require('../utils/constants');

const expenseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 100 },
    amount: { type: Number, required: [true, 'Amount is required'], min: [0.01, 'Amount must be greater than 0'] },
    category: { type: String, required: [true, 'Category is required'], trim: true },
    date: { type: Date, required: [true, 'Date is required'] },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'Cash' },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    // Set when created by a recurring rule.
    recurringId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recurring', default: null },
    // Soft delete: lets the UI offer "Undo". Purged automatically after 30 days.
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, category: 1, date: -1 });
expenseSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 30 * 86400 });

module.exports = mongoose.model('Expense', expenseSchema);
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
