const { categorizeExpense, categorizeIncome } = require('./categorize');

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const MAX_ROWS = 2000;

/** RFC 4180-style parser with quoted fields; delimiter is auto-detected (comma, semicolon, tab). */
function parseCsv(text) {
  const src = String(text || '').replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/).find((l) => l.trim()) || '';
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let q = false;
  for (const ch of firstLine) {
    if (ch === '"') q = !q;
    else if (!q && ch in counts) counts[ch] += 1;
  }
  const delim = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell);
      cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows.map((r) => r.map((c) => c.trim()));
}

const HEADER_HINT = /desc|narr|partic|detail|amount|debit|credit|withdraw|deposit|title|payee|merchant/i;

function findHeaderIndex(rows) {
  for (let i = 0; i < Math.min(rows.length, 20); i += 1) {
    const r = rows[i];
    if (r.length >= 3 && r.some((c) => /date/i.test(c)) && r.some((c) => HEADER_HINT.test(c))) return i;
  }
  return 0;
}

function detectMapping(headers) {
  const find = (re, exclude) => headers.findIndex((h) => re.test(h) && !(exclude && exclude.test(h)));
  const mapping = {
    date: find(/date/i, /value|due/i),
    description: find(/desc|narr|partic|detail|remark|merchant|title|payee|memo|note/i),
    debit: find(/debit|withdraw|\bdr\b|paid out|money out/i),
    credit: find(/credit|deposit|\bcr\b|paid in|money in/i),
    amount: find(/^(amount|amt|transaction amount|value)\b/i),
    type: find(/^(type|dr\/cr|cr\/dr|transaction type)\b/i),
  };
  if (mapping.date < 0) mapping.date = find(/date/i);
  return mapping;
}

function parseAmount(s) {
  const t = String(s ?? '').trim();
  if (!t) return null;
  const negative = /^-|^\(.*\)$|dr\.?$/i.test(t);
  const num = parseFloat(t.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(num)) return null;
  return negative ? -num : num;
}

function toISO(y, m0, d) {
  const dt = new Date(Date.UTC(y, m0, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m0 && dt.getUTCDate() === d ? dt.toISOString().slice(0, 10) : null;
}

/** Decide whether numeric dates are day-first or month-first by looking at the whole column. */
function detectDateOrder(cells) {
  let ymd = 0; let dmy = 0; let mdy = 0;
  for (const c of cells) {
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(c)) { ymd += 1; continue; }
    const m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(c);
    if (m) {
      if (Number(m[1]) > 12) dmy += 1;
      else if (Number(m[2]) > 12) mdy += 1;
    }
  }
  if (ymd > 0 && ymd >= dmy && ymd >= mdy) return 'ymd';
  return mdy > dmy ? 'mdy' : 'dmy';
}

function parseDateCell(value, order) {
  const s = String(value || '').trim();
  let m;
  if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s))) return toISO(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if ((m = /^(\d{1,2})[-/. ]([A-Za-z]{3})[a-z]*[-/. ,]*(\d{2,4})/.exec(s))) {
    const mon = MONTHS[m[2].toLowerCase()];
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    return mon === undefined ? null : toISO(y, mon, Number(m[1]));
  }
  if ((m = /^([A-Za-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})/.exec(s))) {
    const mon = MONTHS[m[1].toLowerCase()];
    return mon === undefined ? null : toISO(Number(m[3]), mon, Number(m[2]));
  }
  if ((m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(s))) {
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    const [a, b] = [Number(m[1]), Number(m[2])];
    return order === 'mdy' ? toISO(y, a - 1, b) : toISO(y, b - 1, a);
  }
  return null;
}

/**
 * Parses a bank/expense-app CSV into candidate rows. Nothing is saved here.
 * Returns { rows, skipped, mapping, headers, dateOrder }.
 */
function parseBankCsv(text, { expenseCategories = [], incomeSources = [] } = {}) {
  const all = parseCsv(text);
  if (all.length < 2) return { rows: [], skipped: [], mapping: {}, headers: [], error: 'The file has no data rows.' };

  const headerIndex = findHeaderIndex(all);
  const headers = all[headerIndex];
  const mapping = detectMapping(headers);
  const body = all.slice(headerIndex + 1);

  if (mapping.date < 0) return { rows: [], skipped: [], mapping, headers, error: 'Could not find a date column.' };
  const hasAmount = mapping.amount >= 0 || mapping.debit >= 0 || mapping.credit >= 0;
  if (!hasAmount) return { rows: [], skipped: [], mapping, headers, error: 'Could not find an amount, debit or credit column.' };

  const dateOrder = detectDateOrder(body.map((r) => r[mapping.date] || ''));
  const signedAmounts = mapping.amount >= 0 ? body.map((r) => parseAmount(r[mapping.amount])).filter((n) => n !== null) : [];
  const hasNegative = signedAmounts.some((n) => n < 0);

  const rows = [];
  const skipped = [];
  body.slice(0, MAX_ROWS).forEach((r, idx) => {
    const line = headerIndex + idx + 2;
    const date = parseDateCell(r[mapping.date], dateOrder);
    if (!date) return skipped.push({ line, reason: 'Invalid or missing date' });

    let type;
    let amount;
    if (mapping.debit >= 0 || mapping.credit >= 0) {
      const debit = Math.abs(parseAmount(mapping.debit >= 0 ? r[mapping.debit] : '') || 0);
      const credit = Math.abs(parseAmount(mapping.credit >= 0 ? r[mapping.credit] : '') || 0);
      if (debit > 0) { type = 'expense'; amount = debit; } else if (credit > 0) { type = 'income'; amount = credit; }
    }
    if (!type && mapping.amount >= 0) {
      const v = parseAmount(r[mapping.amount]);
      if (v) {
        amount = Math.abs(v);
        const t = mapping.type >= 0 ? String(r[mapping.type] || '') : '';
        if (/\b(dr|debit|withdraw|expense|out)\b/i.test(t)) type = 'expense';
        else if (/\b(cr|credit|deposit|income|in)\b/i.test(t)) type = 'income';
        else if (hasNegative) type = v < 0 ? 'expense' : 'income';
        else type = 'expense';
      }
    }
    if (!type || !(amount > 0)) return skipped.push({ line, reason: 'No amount' });

    const title = (mapping.description >= 0 ? r[mapping.description] : '').replace(/\s+/g, ' ').trim().slice(0, 100) || 'Imported transaction';
    const category = type === 'expense' ? categorizeExpense(title, expenseCategories) : categorizeIncome(title, incomeSources);
    rows.push({ line, date, title, amount: Math.round(amount * 100) / 100, type, category });
  });
  if (body.length > MAX_ROWS) skipped.push({ line: MAX_ROWS + headerIndex + 2, reason: `Only the first ${MAX_ROWS} rows are imported` });

  return { rows, skipped, mapping, headers, dateOrder };
}

module.exports = { parseCsv, parseBankCsv, parseAmount, parseDateCell, detectDateOrder, MAX_ROWS };
