const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 60 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: { type: String, required: true, minlength: 6, select: false },
    currency: { type: String, default: 'INR', uppercase: true, trim: true, minlength: 3, maxlength: 3 },
    createdAt: { type: Date, default: Date.now },
    // Tokens issued before this moment are rejected (set on password change / reset).
    passwordChangedAt: { type: Date, select: false },
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
    // Demo accounts hold generated sample data and are deleted after demoExpiresAt.
    isDemo: { type: Boolean, default: false },
    demoExpiresAt: { type: Date },
  },
  { versionKey: false }
);

userSchema.index({ isDemo: 1, demoExpiresAt: 1 });

const bcrypt = require('bcrypt');

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.passwordChangedAt;
    delete ret.resetTokenHash;
    delete ret.resetTokenExpires;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
