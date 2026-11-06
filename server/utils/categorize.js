/**
 * Keyword-based categoriser used by CSV import and the quick-add parser.
 * Deterministic and explainable: the first rule whose keyword appears in the text wins.
 */
const EXPENSE_RULES = [
  ['Food', ['swiggy', 'zomato', 'restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'grocery', 'groceries', 'bigbasket', 'blinkit', 'zepto', 'dmart', 'mcdonald', 'dominos', 'starbucks', 'bakery', 'supermarket', 'lunch', 'dinner', 'breakfast', 'snacks', 'tea', 'biryani', 'kfc', 'food', 'dining']],
  ['Travel', ['uber', 'ola', 'rapido', 'irctc', 'flight', 'indigo', 'airline', 'railway', 'metro', 'fuel', 'petrol', 'diesel', 'bus', 'makemytrip', 'redbus', 'cab', 'taxi', 'toll', 'fastag', 'train', 'hotel', 'airbnb', 'travel', 'parking']],
  ['Education', ['course', 'udemy', 'coursera', 'tuition', 'school', 'college', 'books', 'book', 'exam', 'fees', 'university', 'byjus', 'unacademy', 'stationery', 'education']],
  ['Entertainment', ['netflix', 'spotify', 'prime video', 'hotstar', 'movie', 'cinema', 'bookmyshow', 'gaming', 'steam', 'youtube', 'concert', 'pvr', 'inox', 'disney', 'entertainment']],
  ['Shopping', ['amazon', 'flipkart', 'myntra', 'ajio', 'mall', 'clothes', 'shirt', 'shoes', 'nykaa', 'meesho', 'shopping', 'store', 'ikea']],
  ['Healthcare', ['pharmacy', 'apollo', 'hospital', 'clinic', 'doctor', 'medplus', 'medical', 'dental', 'dentist', '1mg', 'pharmeasy', 'medicine', 'lab test', 'health']],
  ['Bills & Utilities', ['electricity', 'bill', 'recharge', 'jio', 'airtel', 'vodafone', 'broadband', 'wifi', 'water', 'gas', 'insurance', 'rent', 'emi', 'utility', 'postpaid', 'dth', 'maintenance']],
];

const INCOME_RULES = [
  ['Salary', ['salary', 'payroll', 'wages', 'stipend']],
  ['Freelance', ['freelance', 'client', 'invoice', 'consulting', 'gig']],
  ['Business', ['business', 'sales', 'revenue', 'shop']],
  ['Investments', ['dividend', 'interest', 'mutual fund', 'stock', 'capital gain', 'rental', 'returns']],
  ['Refund', ['refund', 'cashback', 'reversal', 'reimbursement']],
  ['Gift', ['gift', 'bonus', 'present']],
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const matches = (text, keyword) => {
  // Long keywords are distinctive enough for substring matching (handles "UPI-ZOMATOLTD-123").
  if (keyword.length >= 6) return text.includes(keyword);
  return new RegExp(`(^|[^a-z0-9])${escape(keyword)}([^a-z0-9]|$)`).test(text);
};

const run = (rules, text, available, fallback) => {
  const t = String(text || '').toLowerCase();
  for (const [category, keywords] of rules) {
    if (keywords.some((k) => matches(t, k))) {
      if (!available || available.length === 0 || available.includes(category)) return category;
    }
  }
  return fallback;
};

const categorizeExpense = (text, available) => run(EXPENSE_RULES, text, available, 'Other');
const categorizeIncome = (text, available) => run(INCOME_RULES, text, available, 'Other');

module.exports = { categorizeExpense, categorizeIncome };
