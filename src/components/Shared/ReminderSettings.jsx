import { useState } from 'react';
import { useFinance } from '../../context/FinanceContext.jsx';

const SUPPORTED = typeof window !== 'undefined' && 'Notification' in window;

export function ReminderSettings({ inline = false }) {
  const { state, dispatch } = useFinance();
  const { notificationsEnabled, reminderDaysBefore } = state.settings;
  const [permission, setPermission] = useState(SUPPORTED ? Notification.permission : 'unsupported');
  const [requesting, setRequesting] = useState(false);

  const setSetting = (payload) => dispatch({ type: 'UPDATE_SETTINGS', payload });

  const handleToggle = async () => {
    if (!SUPPORTED) return;

    if (notificationsEnabled) {
      setSetting({ notificationsEnabled: false });
      return;
    }

    if (Notification.permission === 'granted') {
      setSetting({ notificationsEnabled: true });
      return;
    }

    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') setSetting({ notificationsEnabled: true });
    } finally {
      setRequesting(false);
    }
  };

  const body = (
    <div className={inline ? '' : 'p-4'}>
      <div className="flex items-center justify-between mb-1">
        <div>
          <div className="text-sm font-semibold text-slate-800">Payment Reminders</div>
          <div className="text-xs text-slate-400">Bills, subscriptions, debt due dates & savings deadlines</div>
        </div>
        {SUPPORTED ? (
          <button
            onClick={handleToggle}
            disabled={requesting || permission === 'denied'}
            role="switch"
            aria-checked={notificationsEnabled}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-40 ${
              notificationsEnabled ? 'bg-blue-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                notificationsEnabled ? 'translate-x-5' : ''
              }`}
            />
          </button>
        ) : (
          <span className="text-xs text-slate-400">Unsupported</span>
        )}
      </div>

      {!SUPPORTED && (
        <p className="text-xs text-slate-400 mt-2">
          This browser doesn't support notifications.
        </p>
      )}

      {SUPPORTED && permission === 'denied' && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5 mt-2">
          Notifications are blocked for this site. Enable them in your browser's site settings to turn this on.
        </p>
      )}

      {SUPPORTED && notificationsEnabled && permission !== 'denied' && (
        <>
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Remind me</label>
              <span className="text-xs font-semibold text-blue-600">
                {reminderDaysBefore} day{reminderDaysBefore === 1 ? '' : 's'} before
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="14"
              step="1"
              value={reminderDaysBefore}
              onChange={(e) => setSetting({ reminderDaysBefore: parseInt(e.target.value, 10) })}
            />
            <div className="flex justify-between text-xs text-slate-400 mt-0.5">
              <span>1 day</span>
              <span>14 days</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Reminders fire from this device while FinanceOS is open or running in the background — they won't arrive if the app and browser are fully closed.
          </p>
        </>
      )}
    </div>
  );

  if (inline) return body;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
      {body}
    </div>
  );
}
