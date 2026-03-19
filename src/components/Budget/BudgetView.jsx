import { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext.jsx';
import { fmt, monthISO } from '../../utils/formatters.js';

export function BudgetView() {
  const { state, dispatch } = useFinance();
  const [month, setMonth] = useState(monthISO(new Date()));
  const [editingLimit, setEditingLimit] = useState(null); // { name, limit }

  const changeMonth = (dir) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setMonth(monthISO(d));
  };

  // Actual spending per category this month
  const spentByCategory = useMemo(() => {
    const map = {};
    state.transactions
      .filter((t) => t.type === 'expense' && t.date?.startsWith(month))
      .forEach((t) => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return map;
  }, [state.transactions, month]);

  const totalBudget = state.budgetCategories.reduce((s, c) => s + (c.limit || 0), 0);
  const totalSpent = Object.values(spentByCategory).reduce((s, v) => s + v, 0);

  const saveLimit = (name, limit) => {
    dispatch({ type: 'UPDATE_BUDGET_CATEGORY', payload: { name, limit: parseFloat(limit) || 0 } });
    setEditingLimit(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Budget</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="btn-ghost p-1.5">←</button>
          <span className="text-sm font-semibold text-slate-700">
            {new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </span>
          <button onClick={() => changeMonth(1)} className="btn-ghost p-1.5">→</button>
        </div>
      </div>

      {/* Overall summary */}
      <div className="card p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-600 font-medium">Total Budget</span>
          <span className="font-bold text-slate-800">
            {fmt.currency(totalSpent)} / {totalBudget > 0 ? fmt.currency(totalBudget) : 'No limit set'}
          </span>
        </div>
        {totalBudget > 0 && (
          <>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${totalSpent > totalBudget ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, (totalSpent / totalBudget) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>{fmt.percent((totalSpent / totalBudget) * 100)} used</span>
              <span>{totalSpent <= totalBudget ? `${fmt.currency(totalBudget - totalSpent)} remaining` : `${fmt.currency(totalSpent - totalBudget)} over budget`}</span>
            </div>
          </>
        )}
        {totalBudget === 0 && (
          <p className="text-xs text-slate-400 mt-1">Click the pencil icon on any category to set a budget limit.</p>
        )}
      </div>

      {/* Category rows */}
      <div className="card divide-y divide-slate-50">
        {state.budgetCategories.map((cat) => {
          const spent = spentByCategory[cat.name] || 0;
          const limit = cat.limit || 0;
          const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
          const isOver = limit > 0 && spent > limit;
          const hasSpending = spent > 0;

          return (
            <div key={cat.name} className="px-4 py-3">
              {editingLimit?.name === cat.name ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-sm font-medium text-slate-700 flex-1">{cat.name}</span>
                  <span className="text-xs text-slate-400">$</span>
                  <input
                    className="input w-28 py-1 text-sm"
                    type="number"
                    min="0"
                    step="50"
                    defaultValue={editingLimit.limit}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveLimit(cat.name, e.target.value);
                      if (e.key === 'Escape') setEditingLimit(null);
                    }}
                    onBlur={(e) => saveLimit(cat.name, e.target.value)}
                  />
                  <button onClick={() => setEditingLimit(null)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-sm font-medium text-slate-700 flex-1">{cat.name}</span>
                    {isOver && <span className="badge badge-red text-xs">Over!</span>}
                    <span className={`text-sm font-semibold ${isOver ? 'text-red-500' : hasSpending ? 'text-slate-700' : 'text-slate-400'}`}>
                      {fmt.currency(spent)}
                      {limit > 0 && <span className="text-xs font-normal text-slate-400"> / {fmt.currency(limit)}</span>}
                    </span>
                    <button
                      onClick={() => setEditingLimit({ name: cat.name, limit: cat.limit })}
                      className="p-1 text-slate-300 hover:text-slate-600 transition-colors"
                      title="Set budget limit"
                    >
                      ✏️
                    </button>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden ml-7">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : ''}`}
                      style={{
                        width: limit > 0 ? `${pct}%` : hasSpending ? '100%' : '0%',
                        backgroundColor: isOver ? '#ef4444' : cat.color,
                        opacity: !hasSpending && !limit ? 0.3 : 1,
                      }}
                    />
                  </div>
                  {limit > 0 && !isOver && (
                    <div className="text-xs text-slate-400 mt-0.5 ml-7">
                      {fmt.currency(limit - spent)} remaining
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center text-slate-400">
        Budget limits are per month. Spending pulled from your transactions automatically.
      </p>
    </div>
  );
}
