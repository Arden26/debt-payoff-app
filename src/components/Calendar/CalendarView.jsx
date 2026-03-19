import { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext.jsx';
import { fmt, monthISO, getRecurringOccurrences, daysUntil, todayISO } from '../../utils/formatters.js';
import { getCategoryConfig } from '../../utils/categoryConfig.js';

const DOT_COLORS = {
  income: '#10b981',
  expense: '#ef4444',
  bill: '#f97316',
  subscription: '#8b5cf6',
  savings: '#3b82f6',
};

export function CalendarView() {
  const { state } = useFinance();
  const today = todayISO();
  const [viewMonth, setViewMonth] = useState(monthISO(new Date()));
  const [selectedDay, setSelectedDay] = useState(null);

  const [year, month] = viewMonth.split('-').map(Number);

  const changeMonth = (dir) => {
    const d = new Date(year, month - 1 + dir, 1);
    setViewMonth(monthISO(d));
    setSelectedDay(null);
  };

  // Build event map: { 'YYYY-MM-DD': [event, ...] }
  const eventMap = useMemo(() => {
    const map = {};

    const add = (date, event) => {
      if (!map[date]) map[date] = [];
      map[date].push(event);
    };

    // Transactions
    state.transactions
      .filter((t) => t.date?.startsWith(viewMonth))
      .forEach((t) => {
        const cat = getCategoryConfig(t.category, t.type);
        add(t.date, { type: t.type, label: t.name, amount: t.amount, icon: cat.icon, color: DOT_COLORS[t.type], id: t.id });
      });

    // Recurring items — compute occurrences in this month
    state.recurringItems.filter((r) => r.isActive).forEach((r) => {
      const dates = getRecurringOccurrences(r, viewMonth);
      dates.forEach((date) => {
        add(date, {
          type: r.type,
          label: r.name,
          amount: r.amount,
          icon: r.type === 'income' ? '💰' : r.type === 'subscription' ? '🔄' : '📄',
          color: r.color || DOT_COLORS[r.type] || '#94a3b8',
          recurring: true,
          id: r.id,
        });
      });
    });

    return map;
  }, [state.transactions, state.recurringItems, viewMonth]);

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = [];

  // Leading empty cells
  for (let i = 0; i < firstDay; i++) days.push(null);
  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${viewMonth}-${String(d).padStart(2, '0')}`;
    days.push({ day: d, iso });
  }

  const selectedEvents = selectedDay ? (eventMap[selectedDay] || []) : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="btn-ghost p-1.5">←</button>
          <span className="text-sm font-semibold text-slate-700 min-w-[120px] text-center">
            {new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => changeMonth(1)} className="btn-ghost p-1.5">→</button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[['income', 'Income'], ['expense', 'Expense'], ['bill', 'Bill'], ['subscription', 'Subscription']].map(([type, label]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DOT_COLORS[type] }} />
            <span className="text-slate-500">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Calendar grid */}
        <div className="card p-3">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-px bg-slate-100">
            {days.map((cell, i) => {
              if (!cell) return <div key={`empty-${i}`} className="bg-white h-16 sm:h-20" />;
              const events = eventMap[cell.iso] || [];
              const isToday = cell.iso === today;
              const isSelected = cell.iso === selectedDay;
              const hasIncome = events.some((e) => e.type === 'income');
              const hasExpense = events.some((e) => e.type === 'expense');
              const hasBill = events.some((e) => e.type === 'bill' || e.type === 'subscription');

              return (
                <button
                  key={cell.iso}
                  onClick={() => setSelectedDay(isSelected ? null : cell.iso)}
                  className={`bg-white h-16 sm:h-20 p-1 flex flex-col items-center transition-colors hover:bg-blue-50 ${
                    isSelected ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' : ''
                  }`}
                >
                  <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                    isToday ? 'bg-blue-600 text-white' : 'text-slate-700'
                  }`}>
                    {cell.day}
                  </span>
                  <div className="flex flex-wrap gap-0.5 justify-center">
                    {hasIncome && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DOT_COLORS.income }} />}
                    {hasExpense && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DOT_COLORS.expense }} />}
                    {hasBill && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DOT_COLORS.bill }} />}
                    {events.length > 3 && <span className="text-[9px] text-slate-400">+{events.length - 3}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day detail panel */}
        <div className="card p-4">
          {selectedDay ? (
            <>
              <h3 className="font-semibold text-slate-800 mb-3">{fmt.date(selectedDay)}</h3>
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Nothing scheduled</p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((ev, i) => (
                    <div key={`${ev.id}-${i}`} className="flex items-center gap-2.5 py-1.5 border-b border-slate-50 last:border-0">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style={{ backgroundColor: ev.color + '20' }}>
                        {ev.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-700 truncate">{ev.label}</div>
                        <div className="text-xs text-slate-400 capitalize">
                          {ev.recurring ? `Recurring ${ev.type}` : ev.type}
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${ev.type === 'income' ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {ev.type === 'income' ? '+' : '−'}{fmt.currency(ev.amount)}
                      </span>
                    </div>
                  ))}

                  {/* Day totals */}
                  {selectedEvents.length > 1 && (
                    <div className="pt-2 border-t border-slate-100">
                      {(() => {
                        const inSum = selectedEvents.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0);
                        const outSum = selectedEvents.filter((e) => e.type !== 'income').reduce((s, e) => s + e.amount, 0);
                        return (
                          <div className="text-xs space-y-0.5">
                            {inSum > 0 && <div className="flex justify-between text-emerald-600"><span>In</span><span>+{fmt.currency(inSum)}</span></div>}
                            {outSum > 0 && <div className="flex justify-between text-red-500"><span>Out</span><span>−{fmt.currency(outSum)}</span></div>}
                            <div className={`flex justify-between font-semibold ${inSum - outSum >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              <span>Net</span><span>{fmt.currency(inSum - outSum)}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <span className="text-3xl mb-2">📅</span>
              <p className="text-sm text-slate-400">Click a day to see events</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
