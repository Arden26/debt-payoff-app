import { useState } from 'react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, RECURRING_TYPES } from '../../utils/categoryConfig.js';
import { FREQ_LABELS, todayISO } from '../../utils/formatters.js';

const DEFAULTS = {
  name: '', amount: '', frequency: 'monthly',
  nextDate: todayISO(), category: 'Subscriptions', type: 'subscription', color: '#8b5cf6',
};

export function RecurringForm({ initialValues, onSave, onCancel }) {
  const [values, setValues] = useState({ ...DEFAULTS, ...initialValues });
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const cats = values.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const validate = () => {
    const e = {};
    if (!values.name.trim()) e.name = 'Required';
    if (!values.amount || parseFloat(values.amount) <= 0) e.amount = 'Enter positive amount';
    if (!values.nextDate) e.nextDate = 'Required';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const rt = RECURRING_TYPES.find((r) => r.value === values.type);
    onSave({ ...values, amount: parseFloat(values.amount), color: rt?.color ?? values.color });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type */}
      <div className="flex gap-2">
        {RECURRING_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setValues((v) => ({ ...v, type: t.value, category: t.value === 'income' ? 'Salary' : 'Subscriptions' }))}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl border-2 transition-all ${
              values.type === t.value ? 'border-transparent text-white' : 'border-slate-200 text-slate-600 bg-white'
            }`}
            style={values.type === t.value ? { backgroundColor: t.color } : {}}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Name</label>
          <input className={`input ${errors.name ? 'border-red-400' : ''}`} placeholder="Netflix, Rent, Salary…" value={values.name} onChange={set('name')} autoFocus />
          {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
        </div>

        <div>
          <label className="label">Amount ($)</label>
          <input className={`input ${errors.amount ? 'border-red-400' : ''}`} type="number" min="0" step="0.01" value={values.amount} onChange={set('amount')} />
          {errors.amount && <p className="text-xs text-red-500 mt-0.5">{errors.amount}</p>}
        </div>

        <div>
          <label className="label">Frequency</label>
          <select className="input" value={values.frequency} onChange={set('frequency')}>
            {Object.entries(FREQ_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="label">Next Due / Pay Date</label>
          <input className={`input ${errors.nextDate ? 'border-red-400' : ''}`} type="date" value={values.nextDate} onChange={set('nextDate')} />
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
                  values.category === c.name ? 'border-transparent text-white' : 'border-slate-200 text-slate-600 bg-white'
                }`}
                style={values.category === c.name ? { backgroundColor: c.color } : {}}
              >
                <span>{c.icon}</span> {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary flex-1">{initialValues?.id ? 'Save Changes' : 'Add Recurring'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
