const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const findOwned = require('../utils/findOwned');
const { parseDate, addDays } = require('../utils/dates');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const str = (v) => (typeof v === 'string' ? v : undefined);

/**
 * Shared CRUD for expenses and income. Both use the same shape (title, amount, category, date)
 * so list/search/sort/pagination, validation, soft delete and restore live in one place.
 */
module.exports = function makeTransactionController({ Model, fields, categoryExists }) {
  const pick = (body) => {
    const out = {};
    fields.forEach((k) => { if (body[k] !== undefined) out[k] = body[k]; });
    return out;
  };

  const validate = async (data, userId, partial = false) => {
    const errors = [];
    if (!partial || data.title !== undefined) {
      if (typeof data.title !== 'string' || !data.title.trim()) errors.push('Title is required');
    }
    if (!partial || data.amount !== undefined) {
      const amt = Number(data.amount);
      if (!Number.isFinite(amt) || amt <= 0) errors.push('Amount must be a number greater than 0');
      else data.amount = amt;
    }
    if (!partial || data.date !== undefined) {
      const d = parseDate(data.date);
      if (!d) errors.push('A valid date is required');
      else data.date = d;
    }
    if (!partial || data.category !== undefined) {
      if (typeof data.category !== 'string' || !data.category) errors.push('Category is required');
      else if (!(await categoryExists(userId, data.category))) errors.push('Selected category does not exist');
    }
    if (errors.length) throw new AppError(errors[0], 400, errors);
  };

  const list = asyncHandler(async (req, res) => {
    const search = str(req.query.search);
    const category = str(req.query.category);
    const sortBy = str(req.query.sortBy) || 'date';
    const order = str(req.query.order) || 'desc';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const filter = { userId: req.user._id, deletedAt: null };
    if (category) filter.category = category;
    const start = parseDate(str(req.query.from));
    const last = parseDate(str(req.query.to));
    if (start || last) {
      filter.date = {};
      if (start) filter.date.$gte = start;
      if (last) filter.date.$lt = addDays(last, 1);
    }
    if (search && search.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ title: rx }, { description: rx }, { category: rx }];
    }

    const dir = order === 'asc' ? 1 : -1;
    const sort = sortBy === 'amount' ? { amount: dir, _id: -1 } : { date: dir, _id: -1 };

    const [data, total, totals] = await Promise.all([
      Model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
      Model.countDocuments(filter),
      Model.aggregate([{ $match: filter }, { $group: { _id: null, sum: { $sum: '$amount' } } }]),
    ]);

    res.json({
      success: true,
      data,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
      summary: { totalAmount: Math.round((totals[0]?.sum || 0) * 100) / 100 },
    });
  });

  const create = asyncHandler(async (req, res) => {
    const data = pick(req.body);
    await validate(data, req.user._id);
    const doc = await Model.create({ ...data, userId: req.user._id });
    res.status(201).json({ success: true, data: doc });
  });

  const getOne = asyncHandler(async (req, res) => {
    res.json({ success: true, data: await findOwned(Model, req.params.id, req.user._id, { deletedAt: null }) });
  });

  const update = asyncHandler(async (req, res) => {
    const doc = await findOwned(Model, req.params.id, req.user._id, { deletedAt: null });
    const data = pick(req.body);
    await validate(data, req.user._id, true);
    doc.set(data);
    await doc.save();
    res.json({ success: true, data: doc });
  });

  // Soft delete: the record disappears from every list and total but can be restored for 30 days.
  const remove = asyncHandler(async (req, res) => {
    const doc = await findOwned(Model, req.params.id, req.user._id, { deletedAt: null });
    doc.deletedAt = new Date();
    await doc.save();
    res.json({ success: true, message: 'Deleted', data: { _id: doc._id } });
  });

  const restore = asyncHandler(async (req, res) => {
    const doc = await findOwned(Model, req.params.id, req.user._id, { deletedAt: { $ne: null } });
    doc.deletedAt = null;
    await doc.save();
    res.json({ success: true, data: doc });
  });

  return { list, create, getOne, update, remove, restore };
};
