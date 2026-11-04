import { useEffect } from 'react';
import { getUpcomingReminders, REMINDER_KIND_LABEL } from '../utils/reminders.js';
import { formatCurrency } from '../utils/debtCalc.js';

const NOTIFIED_KEY = 'financeos_notified_reminders';
const PRUNE_AFTER_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

/**
 * Fires local/OS notifications for reminders due within the user's
 * configured window. Runs once data has loaded and again whenever the
 * tab/app regains focus — covers "left it open overnight" and "reopened
 * the installed PWA" without needing a backend push service. Dedupes via
 * localStorage so the same due-date instance never notifies twice.
 */
export function useReminders(state, ready) {
  useEffect(() => {
    if (!ready) return;
    if (!state.settings.notificationsEnabled) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    checkAndNotify(state);

    const onVisible = () => {
      if (document.visibilityState === 'visible') checkAndNotify(state);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // Re-run whenever the underlying data changes (new debt due day set,
    // reminder window changed, etc.) as well as on focus.
  }, [ready, state]);
}

function readNotified() {
  try {
    return JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeNotified(map) {
  const cutoff = Date.now() - PRUNE_AFTER_MS;
  Object.keys(map).forEach((k) => { if (map[k] < cutoff) delete map[k]; });
  try { localStorage.setItem(NOTIFIED_KEY, JSON.stringify(map)); } catch {}
}

function checkAndNotify(state) {
  const windowDays = Number(state.settings.reminderDaysBefore) || 3;
  const reminders = getUpcomingReminders(state, { withinDays: windowDays });
  const due = reminders.filter((r) => r.days <= windowDays && r.days >= 0);
  if (due.length === 0) return;

  const notified = readNotified();
  let changed = false;

  due.forEach((r) => {
    const key = `${r.id}-${r.dueDate}`;
    if (notified[key]) return;
    fireNotification(r);
    notified[key] = Date.now();
    changed = true;
  });

  if (changed) writeNotified(notified);
}

async function fireNotification(reminder) {
  const title = reminder.kind === 'savings'
    ? `Savings goal deadline: ${reminder.name}`
    : `${REMINDER_KIND_LABEL[reminder.kind] || 'Payment'} due soon: ${reminder.name}`;

  const whenText = reminder.days === 0 ? 'Due today' : reminder.days === 1 ? 'Due tomorrow' : `Due in ${reminder.days} days`;
  const body = reminder.amount ? `${whenText} · ${formatCurrency(reminder.amount)}` : whenText;

  const options = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: `${reminder.id}-${reminder.dueDate}`, // dedupes at the OS level too
  };

  // Prefer the service worker (works for the installed PWA, backgrounded
  // tab support, consistent icon handling); fall back to a plain
  // Notification if no service worker is available for some reason.
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg) {
        await reg.showNotification(title, options);
        return;
      }
    } catch {
      // fall through to plain Notification
    }
  }

  try { new Notification(title, options); } catch {}
}
