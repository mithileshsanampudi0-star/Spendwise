const mongoose = require('mongoose');
const AppError = require('./AppError');

/**
 * Ownership-checked lookup. Every read/update/delete of a user's record goes through here,
 * so one user can never touch another user's data. `extra` adds filters such as { deletedAt: null }.
 */
const findOwned = async (Model, id, userId, extra = {}) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid id', 400);
  const doc = await Model.findOne({ _id: id, userId, ...extra });
  if (!doc) throw new AppError('Record not found', 404);
  return doc;
};

module.exports = findOwned;
