import { useState } from 'react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../utils/categoryConfig.js';
import { todayISO } from '../../utils/formatters.js';

const DEFAULTS = { type: 'expense', name: '', amount: '', date: todayISO(), category: 'Food', notes: '' };

export function TransactionForm({ initialValues, onSave, onCancel }) {
  const [values, setValues] = useState({ ...DEFAULTS, ...initialValues });
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    const val = e.target.value;
    setValues((v) => {
      const next = { ...v, [field]: val };
      // Auto-switch category when type changes
      if (field === 'type') {
        next.category = val === 'income' ? 'Salary' : 'Food';
      }
      return next;
    });
  };

  const cats = values.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const validate = () => {
    const e = {};
    if (!values.name.trim()) e.name = 'Required';
    if (!values.amount || parseFloat(values.amount) <= 0) e.amount = 'Enter positive amount';
    if (!values.date) e.date = 'Required';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({ ...values, amount: parseFloat(values.amount) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type toggle */}
      <div className="flex rounded-xl overflow-hidden border border-slate-200 p-1 gap-1 bg-slate-50">
        {['expense', 'income'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => set('type')({ target: { value: t } })}
            className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-all ${
              values.type === t
                ? t === 'income' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'income' ? '↑ Income' : '↓ Expense'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Description</label>
          <input className={`input ${errors.name ? 'border-red-400' : ''}`} placeholder="Coffee, Rent, Paycheck…" value={values.name} onChange={set('name')} autoFocus />
          {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
        </div>

        <div>
          <label className="label">Amount ($)</label>
          <input className={`input ${errors.amount ? 'border-red-400' : ''}`} type="number" min="0" step="0.01" placeholder="0.00" value={values.amount} onChange={set('amount')} />
          {errors.amount && <p className="text-xs text-red-500 mt-0.5">{errors.amount}</p>}
        </div>

        <div>
          <label className="label">Date</label>
          <input className={`input ${errors.date ? 'border-red-400' : ''}`} type="date" value={values.date} onChange={set('date')} />
        </div>

        <div className="col-span-2">
          <label className="label">Category</label>
          <div className="grid grid-cols-3 gap-1.5">
            {cats.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setValues((v) => ({ ...v, category: c.name }))}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  values.category === c.name
                    ? 'border-transparent text-white'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                }`}
                style={values.category === c.name ? { backgroundColor: c.color } : {}}
              >
                <span>{c.icon}</span> {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2">
          <label className="label">Notes (optional)</label>
          <input className="input" placeholder="Add a note…" value={values.notes} onChange={set('notes')} />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className={`btn flex-1 text-white ${values.type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-400' : 'bg-rose-500 hover:bg-rose-600 focus:ring-rose-400'}`}>
          {initialValues?.id ? 'Save Changes' : `Add ${values.type === 'income' ? 'Income' : 'Expense'}`}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
