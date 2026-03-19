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

const TABS = [
  { id: 'chart', label: 'Chart' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'payoff-order', label: 'Payoff Order' },
];

export function DebtView() {
  const { state, dispatch } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
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
    </div>
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
