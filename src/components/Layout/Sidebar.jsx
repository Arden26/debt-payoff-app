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

function DataMenu({ onClose }) {
  const { exportData, exportTransactionsCSV, importData, resetAll } = useFinance();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="absolute bottom-12 left-3 right-3 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
      <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100">
        Data Backup
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
          <p className="text-center text-[10px] text-slate-300 mt-1">Stored locally on this device</p>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 safe-area-inset-bottom">
        <div className="flex">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                current === item.id ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="truncate max-w-[48px] text-[10px]">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
