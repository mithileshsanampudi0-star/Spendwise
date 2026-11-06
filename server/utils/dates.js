const { getStore } = require('./context');

const DAY_MS = 86400000;

/** Parse "YYYY-MM-DD" (or ISO) into a UTC Date. Returns null if invalid. */
const parseDate = (value) => {
  if (!value) return null;
  const str = String(value);
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(str) ? `${str}T00:00:00.000Z` : str);
  return Number.isNaN(d.getTime()) ? null : d;
};

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

/** The user's "today" (from X-Client-Date) as a UTC-midnight Date; falls back to the server's UTC day. */
const startOfTodayUTC = () => {
  const { today } = getStore();
  if (today) return today;
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
};

/** Build a half-open range [start, end) from inclusive "from"/"to" strings. */
const buildRange = (from, to) => {
  const start = parseDate(from);
  const last = parseDate(to);
  if (!start || !last || last < start) return null;
  return { start, end: addDays(last, 1) };
};

/** Range for a calendar month. month is 1-12. */
const monthRange = (year, month) => ({
  start: new Date(Date.UTC(year, month - 1, 1)),
  end: new Date(Date.UTC(year, month, 1)),
});

/**
 * Number of days that count towards an average. For ranges that include today
 * we only count days elapsed so far, so averages are not diluted by future days.
 */
const effectiveEnd = (end) => {
  const tomorrow = addDays(startOfTodayUTC(), 1);
  return end < tomorrow ? end : tomorrow;
};

const effectiveDays = (start, end) => {
  const eEnd = effectiveEnd(end);
  return Math.max(1, Math.ceil((eEnd - start) / DAY_MS));
};

const toISODate = (d) => d.toISOString().slice(0, 10);

module.exports = {
  DAY_MS,
  parseDate,
  addDays,
  startOfTodayUTC,
  buildRange,
  monthRange,
  effectiveEnd,
  effectiveDays,
  toISODate,
};
