const NAV_ITEMS = [
  { id: 'dashboard',      label: 'Dashboard',     icon: '⚡' },
  { id: 'transactions',   label: 'Transactions',  icon: '↕️' },
  { id: 'budget',         label: 'Budget',        icon: '📊' },
  { id: 'savings',        label: 'Savings',       icon: '🏦' },
  { id: 'subscriptions',  label: 'Recurring',     icon: '🔄' },
  { id: 'calendar',       label: 'Calendar',      icon: '📅' },
  { id: 'debt',           label: 'Debt Payoff',   icon: '💳' },
];

export function Sidebar({ current, onChange }) {
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

        <div className="p-3 border-t border-slate-100 text-xs text-slate-400 text-center">
          All data stored locally
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
