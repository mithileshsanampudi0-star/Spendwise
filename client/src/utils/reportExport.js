import { formatDate } from './format';

const download = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const csvCell = (value) => {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const periodLabel = (period) =>
  period.from === period.to ? formatDate(period.from) : `${formatDate(period.from)} to ${formatDate(period.to)}`;

export const exportCSV = (report) => {
  const header = ['Date', 'Type', 'Title', 'Category / Source', 'Amount', 'Payment Method', 'Description'];
  const day = (d) => new Date(d).toISOString().slice(0, 10);
  const rows = [
    ...report.expenses.map((e) => [day(e.date), 'Expense', e.title, e.category, e.amount, e.paymentMethod, e.description]),
    ...(report.incomes || []).map((e) => [day(e.date), 'Income', e.title, e.category, e.amount, '', e.description]),
  ].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(','));
  lines.push('', `Period,${csvCell(periodLabel(report.period))}`);
  lines.push(`Total income,${report.totalIncome ?? 0}`, `Total expenses,${report.totalExpenses}`, `Net,${report.net ?? -report.totalExpenses}`, `Expense transactions,${report.transactionCount}`);
  // BOM so Excel opens UTF-8 correctly
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  download(blob, `spendwise-report-${report.period.from}_to_${report.period.to}.csv`);
};

// jsPDF's built-in fonts cannot draw currency symbols such as the rupee sign, so we use ISO codes.
const money = (n, currency) =>
  `${currency} ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const exportPDF = async (report) => {
  // Loaded on demand: jsPDF is large and only needed when someone actually downloads a PDF.
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const cur = report.currency;
  let y = 0;

  const header = () => {
    doc.setFillColor(16, 24, 39);
    doc.rect(0, 0, W, 90, 'F');
    doc.setFillColor(76, 201, 240);
    doc.rect(0, 90, W, 3, 'F');
    doc.setTextColor(241, 245, 249);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('SpendWise', M, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('Expense Report', M, 60);
    doc.setTextColor(241, 245, 249);
    doc.text(`Period: ${periodLabel(report.period)}`, W - M, 42, { align: 'right' });
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${formatDate(new Date())}`, W - M, 60, { align: 'right' });
    doc.setTextColor(30, 41, 59);
    y = 120;
  };

  const ensure = (need) => {
    if (y + need > H - 50) {
      doc.addPage();
      header();
    }
  };

  header();

  // Summary tiles
  const tiles = [
    ['Income', money(report.totalIncome ?? 0, cur)],
    ['Expenses', money(report.totalExpenses, cur)],
    ['Net', money(report.net ?? -report.totalExpenses, cur)],
    ['Transactions', String(report.transactionCount)],
  ];
  const tw = (W - M * 2 - 30) / 4;
  tiles.forEach(([label, value], i) => {
    const x = M + i * (tw + 10);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, y, tw, 58, 6, 6, 'F');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x + 12, y + 20);
    doc.setFontSize(i < 3 ? 10.5 : 14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(value, x + 12, y + 42);
    doc.setFont('helvetica', 'normal');
  });
  y += 85;

  // Category distribution
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('Category distribution', M, y);
  y += 18;
  report.categories.forEach((c) => {
    ensure(24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(c.category, M, y + 9);
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(M + 140, y, 200, 10, 3, 3, 'F');
    doc.setFillColor(76, 201, 240);
    doc.roundedRect(M + 140, y, Math.max(3, (200 * c.percentage) / 100), 10, 3, 3, 'F');
    doc.text(`${c.percentage}%`, M + 350, y + 9);
    doc.text(money(c.total, cur), W - M, y + 9, { align: 'right' });
    y += 22;
  });
  if (!report.categories.length) {
    doc.setFontSize(10);
    doc.text('No expenses recorded in this period.', M, y + 8);
    y += 22;
  }

  // Transactions table
  y += 16;
  ensure(60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('Transactions', M, y);
  y += 14;

  const cols = { date: M, title: M + 70, cat: M + 270, pay: M + 370, amt: W - M };
  const tableHead = () => {
    doc.setFillColor(16, 24, 39);
    doc.rect(M - 6, y, W - M * 2 + 12, 20, 'F');
    doc.setFontSize(9);
    doc.setTextColor(241, 245, 249);
    doc.text('Date', cols.date, y + 13);
    doc.text('Title', cols.title, y + 13);
    doc.text('Category', cols.cat, y + 13);
    doc.text('Payment', cols.pay, y + 13);
    doc.text('Amount', cols.amt, y + 13, { align: 'right' });
    y += 20;
  };
  tableHead();

  const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}...` : text);
  doc.setFont('helvetica', 'normal');
  report.expenses.forEach((e, i) => {
    if (y + 22 > H - 50) {
      doc.addPage();
      header();
      tableHead();
      doc.setFont('helvetica', 'normal');
    }
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(M - 6, y, W - M * 2 + 12, 20, 'F');
    }
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(formatDate(e.date, { day: '2-digit', month: 'short' }), cols.date, y + 13);
    doc.text(clip(e.title, 34), cols.title, y + 13);
    doc.text(clip(e.category, 18), cols.cat, y + 13);
    doc.text(e.paymentMethod, cols.pay, y + 13);
    doc.text(money(e.amount, cur), cols.amt, y + 13, { align: 'right' });
    y += 20;
  });

  if (report.truncated) {
    ensure(30);
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('Only the first 5,000 transactions are listed. Totals above cover the whole period.', M, y + 18);
  }

  // Footer with page numbers
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`SpendWise - Page ${p} of ${pages}`, W / 2, H - 24, { align: 'center' });
  }

  doc.save(`spendwise-report-${report.period.from}_to_${report.period.to}.pdf`);
};
