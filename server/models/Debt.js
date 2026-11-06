const mongoose = require('mongoose');

// A debt you owe ("owe") or money you lent to someone ("lent"), with repayments tracked over time.
const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: [0.01, 'Payment must be greater than 0'] },
    date: { type: Date, default: Date.now },
    note: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { _id: true }
);

const debtSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    kind: { type: String, enum: ['owe', 'lent'], default: 'owe' },
    principal: { type: Number, required: [true, 'Amount is required'], min: [1, 'Amount must be at least 1'] },
    dueDate: { type: Date, default: null },
    note: { type: String, trim: true, maxlength: 300, default: '' },
    payments: { type: [paymentSchema], default: [] },
  },
  { timestamps: true, versionKey: false }
);

debtSchema.virtual('paid').get(function paid() {
  return this.payments.reduce((sum, p) => sum + p.amount, 0);
});
debtSchema.set('toJSON', { virtuals: true });
debtSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Debt', debtSchema);
