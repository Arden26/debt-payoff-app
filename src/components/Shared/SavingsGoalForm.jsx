import { useState } from 'react';
import { SAVINGS_ICONS, SAVINGS_COLORS } from '../../utils/categoryConfig.js';
import { todayISO, addMonths } from '../../utils/formatters.js';

const DEFAULTS = {
  name: '', targetAmount: '', currentAmount: '0',
  deadline: addMonths(todayISO(), 12),
  color: SAVINGS_COLORS[0], icon: '🎯',
};

export function SavingsGoalForm({ initialValues, onSave, onCancel }) {
  const [values, setValues] = useState({ ...DEFAULTS, ...initialValues });
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!values.name.trim()) e.name = 'Required';
    if (!values.targetAmount || parseFloat(values.targetAmount) <= 0) e.targetAmount = 'Enter target amount';
    if (!values.deadline) e.deadline = 'Required';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({
      ...values,
      targetAmount: parseFloat(values.targetAmount),
      currentAmount: parseFloat(values.currentAmount) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Icon picker */}
      <div>
        <label className="label">Icon</label>
        <div className="flex flex-wrap gap-2">
          {SAVINGS_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => setValues((v) => ({ ...v, icon }))}
              className={`text-xl p-2 rounded-xl border-2 transition-all ${
                values.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="label">Color</label>
        <div className="flex gap-2">
          {SAVINGS_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setValues((v) => ({ ...v, color }))}
              className={`w-7 h-7 rounded-full border-2 transition-all ${
                values.color === color ? 'border-slate-800 scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Goal Name</label>
          <input className={`input ${errors.name ? 'border-red-400' : ''}`} placeholder="Emergency Fund, New Car…" value={values.name} onChange={set('name')} autoFocus />
          {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
        </div>

        <div>
          <label className="label">Target ($)</label>
          <input className={`input ${errors.targetAmount ? 'border-red-400' : ''}`} type="number" min="0" step="100" value={values.targetAmount} onChange={set('targetAmount')} />
          {errors.targetAmount && <p className="text-xs text-red-500 mt-0.5">{errors.targetAmount}</p>}
        </div>

        <div>
          <label className="label">Already Saved ($)</label>
          <input className="input" type="number" min="0" step="0.01" value={values.currentAmount} onChange={set('currentAmount')} />
        </div>

        <div className="col-span-2">
          <label className="label">Target Date</label>
          <input className={`input ${errors.deadline ? 'border-red-400' : ''}`} type="date" value={values.deadline} onChange={set('deadline')} />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary flex-1">{initialValues?.id ? 'Save Changes' : 'Add Goal'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
