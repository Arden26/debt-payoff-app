import { useState } from 'react';
import { useFinance } from '../../context/FinanceContext.jsx';
import { DebtForm } from '../DebtForm.jsx';
import { DebtList } from '../DebtList.jsx';
import { IncomeSettings } from '../IncomeSettings.jsx';
import { StrategyPanel } from '../StrategyPanel.jsx';
import { PayoffChart } from '../PayoffChart.jsx';
import { TimelineTable } from '../TimelineTable.jsx';
import { Summary } from '../Summary.jsx';
import { ExportButtons } from '../ExportButtons.jsx';
import { simulatePayoff, STRATEGIES, generateId, biweeklyToMonthly } from '../../utils/debtCalc.js';
import { Modal } from '../Shared/Modal.jsx';
import { SmartAdvice } from './SmartAdvice.jsx';

const TABS = [
  { id: 'chart', label: 'Chart' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'payoff-order', label: 'Payoff Order' },
];

export function DebtView() {
  const { state, dispatch } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [payingDebt, setPayingDebt] = useState(null);
  const [activeTab, setActiveTab] = useState('chart');

  const income = state.settings;
  const strategy = state.settings.debtStrategy;
  const debts = state.debts;

  const setIncome = (updater) => {
    const next = typeof updater === 'function' ? updater(income) : updater;
    dispatch({ type: 'UPDATE_SETTINGS', payload: next });
  };

  const setStrategy = (s) => dispatch({ type: 'UPDATE_SETTINGS', payload: { debtStrategy: s } });

  const monthlyBudget = getMonthlyBudget(income);
  const results = debts.length > 0 && monthlyBudget > 0
    ? simulatePayoff(debts, monthlyBudget, strategy)
    : null;

  const handleAddDebt = (data) => {
    dispatch({ type: 'ADD_DEBT', payload: data });
    setShowForm(false);
  };

  const handleUpdateDebt = (data) => {
    dispatch({ type: 'UPDATE_DEBT', payload: data });
    setEditingDebt(null);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Debt Payoff Planner</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
        {/* Left: inputs */}
        <div className="space-y-4">
          {/* Debts */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800">Your Debts</h2>
              <button onClick={() => { setShowForm(true); setEditingDebt(null); }} className="btn-primary text-xs px-3 py-1.5">+ Add</button>
            </div>
            <DebtList
              debts={debts}
              onEdit={(d) => { setEditingDebt(d); setShowForm(false); }}
              onDelete={(id) => dispatch({ type: 'DELETE_DEBT', id })}
              onPay={(d) => setPayingDebt(d)}
            />
            {debts.length === 0 && !showForm && (
              <button onClick={() => setShowForm(true)} className="w-full mt-1 p-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm hover:border-blue-300 hover:text-blue-500 transition-colors">
                + Add your first debt
              </button>
            )}
          </div>

          {/* Budget */}
          <div className="card p-4">
            <h2 className="font-semibold text-slate-800 mb-3">Budget</h2>
            <IncomeSettings income={income} onChange={setIncome} />
          </div>

          {/* Strategy */}
          <div className="card p-4">
            <h2 className="font-semibold text-slate-800 mb-3">Strategy</h2>
            <StrategyPanel strategy={strategy} onChange={setStrategy} debts={debts} monthlyBudget={monthlyBudget} />
          </div>

          {/* Smart Analysis */}
          <SmartAdvice debts={debts} monthlyBudget={monthlyBudget} strategy={strategy} />
        </div>

        {/* Right: results */}
        <div className="space-y-4">
          {results ? (
            <>
              <Summary results={results} monthlyBudget={monthlyBudget} totalDebt={debts.reduce((s, d) => s + parseFloat(d.balance || 0), 0)} />
              <div className="card">
                <div className="flex items-center gap-1 p-3 border-b border-slate-100 flex-wrap">
                  {TABS.map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`tab ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}>
                      {tab.label}
                    </button>
                  ))}
                  <div className="ml-auto">
                    <ExportButtons results={results} debts={debts} income={income} strategy={strategy} />
                  </div>
                </div>
                <div className="p-4">
                  {activeTab === 'chart' && <PayoffChart results={results} debts={debts} />}
                  {activeTab === 'timeline' && <TimelineTable results={results} debts={debts} />}
                  {activeTab === 'payoff-order' && <PayoffOrderPanel results={results} debts={debts} />}
                </div>
              </div>
            </>
          ) : (
            <div className="card p-12 flex flex-col items-center text-center gap-3">
              <span className="text-4xl">💳</span>
              <h3 className="font-semibold text-slate-700">Add debts and set your budget</h3>
              <p className="text-sm text-slate-400 max-w-xs">Enter your debts and monthly payment budget to see your payoff timeline.</p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <Modal title="Add Debt" onClose={() => setShowForm(false)}>
          <DebtForm onSave={handleAddDebt} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
      {editingDebt && (
        <Modal title="Edit Debt" onClose={() => setEditingDebt(null)}>
          <DebtForm initialValues={editingDebt} onSave={handleUpdateDebt} onCancel={() => setEditingDebt(null)} isEditing />
        </Modal>
      )}
      {payingDebt && (
        <Modal title={`Pay — ${payingDebt.name}`} onClose={() => setPayingDebt(null)}>
          <DebtPaymentForm
            debt={payingDebt}
            onSave={(amount, date, notes) => {
              dispatch({ type: 'MAKE_DEBT_PAYMENT', debtId: payingDebt.id, debtName: payingDebt.name, amount, date, notes });
              setPayingDebt(null);
            }}
            onCancel={() => setPayingDebt(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function DebtPaymentForm({ debt, onSave, onCancel }) {
  const balance = parseFloat(debt.balance || 0);
  const [amount, setAmount] = useState(String(debt.minPayment || ''));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const paid = parseFloat(debt.originalBalance || debt.balance || 0) - balance;
  const paidPct = (debt.originalBalance || balance) > 0
    ? Math.min(100, (paid / (debt.originalBalance || balance)) * 100)
    : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) { setError('Enter a valid amount'); return; }
    if (val > balance) { setError(`Amount exceeds remaining balance of $${balance.toFixed(2)}`); return; }
    onSave(val, date, notes);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Remaining balance info */}
      <div className="bg-slate-50 rounded-xl p-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Remaining balance</span>
          <span className="font-semibold text-slate-800">${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        {paidPct > 0 && (
          <>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
            </div>
            <p className="text-xs text-slate-400 text-right">{paidPct.toFixed(1)}% paid off so far</p>
          </>
        )}
      </div>

      {/* Quick amount buttons */}
      <div>
        <label className="label">Payment Amount ($)</label>
        <div className="flex gap-2 mb-2">
          {[debt.minPayment, debt.minPayment * 2, balance].filter(Boolean).map((v, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setAmount(String(v.toFixed(2))); setError(''); }}
              className="flex-1 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium"
            >
              {i === 0 ? 'Min' : i === 1 ? '2× Min' : 'Full'}<br />
              <span className="font-normal">${v.toFixed(0)}</span>
            </button>
          ))}
        </div>
        <input
          className={`input ${error ? 'border-red-400' : ''}`}
          type="number"
          min="0.01"
          max={balance}
          step="0.01"
          placeholder={String(debt.minPayment || '')}
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setError(''); }}
          autoFocus
        />
        {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      </div>

      <div>
        <label className="label">Payment Date</label>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div>
        <label className="label">Notes (optional)</label>
        <input className="input" placeholder="e.g. March payment, extra principal…" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary flex-1">Record Payment</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

function getMonthlyBudget(settings) {
  const amount = parseFloat(settings.monthlyIncome) || 0;
  const extra = parseFloat(settings.extraDebtPayment) || 0;
  const monthly = settings.paySchedule === 'biweekly' ? biweeklyToMonthly(amount) : amount;
  return monthly + extra;
}

function PayoffOrderPanel({ results, debts }) {
  const debtMap = Object.fromEntries(debts.map((d) => [d.id, d]));
  return (
    <div className="space-y-3 animate-fade-in">
      {results.debtPayoffOrder.map((item, i) => {
        const debt = debtMap[item.id];
        return (
          <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-800 truncate">{item.name}</div>
              <div className="text-xs text-slate-400">Paid off {item.date} · Month {item.month}</div>
            </div>
            <div className="text-right text-sm">
              <div className="font-medium text-slate-700">${item.totalInterest.toLocaleString()} interest</div>
              {debt && <div className="text-xs text-slate-400">{debt.apr}% APR</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
