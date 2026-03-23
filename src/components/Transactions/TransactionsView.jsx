import { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext.jsx';
import { Modal } from '../Shared/Modal.jsx';
import { TransactionForm } from '../Shared/TransactionForm.jsx';
import { CSVImport } from './CSVImport.jsx';
import { EmptyState } from '../Shared/EmptyState.jsx';
import { fmt, monthISO } from '../../utils/formatters.js';
import { getCategoryConfig, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../utils/categoryConfig.js';

const ALL_CATS = ['All', ...EXPENSE_CATEGORIES.map((c) => c.name), ...INCOME_CATEGORIES.map((c) => c.name).filter((n) => n !== 'Other')];

export function TransactionsView() {
  const { state, dispatch } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState({ month: monthISO(new Date()), type: 'all', category: 'All', search: '' });

  // Navigate months
  const changeMonth = (dir) => {
    const [y, m] = filter.month.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setFilter((f) => ({ ...f, month: monthISO(d) }));
  };

  const filtered = useMemo(() => {
    return state.transactions.filter((t) => {
      if (!t.date?.startsWith(filter.month)) return false;
      if (filter.type !== 'all' && t.type !== filter.type) return false;
      if (filter.category !== 'All' && t.category !== filter.category) return false;
      if (filter.search && !t.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [state.transactions, filter]);

  const totalIncome = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const handleSave = (data) => {
    if (data.id) {
      dispatch({ type: 'UPDATE_TRANSACTION', payload: data });
    } else {
      dispatch({ type: 'ADD_TRANSACTION', payload: data });
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this transaction?')) dispatch({ type: 'DELETE_TRANSACTION', id });
  };

  // Group by date
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((t) => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Transactions</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="btn-secondary text-xs">⬆ Import CSV</button>
          <button onClick={() => setShowForm(true)} className="btn-primary text-xs">+ Add</button>
        </div>
      </div>

      {/* Month nav + summary */}
      <div className="card p-4">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => changeMonth(-1)} className="btn-ghost p-1.5">←</button>
          <span className="font-semibold text-slate-800 flex-1 text-center">
            {new Date(filter.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => changeMonth(1)} className="btn-ghost p-1.5">→</button>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs text-slate-400 mb-0.5">Income</div>
            <div className="font-bold text-emerald-600">{fmt.currency(totalIncome)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-0.5">Expenses</div>
            <div className="font-bold text-red-500">{fmt.currency(totalExpenses)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-0.5">Net</div>
            <div className={`font-bold ${totalIncome - totalExpenses >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {fmt.currency(totalIncome - totalExpenses)}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input
          className="input flex-1 min-w-[140px] text-sm py-1.5"
          placeholder="Search…"
          value={filter.search}
          onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
        />
        <select className="input w-auto text-sm py-1.5" value={filter.type} onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))}>
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expenses</option>
        </select>
        <select className="input w-auto text-sm py-1.5" value={filter.category} onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value }))}>
          {ALL_CATS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Transaction list */}
      {grouped.length === 0 ? (
        <EmptyState
          icon="↕️"
          title="No transactions"
          description="Add income or expenses to start tracking your cash flow."
          action={<button onClick={() => setShowForm(true)} className="btn-primary">+ Add Transaction</button>}
        />
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, txs]) => (
            <div key={date}>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{fmt.date(date)}</div>
              <div className="card divide-y divide-slate-50">
                {txs.map((t) => {
                  const cat = getCategoryConfig(t.category, t.type);
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 group transition-colors">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: cat.color + '20' }}>
                        {cat.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{t.name}</div>
                        <div className="text-xs text-slate-400">{t.category}{t.notes ? ` · ${t.notes}` : ''}</div>
                      </div>
                      <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {t.type === 'income' ? '+' : '−'}{fmt.currency(t.amount)}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                        <button onClick={() => setEditing(t)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">✏️</button>
                        <button onClick={() => handleDelete(t.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">🗑️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {(showForm || editing) && (
        <Modal title={editing ? 'Edit Transaction' : 'Add Transaction'} onClose={() => { setShowForm(false); setEditing(null); }}>
          <TransactionForm initialValues={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />
        </Modal>
      )}
      {showImport && (
        <Modal title="Import CSV" size="lg" onClose={() => setShowImport(false)}>
          <CSVImport onClose={() => setShowImport(false)} />
        </Modal>
      )}
    </div>
  );
}
