// Date helpers. All dates are handled as local "YYYY-MM-DD" strings to match the API.
const pad = (n) => String(n).padStart(2, '0');

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

/** "2026-11" -> { from: "2026-11-01", to: "2026-11-30" } */
export const monthRange = (month) => {
  const [y, m] = month.split('-').map(Number);
  return { from: `${y}-${pad(m)}-01`, to: toISO(new Date(y, m, 0)) };
};

/** "2026-11" -> { month: 11, year: 2026 } */
export const splitMonth = (month) => {
  const [year, m] = month.split('-').map(Number);
  return { month: m, year };
};

export const RANGE_PRESETS = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'last3', label: 'Last 3 months' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
];

export const getRange = (preset) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case 'week': {
      const day = (now.getDay() + 6) % 7; // Monday = 0
      const start = new Date(y, m, now.getDate() - day);
      const end = new Date(y, m, now.getDate() - day + 6);
      return { from: toISO(start), to: toISO(end) };
    }
    case 'lastMonth':
      return { from: toISO(new Date(y, m - 1, 1)), to: toISO(new Date(y, m, 0)) };
    case 'last3':
      return { from: toISO(new Date(y, m - 2, 1)), to: toISO(new Date(y, m + 1, 0)) };
    case 'year':
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case 'month':
    default:
      return { from: toISO(new Date(y, m, 1)), to: toISO(new Date(y, m + 1, 0)) };
  }
};

/** Range covering the last N whole weeks up to today, starting on a Monday. */
export const lastWeeks = (n) => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (n - 1) * 7 - ((end.getDay() + 6) % 7));
  return { from: toISO(start), to: toISO(end) };
};
