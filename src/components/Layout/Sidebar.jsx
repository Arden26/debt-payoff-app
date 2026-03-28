import { useState } from 'react';
import { useFinance } from '../../context/FinanceContext.jsx';

const NAV_ITEMS = [
  { id: 'dashboard',      label: 'Dashboard',     icon: '⚡' },
  { id: 'transactions',   label: 'Transactions',  icon: '↕️' },
  { id: 'budget',         label: 'Budget',        icon: '📊' },
  { id: 'savings',        label: 'Savings',       icon: '🏦' },
  { id: 'subscriptions',  label: 'Recurring',     icon: '🔄' },
  { id: 'calendar',       label: 'Calendar',      icon: '📅' },
  { id: 'debt',           label: 'Debt Payoff',   icon: '💳' },
];

const DB_STATUS = {
  connected:  { dot: 'bg-emerald-400', text: 'Cloud synced',   pulse: false },
  connecting: { dot: 'bg-amber-400 animate-pulse', text: 'Connecting…', pulse: true },
  offline:    { dot: 'bg-slate-300',   text: 'Saved locally',  pulse: false },
};

function DbIndicator() {
  const { dbStatus } = useFinance();
  const cfg = DB_STATUS[dbStatus] ?? DB_STATUS.connecting;
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      <span className="text-[10px] text-slate-400">{cfg.text}</span>
    </div>
  );
}

function DataMenu({ onClose }) {
  const { exportData, exportTransactionsCSV, importData, resetAll, dispatch, sessionId } = useFinance();
  const [confirming, setConfirming] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncId, setSyncId] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [copied, setCopied] = useState(false);

  function handleCopyId() {
    if (!sessionId) return;
    navigator.clipboard?.writeText(sessionId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleSync() {
    const sid = syncId.trim();
    if (!sid) return;
    setSyncStatus('loading');
    try {
      const res = await fetch(`/api/load?sessionId=${encodeURIComponent(sid)}`);
      const { data } = await res.json();
      if (data && (data.transactions?.length || data.debts?.length || data.recurringItems?.length)) {
        localStorage.setItem('financeos_session_id', sid);
        dispatch({ type: 'HYDRATE', payload: data });
        setSyncStatus('ok');
        setTimeout(() => { onClose(); }, 800);
      } else {
        setSyncStatus('notfound');
      }
    } catch {
      setSyncStatus('error');
    }
  }

  return (
    <div className="absolute bottom-12 left-3 right-3 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
      <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100">
        Data
      </div>
      <button
        onClick={() => { exportTransactionsCSV(); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span>📊</span> Export transactions (.csv)
      </button>
      <button
        onClick={() => { exportData(); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span>⬇️</span> Export backup (.json)
      </button>
      <button
        onClick={() => { importData(); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span>⬆️</span> Import backup (.json)
      </button>

      {/* Sync between devices */}
      <div className="border-t border-slate-100">
        {syncing ? (
          <div className="px-3 py-2.5">
            {/* Show current ID for copying */}
            <p className="text-xs text-slate-600 font-medium mb-1">Your sync ID (this device)</p>
            <div className="flex gap-1.5 mb-3">
              <code className="flex-1 text-[10px] bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono truncate text-slate-500">
                {sessionId ?? '—'}
              </code>
              <button
                onClick={handleCopyId}
                className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-medium whitespace-nowrap"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            {/* Accept ID from other device */}
            <p className="text-xs text-slate-600 font-medium mb-1">Load from another device</p>
            <p className="text-[10px] text-slate-400 mb-1.5">Paste the sync ID from your other device to pull its data here.</p>
            <input
              className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg mb-2 font-mono"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={syncId}
              onChange={e => { setSyncId(e.target.value); setSyncStatus(''); }}
            />
            {syncStatus === 'notfound' && <p className="text-[10px] text-amber-600 mb-1">No data found for that ID.</p>}
            {syncStatus === 'error' && <p className="text-[10px] text-red-500 mb-1">Connection error. Try again.</p>}
            {syncStatus === 'ok' && <p className="text-[10px] text-emerald-600 mb-1">✓ Synced!</p>}
            <div className="flex gap-2">
              <button
                onClick={handleSync}
                disabled={syncStatus === 'loading' || !syncId.trim()}
                className="flex-1 py-1.5 text-xs bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {syncStatus === 'loading' ? 'Loading…' : 'Load data'}
              </button>
              <button onClick={() => setSyncing(false)} className="flex-1 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg font-medium">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setSyncing(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <span>📱</span> Sync between devices
          </button>
        )}
      </div>

      <div className="border-t border-slate-100">
        {confirming ? (
          <div className="px-3 py-2.5">
            <p className="text-xs text-rose-600 font-medium mb-2">Erase all data? This cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => { resetAll(); onClose(); }}
                className="flex-1 py-1.5 text-xs bg-rose-600 text-white rounded-lg font-medium"
              >
                Yes, erase
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-rose-500 hover:bg-rose-50 transition-colors"
          >
            <span>🗑️</span> Erase all data
          </button>
        )}
      </div>
    </div>
  );
}

export function Sidebar({ current, onChange }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-slate-100 shrink-0 h-screen sticky top-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-100">
          <span className="text-2xl">💸</span>
          <div>
            <div className="font-bold text-slate-900 text-base leading-none">FinanceOS</div>
            <div className="text-xs text-slate-400 mt-0.5">No tracking · No ads</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                current === item.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer with backup */}
        <div className="p-3 border-t border-slate-100 relative">
          {showMenu && <DataMenu onClose={() => setShowMenu(false)} />}
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <span>💾</span> Backup / Restore
            </span>
            <span className="text-slate-300">{showMenu ? '▼' : '▲'}</span>
          </button>
          <DbIndicator />
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 safe-area-inset-bottom">
        <div className="flex">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => { onChange(item.id); setShowMobileMenu(false); }}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                current === item.id ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="truncate max-w-[48px] text-[10px]">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setShowMobileMenu((v) => !v)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
              showMobileMenu ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            <span className="text-lg leading-none">⚙️</span>
            <span className="text-[10px]">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile data menu overlay */}
      {showMobileMenu && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/20"
            onClick={() => setShowMobileMenu(false)}
          />
          <div className="lg:hidden fixed bottom-14 left-3 right-3 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Data & Backup</span>
              <DbIndicator />
            </div>
            <DataMenu onClose={() => setShowMobileMenu(false)} />
          </div>
        </>
      )}
    </>
  );
}
