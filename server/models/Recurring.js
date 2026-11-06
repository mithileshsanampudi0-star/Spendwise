const mongoose = require('mongoose');
const { PAYMENT_METHODS } = require('../utils/constants');

const recurringSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['expense', 'income'], required: true },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 100 },
    amount: { type: Number, required: [true, 'Amount is required'], min: [0.01, 'Amount must be greater than 0'] },
    category: { type: String, required: [true, 'Category is required'], trim: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'UPI' },
    frequency: { type: String, enum: ['weekly', 'monthly', 'yearly'], required: true },
    startDate: { type: Date, required: true },
    // Next date a transaction is due. Advanced atomically when one is created.
    nextDate: { type: Date, required: true },
    anchorDay: { type: Number, min: 1, max: 31 },
    endDate: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

recurringSchema.index({ active: 1, nextDate: 1 });

module.exports = mongoose.model('Recurring', recurringSchema);
