const DAY_MS = 86400000;
const daysInMonth = (year, monthIndex0) => new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();

/**
 * Next occurrence after `date`. For monthly/yearly rules `anchorDay` is the original day of month,
 * so a rule started on the 31st lands on the last day of shorter months and returns to the 31st later.
 */
function nextOccurrence(date, frequency, anchorDay) {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const anchor = anchorDay || d.getUTCDate();

  if (frequency === 'weekly') return new Date(d.getTime() + 7 * DAY_MS);
  if (frequency === 'monthly') {
    const ny = m === 11 ? y + 1 : y;
    const nm = (m + 1) % 12;
    return new Date(Date.UTC(ny, nm, Math.min(anchor, daysInMonth(ny, nm))));
  }
  if (frequency === 'yearly') {
    return new Date(Date.UTC(y + 1, m, Math.min(anchor, daysInMonth(y + 1, m))));
  }
  throw new Error(`Unsupported frequency: ${frequency}`);
}

module.exports = { nextOccurrence, daysInMonth };
