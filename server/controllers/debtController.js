const Debt = require('../models/Debt');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const findOwned = require('../utils/findOwned');
const { parseDate } = require('../utils/dates');

const clean = (body, partial = false) => {
  const out = {};
  const errors = [];

  if (!partial || body.name !== undefined) {
    if (!body.name || !String(body.name).trim()) errors.push('Name is required');
    else out.name = String(body.name).trim();
  }
  if (!partial || body.principal !== undefined) {
    const n = Number(body.principal);
    if (!Number.isFinite(n) || n <= 0) errors.push('Amount must be greater than 0');
    else out.principal = n;
  }
  if (body.kind !== undefined) {
    if (!['owe', 'lent'].includes(body.kind)) errors.push('Type must be "owe" or "lent"');
    else out.kind = body.kind;
  }
  if (body.dueDate !== undefined) {
    if (body.dueDate === '' || body.dueDate === null) out.dueDate = null;
    else {
      const d = parseDate(body.dueDate);
      if (!d) errors.push('Due date is invalid');
      else out.dueDate = d;
    }
  }
  if (body.note !== undefined) out.note = String(body.note).slice(0, 300);

  if (errors.length) throw new AppError(errors[0], 400, errors);
  return out;
};

const summarize = (debts) => {
  const s = { owe: { total: 0, paid: 0, remaining: 0 }, lent: { total: 0, paid: 0, remaining: 0 }, overdue: 0 };
  const now = new Date();
  for (const d of debts) {
    const paid = d.paid;
    const remaining = Math.max(0, d.principal - paid);
    const bucket = s[d.kind];
    bucket.total += d.principal;
    bucket.paid += paid;
    bucket.remaining += remaining;
    if (remaining > 0 && d.dueDate && d.dueDate < now) s.overdue += 1;
  }
  return s;
};

exports.list = asyncHandler(async (req, res) => {
  const debts = await Debt.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: debts, summary: summarize(debts) });
});

exports.create = asyncHandler(async (req, res) => {
  const debt = await Debt.create({ ...clean(req.body), userId: req.user._id });
  res.status(201).json({ success: true, data: debt });
});

exports.update = asyncHandler(async (req, res) => {
  const debt = await findOwned(Debt, req.params.id, req.user._id);
  debt.set(clean(req.body, true));
  await debt.save();
  res.json({ success: true, data: debt });
});

exports.addPayment = asyncHandler(async (req, res) => {
  const debt = await findOwned(Debt, req.params.id, req.user._id);
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError('Payment must be greater than 0', 400);
  const remaining = debt.principal - debt.paid;
  if (amount > remaining + 0.005) throw new AppError(`Payment is more than the remaining balance (${remaining})`, 400);
  let date = new Date();
  if (req.body.date) {
    date = parseDate(req.body.date);
    if (!date) throw new AppError('Payment date is invalid', 400);
  }
  debt.payments.push({ amount, date, note: String(req.body.note || '').slice(0, 200) });
  await debt.save();
  res.status(201).json({ success: true, data: debt });
});

exports.removePayment = asyncHandler(async (req, res) => {
  const debt = await findOwned(Debt, req.params.id, req.user._id);
  const payment = debt.payments.id(req.params.paymentId);
  if (!payment) throw new AppError('Payment not found', 404);
  payment.deleteOne();
  await debt.save();
  res.json({ success: true, data: debt });
});

exports.remove = asyncHandler(async (req, res) => {
  const debt = await findOwned(Debt, req.params.id, req.user._id);
  await debt.deleteOne();
  res.json({ success: true, message: 'Record deleted' });
});
