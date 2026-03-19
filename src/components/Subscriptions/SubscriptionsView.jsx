import { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext.jsx';
import { Modal } from '../Shared/Modal.jsx';
import { RecurringForm } from '../Shared/RecurringForm.jsx';
import { EmptyState } from '../Shared/EmptyState.jsx';
import { fmt, daysUntil, monthlyEquivalent, FREQ_LABELS } from '../../utils/formatters.js';

export function SubscriptionsView() {
  const { state, dispatch } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const handleSave = (data) => {
    if (data.id) {
      dispatch({ type: 'UPDATE_RECURRING', payload: data });
    } else {
      dispatch({ type: 'ADD_RECURRING', payload: data });
    }
    setShowForm(false);
    setEditing(null);
  };

  const filtered = state.recurringItems.filter((r) => typeFilter === 'all' || r.type === typeFilter);

  // Group by type
  const grouped = useMemo(() => {
    const map = { income: [], subscription: [], bill: [] };
    filtered.forEach((r) => { (map[r.type] || map.bill).push(r); });
    return map;
  }, [filtered]);

  // Monthly totals
  const monthlyOut = state.recurringItems
    .filter((r) => r.isActive && r.type !== 'income')
    .reduce((s, r) => s + monthlyEquivalent(r.amount, r.frequency), 0);

  const monthlyIn = state.recurringItems
    .filter((r) => r.isActive && r.type === 'income')
    .reduce((s, r) => s + monthlyEquivalent(r.amount, r.frequency), 0);

  const TYPE_LABELS = { subscription: 'Subscriptions', bill: 'Bills', income: 'Recurring Income' };
  const TYPE_ICONS = { subscription: '🔄', bill: '📄', income: '💰' };
  const TYPE_ORDER = ['income', 'subscription', 'bill'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Recurring</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary text-xs">+ Add</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <div className="text-xs text-slate-400 mb-0.5">Monthly Out</div>
          <div className="font-bold text-red-500">{fmt.currency(monthlyOut)}</div>
          <div className="text-xs text-slate-400">{fmt.currency(monthlyOut * 12)}/yr</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xs text-slate-400 mb-0.5">Monthly In</div>
          <div className="font-bold text-emerald-600">{fmt.currency(monthlyIn)}</div>
          <div className="text-xs text-slate-400">{fmt.currency(monthlyIn * 12)}/yr</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xs text-slate-400 mb-0.5">Net Monthly</div>
          <div className={`font-bold ${monthlyIn - monthlyOut >= 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
            {fmt.currency(monthlyIn - monthlyOut)}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {['all', 'income', 'subscription', 'bill'].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`flex-1 text-xs py-1.5 rounded-lg font-medium capitalize transition-all ${
              typeFilter === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            {t === 'all' ? 'All' : t}s
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🔄"
          title="No recurring items"
          description="Track subscriptions (Netflix, Spotify), bills (rent, utilities), and regular income."
          action={<button onClick={() => setShowForm(true)} className="btn-primary">+ Add Recurring</button>}
        />
      ) : (
        <div className="space-y-4">
          {TYPE_ORDER.map((type) => {
            const items = grouped[type];
            if (!items?.length || (typeFilter !== 'all' && typeFilter !== type)) return null;
            const groupMonthly = items.reduce((s, r) => s + monthlyEquivalent(r.amount, r.frequency), 0);
            return (
              <div key={type}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {TYPE_ICONS[type]} {TYPE_LABELS[type]}
                  </span>
                  <span className="text-xs text-slate-400">{fmt.currency(groupMonthly)}/mo</span>
                </div>
                <div className="card divide-y divide-slate-50">
                  {items.sort((a, b) => a.nextDate.localeCompare(b.nextDate)).map((item) => {
                    const days = daysUntil(item.nextDate);
                    const urgent = days <= 3 && type !== 'income';
                    return (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 group transition-colors">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 text-white" style={{ backgroundColor: item.color }}>
                          {item.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-slate-800 truncate">{item.name}</span>
                            {urgent && <span className="badge badge-red text-xs">Due soon!</span>}
                          </div>
                          <div className="text-xs text-slate-400">
                            {FREQ_LABELS[item.frequency]} ·{' '}
                            {type === 'income' ? `Next: ${fmt.dateShort(item.nextDate)}` : days < 0 ? 'Overdue' : days === 0 ? 'Due today' : `Due in ${days}d`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-semibold ${type === 'income' ? 'text-emerald-600' : 'text-slate-700'}`}>
                            {fmt.currency(item.amount)}
                          </div>
                          <div className="text-xs text-slate-400">{fmt.currency(monthlyEquivalent(item.amount, item.frequency))}/mo</div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                          <button onClick={() => setEditing(item)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                          <button onClick={() => { if (window.confirm('Delete?')) dispatch({ type: 'DELETE_RECURRING', id: item.id }); }} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(showForm || editing) && (
        <Modal title={editing ? 'Edit Recurring Item' : 'Add Recurring Item'} onClose={() => { setShowForm(false); setEditing(null); }}>
          <RecurringForm initialValues={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />
        </Modal>
      )}
    </div>
  );
}
