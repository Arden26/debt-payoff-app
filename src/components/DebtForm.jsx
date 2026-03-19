import { useState } from 'react';

const DEFAULT_VALUES = {
  name: '',
  balance: '',
  apr: '',
  minPayment: '',
};

// Suggested debt types for quick fill
const DEBT_PRESETS = [
  { label: 'Credit Card', apr: 24.99 },
  { label: 'Auto Loan', apr: 7.5 },
  { label: 'Student Loan', apr: 5.5 },
  { label: 'Personal Loan', apr: 12.0 },
  { label: 'Medical Debt', apr: 0 },
];

export function DebtForm({ initialValues, onSave, onCancel, isEditing = false }) {
  const [values, setValues] = useState(initialValues ?? DEFAULT_VALUES);
  const [errors, setErrors] = useState({});

  const set = (field) => (e) =>
    setValues((v) => ({ ...v, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!values.name.trim()) errs.name = 'Required';
    const bal = parseFloat(values.balance);
    if (isNaN(bal) || bal <= 0) errs.balance = 'Enter a positive balance';
    const apr = parseFloat(values.apr);
    if (isNaN(apr) || apr < 0 || apr > 100) errs.apr = '0–100%';
    const min = parseFloat(values.minPayment);
    if (isNaN(min) || min <= 0) errs.minPayment = 'Enter minimum payment';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSave({
      ...values,
      balance: parseFloat(values.balance),
      apr: parseFloat(values.apr),
      minPayment: parseFloat(values.minPayment),
    });
  };

  const applyPreset = (preset) => {
    setValues((v) => ({ ...v, name: preset.label, apr: String(preset.apr) }));
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="text-xs font-semibold text-slate-600 mb-2">
        {isEditing ? 'Edit Debt' : 'Add New Debt'}
      </div>

      {/* Quick presets */}
      {!isEditing && (
        <div className="flex flex-wrap gap-1 mb-1">
          {DEBT_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              className="text-xs px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {/* Name */}
        <div className="col-span-2">
          <label className="label">Debt Name</label>
          <input
            className={`input ${errors.name ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="Chase Sapphire, Student Loan…"
            value={values.name}
            onChange={set('name')}
            autoFocus={!isEditing}
          />
          {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
        </div>

        {/* Balance */}
        <div>
          <label className="label">Balance ($)</label>
          <input
            className={`input ${errors.balance ? 'border-red-400' : ''}`}
            type="number"
            min="0"
            step="0.01"
            placeholder="2000"
            value={values.balance}
            onChange={set('balance')}
          />
          {errors.balance && (
            <p className="text-xs text-red-500 mt-0.5">{errors.balance}</p>
          )}
        </div>

        {/* APR */}
        <div>
          <label className="label">APR (%)</label>
          <input
            className={`input ${errors.apr ? 'border-red-400' : ''}`}
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="18.99"
            value={values.apr}
            onChange={set('apr')}
          />
          {errors.apr && (
            <p className="text-xs text-red-500 mt-0.5">{errors.apr}</p>
          )}
        </div>

        {/* Min Payment */}
        <div className="col-span-2">
          <label className="label">Minimum Monthly Payment ($)</label>
          <input
            className={`input ${errors.minPayment ? 'border-red-400' : ''}`}
            type="number"
            min="0"
            step="0.01"
            placeholder="50"
            value={values.minPayment}
            onChange={set('minPayment')}
          />
          {errors.minPayment && (
            <p className="text-xs text-red-500 mt-0.5">{errors.minPayment}</p>
          )}
          {values.balance && values.apr && !values.minPayment && (
            <p className="text-xs text-slate-400 mt-0.5">
              Tip: typical minimum is ~2% of balance
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary flex-1">
          {isEditing ? 'Save Changes' : 'Add Debt'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
