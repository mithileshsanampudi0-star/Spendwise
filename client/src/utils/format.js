export const CURRENCIES = [
  { code: 'INR', label: 'Indian Rupee (INR)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'AUD', label: 'Australian Dollar (AUD)' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)' },
  { code: 'JPY', label: 'Japanese Yen (JPY)' },
  { code: 'SGD', label: 'Singapore Dollar (SGD)' },
];

export const PAYMENT_METHODS = ['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Net Banking', 'Other'];

export const formatCurrency = (amount, currency = 'INR', compact = false) => {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: n % 1 === 0 || compact ? 0 : 2,
      ...(compact ? { notation: 'compact' } : {}),
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
};

export const formatDate = (value, opts = { day: '2-digit', month: 'short', year: 'numeric' }) => {
  if (!value) return '-';
  const d = new Date(value);
  return new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'UTC' }).format(d);
};

export const monthLabel = (month) => {
  const [y, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
};

/** "2026-11" / "2026-11-05" / "2026-W45" labels -> short chart label */
export const shortLabel = (label) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) return label.slice(8) + ' ' + new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(new Date(label));
  if (/^\d{4}-\d{2}$/.test(label)) {
    const [y, m] = label.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(new Date(y, m - 1, 1));
  }
  if (/^\d{4}-W\d{2}$/.test(label)) return label.slice(5);
  return label;
};

export const formatPercent = (n, digits = 0) => `${Number(n || 0).toFixed(digits)}%`;
