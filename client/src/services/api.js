import axios from 'axios';

// Auth lives in an httpOnly cookie set by the server, so no token is ever stored in JavaScript.
const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  // Server requires this header on cookie-authenticated writes (CSRF protection).
  headers: { 'X-Requested-With': 'SpendWise' },
});

const localISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// "Today" is the user's today, not the server's, so late-night entries and recurring runs land on the right day.
http.interceptors.request.use((config) => {
  config.headers['X-Client-Date'] = localISO();
  return config;
});

const PUBLIC_AUTH = ['/auth/login', '/auth/register', '/auth/demo', '/auth/forgot-password', '/auth/reset-password', '/auth/logout'];

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    if (err.response?.status === 401 && !PUBLIC_AUTH.some((p) => url.startsWith(p))) {
      window.dispatchEvent(new Event('spendwise:unauthorized'));
    }
    return Promise.reject(err);
  }
);

export const getErrorMessage = (err) =>
  err?.response?.data?.message || (err?.request ? 'Cannot reach the server. Is the API running?' : err?.message) || 'Something went wrong';

const data = (promise) => promise.then((r) => r.data.data);
const envelope = (promise) => promise.then((r) => r.data);

export const authApi = {
  register: (body) => data(http.post('/auth/register', body)),
  login: (body) => data(http.post('/auth/login', body)),
  demo: () => data(http.post('/auth/demo')),
  logout: () => envelope(http.post('/auth/logout')),
  me: () => data(http.get('/auth/me')),
  updateProfile: (body) => data(http.put('/auth/me', body)),
  changePassword: (body) => envelope(http.put('/auth/password', body)),
  forgotPassword: (body) => envelope(http.post('/auth/forgot-password', body)),
  resetPassword: (body) => envelope(http.post('/auth/reset-password', body)),
};

const transactions = (base) => ({
  // Returns the full envelope: { data, pagination, summary }
  list: (params) => envelope(http.get(base, { params })),
  get: (id) => data(http.get(`${base}/${id}`)),
  create: (body) => data(http.post(base, body)),
  update: (id, body) => data(http.put(`${base}/${id}`, body)),
  remove: (id) => envelope(http.delete(`${base}/${id}`)),
  restore: (id) => data(http.post(`${base}/${id}/restore`)),
});

export const expenseApi = transactions('/expenses');
export const incomeApi = transactions('/income');

export const recurringApi = {
  list: () => data(http.get('/recurring')),
  create: (body) => data(http.post('/recurring', body)),
  update: (id, body) => data(http.put(`/recurring/${id}`, body)),
  remove: (id) => envelope(http.delete(`/recurring/${id}`)),
  detected: () => data(http.get('/recurring/detected')),
  run: () => data(http.post('/recurring/run')),
};

export const importApi = {
  quick: (text) => data(http.post('/import/quick', { text })),
  preview: (csv) => data(http.post('/import/preview', { csv })),
  commit: (rows) => data(http.post('/import/commit', { rows })),
};

export const metaApi = { get: () => data(http.get('/meta')) };

export const analyticsApi = {
  summary: (params) => data(http.get('/analytics/summary', { params })),
  categories: (params) => data(http.get('/analytics/categories', { params })),
  trends: (params) => data(http.get('/analytics/trends', { params })),
  comparison: (params) => data(http.get('/analytics/comparison', { params })),
  cashflow: (params) => data(http.get('/analytics/cashflow', { params })),
  forecast: (params) => data(http.get('/analytics/forecast', { params })),
  health: (params) => data(http.get('/analytics/health', { params })),
  heatmap: (params) => data(http.get('/analytics/heatmap', { params })),
};

export const budgetApi = {
  list: (params) => data(http.get('/budgets', { params })),
  create: (body) => data(http.post('/budgets', body)),
  update: (id, body) => data(http.put(`/budgets/${id}`, body)),
  remove: (id) => envelope(http.delete(`/budgets/${id}`)),
};

export const categoryApi = {
  list: (params) => data(http.get('/categories', { params })),
  create: (body) => data(http.post('/categories', body)),
  update: (id, body) => data(http.put(`/categories/${id}`, body)),
  remove: (id) => envelope(http.delete(`/categories/${id}`)),
};

export const savingsApi = {
  list: () => data(http.get('/savings')),
  create: (body) => data(http.post('/savings', body)),
  update: (id, body) => data(http.put(`/savings/${id}`, body)),
  remove: (id) => envelope(http.delete(`/savings/${id}`)),
};

export const debtApi = {
  // Returns { debts, summary } so the page gets the totals in one request.
  list: () => http.get('/debts').then((r) => ({ debts: r.data.data, summary: r.data.summary })),
  create: (body) => data(http.post('/debts', body)),
  update: (id, body) => data(http.put(`/debts/${id}`, body)),
  remove: (id) => envelope(http.delete(`/debts/${id}`)),
  addPayment: (id, body) => data(http.post(`/debts/${id}/payments`, body)),
  removePayment: (id, paymentId) => data(http.delete(`/debts/${id}/payments/${paymentId}`)),
};

// Downloads a file from the API (cookie auth), then saves it through a temporary link.
const download = async (path, fallbackName) => {
  const res = await http.get(path, { responseType: 'blob' });
  const match = /filename="?([^"]+)"?/.exec(res.headers['content-disposition'] || '');
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = match?.[1] || fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const backupApi = {
  json: () => download('/backup', 'spendwise-backup.json'),
  csv: () => download('/backup/transactions.csv', 'spendwise-transactions.csv'),
};

export const reportApi = {
  monthly: (params) => data(http.get('/reports/monthly', { params })),
};

export const insightsApi = {
  get: (params) => data(http.get('/insights', { params })),
};
