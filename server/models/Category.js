const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: [true, 'Category name is required'], trim: true, maxlength: 40 },
    color: { type: String, default: '#4CC9F0', match: [/^#([0-9a-fA-F]{6})$/, 'Color must be a hex value like #4CC9F0'] },
    icon: { type: String, default: 'Wallet' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

categorySchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
