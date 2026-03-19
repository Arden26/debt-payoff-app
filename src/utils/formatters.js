export const fmt = {
  currency: (n = 0) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n),
  currencyExact: (n = 0) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n),
  percent: (n = 0) => `${Math.round(n)}%`,
  date: (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  dateShort: (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  monthYear: (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  monthShort: (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
};

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function monthISO(date = new Date()) {
  return date.toISOString().slice(0, 7); // YYYY-MM
}

export function addMonths(isoDate, n) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

export function addDays(isoDate, n) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysUntil(isoDate) {
  const diff = new Date(isoDate + 'T00:00:00') - new Date(todayISO() + 'T00:00:00');
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isSameMonth(isoDate, isoMonth) {
  return isoDate?.startsWith(isoMonth);
}

/** Given a recurring item's nextDate + frequency, return all occurrence dates in a given YYYY-MM month */
export function getRecurringOccurrences(item, yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 0); // last day of month
  const dates = [];

  let cursor = new Date(item.nextDate + 'T00:00:00');
  // Walk backward to find first occurrence <= monthStart if needed
  const freqDays = FREQ_DAYS[item.frequency] || 30;

  // Rewind cursor to earliest possible
  while (cursor > monthStart) {
    cursor = new Date(cursor.getTime() - freqDays * 86400000);
  }
  // Step forward to find occurrences inside the month
  while (cursor <= monthEnd) {
    if (cursor >= monthStart) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor = new Date(cursor.getTime() + freqDays * 86400000);
  }
  return dates;
}

export const FREQ_DAYS = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 91,
  yearly: 365,
};

export const FREQ_LABELS = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

/** Monthly cost of a recurring item */
export function monthlyEquivalent(amount, frequency) {
  const map = { weekly: 52 / 12, biweekly: 26 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };
  return amount * (map[frequency] ?? 1);
}

export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}
