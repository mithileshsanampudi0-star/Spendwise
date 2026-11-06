const Category = require('../models/Category');
const DEFAULT_CATEGORIES = require('../utils/defaultCategories');

/** Every new account starts with the 8 protected default categories. */
const createDefaultCategories = (userId) =>
  Category.insertMany(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId, isDefault: true })));

module.exports = { createDefaultCategories };
