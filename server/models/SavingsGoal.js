const mongoose = require('mongoose');

const savingsGoalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Goal name is required'], trim: true, maxlength: 80 },
    targetAmount: { type: Number, required: [true, 'Target amount is required'], min: [1, 'Target must be at least 1'] },
    currentAmount: { type: Number, default: 0, min: [0, 'Saved amount cannot be negative'] },
    targetDate: { type: Date },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model('SavingsGoal', savingsGoalSchema);
