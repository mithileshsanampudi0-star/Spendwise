const mongoose = require('mongoose');
const { INCOME_SOURCES } = require('../utils/constants');

// `category` holds the income source so expenses and income share the same query/aggregation code.
const incomeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 100 },
    amount: { type: Number, required: [true, 'Amount is required'], min: [0.01, 'Amount must be greater than 0'] },
    category: { type: String, required: [true, 'Source is required'], enum: { values: INCOME_SOURCES, message: 'Choose a valid income source' } },
    date: { type: Date, required: [true, 'Date is required'] },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    recurringId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recurring', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

incomeSchema.index({ userId: 1, date: -1 });
incomeSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 30 * 86400 });

module.exports = mongoose.model('Income', incomeSchema);
