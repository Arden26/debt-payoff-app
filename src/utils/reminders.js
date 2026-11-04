/**
 * Unified "what needs attention soon" list — the single source of truth
 * for both the Dashboard's upcoming-payments card and the local
 * notification engine (useReminders hook), so the two can never disagree
 * about what's due or when.
 *
 * Pulls together three kinds of dated obligations that otherwise lived in
 * separate, unconnected places:
 *   - recurring bills & subscriptions (already had nextDate/frequency)
 *   - debts with an optional payment due-day-of-month
 *   - savings goals with a deadline
 */
import { daysUntil, todayISO } from './formatters.js';

/**
 * Compute the next occurrence of a given day-of-month as a local
 * 'YYYY-MM-DD' string. Built by hand (not via toISOString) because a
 * date-only string round-tripped through toISOString() gets reinterpreted
 * as UTC and can land on the wrong day in any timezone behind UTC — the
 * exact bug already fixed twice elsewhere in this codebase.
 */
export function nextDueDateForDay(dueDay) {
  const today = new Date();
  const todayStr = todayISO();

  const clampDay = (year, monthIndex) => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    return Math.min(dueDay, daysInMonth);
  };

  const toISO = (year, monthIndex, day) =>
    `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  let year = today.getFullYear();
  let monthIndex = today.getMonth();
  let candidate = toISO(year, monthIndex, clampDay(year, monthIndex));

  if (candidate < todayStr) {
    monthIndex += 1;
    if (monthIndex > 11) { monthIndex = 0; year += 1; }
    candidate = toISO(year, monthIndex, clampDay(year, monthIndex));
  }

  return candidate;
}

/**
 * Returns upcoming reminders within `withinDays`, sorted soonest-first.
 * Each item: { id, kind: 'bill'|'subscription'|'debt'|'savings', name,
 *              amount (nullable), dueDate, days }
 */
export function getUpcomingReminders(state, { withinDays = 14 } = {}) {
  const items = [];

  // Recurring bills & subscriptions (income excluded — nothing to remind about)
  (state.recurringItems || [])
    .filter((r) => r.isActive && r.type !== 'income' && r.nextDate)
    .forEach((r) => {
      const days = daysUntil(r.nextDate);
      if (days <= withinDays) {
        items.push({
          id: `recurring-${r.id}`,
          kind: r.type === 'subscription' ? 'subscription' : 'bill',
          name: r.name,
          amount: r.amount,
          dueDate: r.nextDate,
          days,
        });
      }
    });

  // Debts with a due day set — only active (unpaid) ones
  (state.debts || [])
    .filter((d) => d.dueDay && parseFloat(d.balance) > 0)
    .forEach((d) => {
      const dueDate = nextDueDateForDay(d.dueDay);
      const days = daysUntil(dueDate);
      if (days <= withinDays) {
        items.push({
          id: `debt-${d.id}`,
          kind: 'debt',
          name: d.name,
          amount: parseFloat(d.minPayment) || null,
          dueDate,
          days,
        });
      }
    });

  // Savings goal deadlines — only goals not yet reached
  (state.savingsGoals || [])
    .filter((g) => g.deadline && (g.currentAmount || 0) < (g.targetAmount || 0))
    .forEach((g) => {
      const days = daysUntil(g.deadline);
      if (days <= withinDays) {
        items.push({
          id: `savings-${g.id}`,
          kind: 'savings',
          name: g.name,
          amount: null,
          dueDate: g.deadline,
          days,
        });
      }
    });

  return items.sort((a, b) => a.days - b.days);
}

export const REMINDER_KIND_ICON = {
  bill: '📄',
  subscription: '🔄',
  debt: '💳',
  savings: '🏦',
};

export const REMINDER_KIND_LABEL = {
  bill: 'Bill',
  subscription: 'Subscription',
  debt: 'Debt payment',
  savings: 'Savings goal',
};
