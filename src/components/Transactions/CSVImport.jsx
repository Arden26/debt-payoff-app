import { useState, useCallback } from 'react';
import { useFinance } from '../../context/FinanceContext.jsx';
import { parseCSV, detectMapping, rowsToPreview } from '../../utils/csvParser.js';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../utils/categoryConfig.js';
import { fmt } from '../../utils/formatters.js';

const ALL_CATEGORIES = [
  ...EXPENSE_CATEGORIES.map((c) => c.name),
  ...INCOME_CATEGORIES.map((c) => c.name),
];

const FIELD_LABELS = {
  date: 'Date',
  desc: 'Description / Name',
  amount: 'Amount',
  debit: 'Debit (money out)',
  credit: 'Credit (money in)',
  category: 'Category (optional)',
};

export function CSVImport({ onClose }) {
  const { dispatch } = useFinance();
  const [step, setStep] = useState(1); // 1=upload, 2=map, 3=preview
  const [parsed, setParsed] = useState(null);   // { headers, rows }
  const [mapping, setMapping] = useState(null);
  const [defaultType, setDefaultType] = useState('auto');
  const [preview, setPreview] = useState([]);    // processed transactions
  const [selected, setSelected] = useState({});  // rowIndex → true/false
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // ── Step 1: file upload ──────────────────────────────────────────────────────

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please upload a .csv file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = parseCSV(e.target.result);
        if (result.headers.length < 2 || result.rows.length === 0) {
          setError('CSV appears empty or invalid.');
          return;
        }
        const detected = detectMapping(result.headers);
        setParsed(result);
        setMapping(detected);
        setError('');
        setStep(2);
      } catch {
        setError('Could not parse this file. Make sure it is a valid CSV.');
      }
    };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  // ── Step 2: mapping ──────────────────────────────────────────────────────────

  const setMap = (field, value) => setMapping((m) => ({ ...m, [field]: value || null }));

  const toggleAmountMode = (mode) => {
    setMapping((m) => ({
      ...m,
      amountMode: mode,
      amount: mode === 'single' ? m.amount : null,
      debit: mode === 'split' ? m.debit : null,
      credit: mode === 'split' ? m.credit : null,
    }));
  };

  const buildPreview = () => {
    const rows = rowsToPreview(parsed.rows, mapping, defaultType);
    if (rows.length === 0) {
      setError('No valid transactions could be parsed. Check your column mapping.');
      return;
    }
    setPreview(rows);
    const sel = {};
    rows.forEach((_, i) => { sel[i] = true; });
    setSelected(sel);
    setError('');
    setStep(3);
  };

  // ── Step 3: preview + import ─────────────────────────────────────────────────

  const toggleRow = (i) => setSelected((s) => ({ ...s, [i]: !s[i] }));
  const toggleAll = () => {
    const allOn = Object.values(selected).every(Boolean);
    const next = {};
    preview.forEach((_, i) => { next[i] = !allOn; });
    setSelected(next);
  };

  const updateRowType = (i, type) => {
    setPreview((rows) => rows.map((r, idx) => idx === i ? { ...r, type } : r));
  };

  const updateRowCategory = (i, category) => {
    setPreview((rows) => rows.map((r, idx) => idx === i ? { ...r, category } : r));
  };

  const doImport = () => {
    const toImport = preview.filter((_, i) => selected[i]);
    if (toImport.length === 0) return;
    dispatch({ type: 'IMPORT_TRANSACTIONS', payload: toImport });
    onClose();
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  // ── Render ───────────────────────────────────────────────────────────────────

  const colOpt = (label = '— skip —') => (
    <>
      <option value="">{label}</option>
      {parsed?.headers.map((h) => <option key={h} value={h}>{h}</option>)}
    </>
  );

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs">
        {['Upload', 'Map Columns', 'Preview & Import'].map((label, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300">›</span>}
            <span className={`px-2 py-0.5 rounded-full font-medium ${
              step === i + 1 ? 'bg-blue-600 text-white' :
              step > i + 1  ? 'bg-emerald-100 text-emerald-700' :
              'bg-slate-100 text-slate-400'
            }`}>{label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      {/* ── Step 1: Upload ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Upload a CSV from any bank or app — FinanceOS will auto-detect the columns.
          </p>
          <label
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
              isDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
            }`}
          >
            <span className="text-4xl">📂</span>
            <div className="text-center">
              <p className="font-medium text-slate-700">Drop your CSV here</p>
              <p className="text-sm text-slate-400 mt-0.5">or click to browse</p>
            </div>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-600">Works with exports from:</p>
            <p>Chase · Bank of America · Wells Fargo · Capital One · Citi · PayPal · Venmo · Mint · YNAB · any custom CSV</p>
          </div>
        </div>
      )}

      {/* ── Step 2: Column mapping ─────────────────────────────────────────── */}
      {step === 2 && parsed && mapping && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Found <strong>{parsed.headers.length} columns</strong> and <strong>{parsed.rows.length} rows</strong>. We've auto-detected the mapping — adjust if needed.
          </p>

          {/* Sample of raw data */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="text-xs w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {parsed.headers.map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 3).map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    {parsed.headers.map((h) => (
                      <td key={h} className="px-3 py-2 text-slate-600 whitespace-nowrap max-w-[160px] truncate">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mapping fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Date column *</label>
              <select className="input" value={mapping.date ?? ''} onChange={(e) => setMap('date', e.target.value)}>
                {colOpt('— select date column —')}
              </select>
            </div>
            <div>
              <label className="label">Description column *</label>
              <select className="input" value={mapping.desc ?? ''} onChange={(e) => setMap('desc', e.target.value)}>
                {colOpt('— select description column —')}
              </select>
            </div>
          </div>

          {/* Amount mode toggle */}
          <div>
            <label className="label">Amount format</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => toggleAmountMode('single')}
                className={`flex-1 py-2 text-sm rounded-xl border font-medium transition-colors ${
                  mapping.amountMode === 'single' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                Single amount column
              </button>
              <button
                type="button"
                onClick={() => toggleAmountMode('split')}
                className={`flex-1 py-2 text-sm rounded-xl border font-medium transition-colors ${
                  mapping.amountMode === 'split' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                Separate Debit / Credit
              </button>
            </div>
          </div>

          {mapping.amountMode === 'single' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Amount column *</label>
                <select className="input" value={mapping.amount ?? ''} onChange={(e) => setMap('amount', e.target.value)}>
                  {colOpt('— select amount column —')}
                </select>
              </div>
              <div>
                <label className="label">Negative amounts are…</label>
                <select className="input" value={defaultType} onChange={(e) => setDefaultType(e.target.value)}>
                  <option value="auto">Expenses (positive = income)</option>
                  <option value="expense">All are expenses</option>
                  <option value="income">All are income</option>
                </select>
              </div>
            </div>
          )}

          {mapping.amountMode === 'split' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Debit column (money out)</label>
                <select className="input" value={mapping.debit ?? ''} onChange={(e) => setMap('debit', e.target.value)}>
                  {colOpt()}
                </select>
              </div>
              <div>
                <label className="label">Credit column (money in)</label>
                <select className="input" value={mapping.credit ?? ''} onChange={(e) => setMap('credit', e.target.value)}>
                  {colOpt()}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="label">Category column (optional)</label>
            <select className="input" value={mapping.category ?? ''} onChange={(e) => setMap('category', e.target.value)}>
              {colOpt('— skip —')}
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
            <button
              onClick={buildPreview}
              className="btn-primary flex-1"
              disabled={!mapping.date || !mapping.desc || (mapping.amountMode === 'single' ? !mapping.amount : (!mapping.debit && !mapping.credit))}
            >
              Preview Transactions →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Preview ────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              <strong>{selectedCount}</strong> of <strong>{preview.length}</strong> transactions selected.
              Uncheck any you don't want to import.
            </p>
            <button onClick={toggleAll} className="text-xs text-blue-600 hover:underline">
              {Object.values(selected).every(Boolean) ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
            {preview.map((tx, i) => (
              <div key={i} className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${selected[i] ? '' : 'opacity-40'}`}>
                <input
                  type="checkbox"
                  checked={!!selected[i]}
                  onChange={() => toggleRow(i)}
                  className="w-4 h-4 rounded accent-blue-600 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{tx.name}</div>
                  <div className="text-xs text-slate-400">{tx.date}</div>
                </div>

                {/* Type toggle */}
                <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs flex-shrink-0">
                  <button
                    onClick={() => updateRowType(i, 'expense')}
                    className={`px-2 py-1 font-medium transition-colors ${tx.type === 'expense' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                  >
                    Exp
                  </button>
                  <button
                    onClick={() => updateRowType(i, 'income')}
                    className={`px-2 py-1 font-medium transition-colors ${tx.type === 'income' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                  >
                    Inc
                  </button>
                </div>

                {/* Category */}
                <select
                  value={tx.category}
                  onChange={(e) => updateRowCategory(i, e.target.value)}
                  className="input py-1 text-xs w-32 flex-shrink-0"
                >
                  <option value="">No category</option>
                  {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>

                <span className={`text-sm font-semibold flex-shrink-0 ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-700'}`}>
                  {tx.type === 'income' ? '+' : '−'}{fmt.currency(tx.amount)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setStep(2)} className="btn-secondary">Back</button>
            <button
              onClick={doImport}
              className="btn-primary flex-1"
              disabled={selectedCount === 0}
            >
              Import {selectedCount} Transaction{selectedCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
