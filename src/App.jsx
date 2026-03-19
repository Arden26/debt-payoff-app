import { useState, useEffect, useCallback } from 'react';
import { DebtList } from './components/DebtList.jsx';
import { DebtForm } from './components/DebtForm.jsx';
import { IncomeSettings } from './components/IncomeSettings.jsx';
import { StrategyPanel } from './components/StrategyPanel.jsx';
import { PayoffChart } from './components/PayoffChart.jsx';
import { TimelineTable } from './components/TimelineTable.jsx';
import { Summary } from './components/Summary.jsx';
import { ExportButtons } from './components/ExportButtons.jsx';
import { simulatePayoff, STRATEGIES, generateId, biweeklyToMonthly } from './utils/debtCalc.js';
import { useStorage } from './hooks/useStorage.js';

const DEFAULT_INCOME = {
  amount: '',
  schedule: 'monthly', // 'monthly' | 'biweekly'
  extraPayment: 0,
};

const TABS = [
  { id: 'chart', label: 'Chart' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'payoff-order', label: 'Payoff Order' },
];

export default function App() {
  const [debts, setDebts] = useState([]);
  const [income, setIncome] = useState(DEFAULT_INCOME);
  const [strategy, setStrategy] = useState(STRATEGIES.AVALANCHE);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('chart');
  const [showForm, setShowForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const { save, load, clear, kvAvailable } = useStorage();

  // Load saved state on mount
  useEffect(() => {
    load().then((saved) => {
      if (saved) {
        if (saved.debts) setDebts(saved.debts);
        if (saved.income) setIncome(saved.income);
        if (saved.strategy) setStrategy(saved.strategy);
      }
      setLoaded(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save & recalculate whenever state changes (after initial load)
  useEffect(() => {
    if (!loaded) return;

    const monthlyBudget = getMonthlyBudget(income);
    if (debts.length > 0 && monthlyBudget > 0) {
      const r = simulatePayoff(debts, monthlyBudget, strategy);
      setResults(r);
    } else {
      setResults(null);
    }

    save({ debts, income, strategy });
  }, [debts, income, strategy, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debt CRUD ──────────────────────────────────────────────────────────────

  const handleAddDebt = useCallback((debtData) => {
    const newDebt = { ...debtData, id: generateId() };
    setDebts((prev) => [...prev, newDebt]);
    setShowForm(false);
  }, []);

  const handleUpdateDebt = useCallback((debtData) => {
    setDebts((prev) => prev.map((d) => (d.id === debtData.id ? debtData : d)));
    setEditingDebt(null);
  }, []);

  const handleDeleteDebt = useCallback((id) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handleEditDebt = useCallback((debt) => {
    setEditingDebt(debt);
    setShowForm(false);
  }, []);

  const handleClearAll = useCallback(async () => {
    if (window.confirm('Clear all data? This cannot be undone.')) {
      setDebts([]);
      setIncome(DEFAULT_INCOME);
      setStrategy(STRATEGIES.AVALANCHE);
      setResults(null);
      await clear();
    }
  }, [clear]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const monthlyBudget = getMonthlyBudget(income);
  const totalDebt = debts.reduce((s, d) => s + parseFloat(d.balance || 0), 0);
  const hasDebts = debts.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <span className="text-xl">💸</span>
              <span className="font-bold text-slate-900 text-lg">DebtFree</span>
              <span className="hidden sm:inline text-slate-400 text-sm font-normal ml-1">
                — Payoff Planner
              </span>
            </div>
            <div className="flex items-center gap-3">
              {!kvAvailable && (
                <span className="badge badge-amber text-xs">Offline</span>
              )}
              <span className="hidden sm:inline badge badge-green text-xs">
                No tracking · No ads
              </span>
              {hasDebts && (
                <button onClick={handleClearAll} className="btn-ghost text-xs">
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          {/* ── Left Panel: Inputs ── */}
          <aside className="flex flex-col gap-4">
            {/* Debt List */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-800">Your Debts</h2>
                <button
                  onClick={() => {
                    setShowForm(true);
                    setEditingDebt(null);
                  }}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  + Add Debt
                </button>
              </div>

              {/* Add Form */}
              {showForm && (
                <div className="mb-3 p-3 bg-blue-50 rounded-xl border border-blue-100 animate-fade-in">
                  <DebtForm
                    onSave={handleAddDebt}
                    onCancel={() => setShowForm(false)}
                  />
                </div>
              )}

              {/* Edit Form */}
              {editingDebt && (
                <div className="mb-3 p-3 bg-amber-50 rounded-xl border border-amber-100 animate-fade-in">
                  <DebtForm
                    initialValues={editingDebt}
                    onSave={handleUpdateDebt}
                    onCancel={() => setEditingDebt(null)}
                    isEditing
                  />
                </div>
              )}

              <DebtList
                debts={debts}
                onEdit={handleEditDebt}
                onDelete={handleDeleteDebt}
              />

              {!hasDebts && !showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full mt-2 p-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm hover:border-blue-300 hover:text-blue-500 transition-colors"
                >
                  + Add your first debt
                </button>
              )}
            </div>

            {/* Income Settings */}
            <div className="card p-4">
              <h2 className="font-semibold text-slate-800 mb-3">Budget</h2>
              <IncomeSettings income={income} onChange={setIncome} />
            </div>

            {/* Strategy Selector */}
            <div className="card p-4">
              <h2 className="font-semibold text-slate-800 mb-3">Strategy</h2>
              <StrategyPanel
                strategy={strategy}
                onChange={setStrategy}
                debts={debts}
                monthlyBudget={monthlyBudget}
              />
            </div>
          </aside>

          {/* ── Right Panel: Results ── */}
          <section className="flex flex-col gap-4">
            {results ? (
              <>
                {/* Summary Cards */}
                <Summary results={results} monthlyBudget={monthlyBudget} totalDebt={totalDebt} />

                {/* Chart / Table Tabs */}
                <div className="card">
                  <div className="flex items-center gap-1 p-3 border-b border-slate-100">
                    {TABS.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`tab ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                    <div className="ml-auto">
                      <ExportButtons results={results} debts={debts} income={income} strategy={strategy} />
                    </div>
                  </div>

                  <div className="p-4">
                    {activeTab === 'chart' && (
                      <PayoffChart results={results} debts={debts} />
                    )}
                    {activeTab === 'timeline' && (
                      <TimelineTable results={results} debts={debts} />
                    )}
                    {activeTab === 'payoff-order' && (
                      <PayoffOrderPanel results={results} debts={debts} />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <EmptyState hasDebts={hasDebts} income={income} />
            )}
          </section>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-400 mt-4">
        DebtFree runs entirely in your browser. No data is sent to third parties.
        Algorithms inspired by{' '}
        <a
          href="https://github.com/nielse63/node-debt-snowball"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-600"
        >
          node-debt-snowball
        </a>{' '}
        (MIT).
      </footer>
    </div>
  );
}

// ── Helper ──────────────────────────────────────────────────────────────────

function getMonthlyBudget(income) {
  const amount = parseFloat(income.amount) || 0;
  const extra = parseFloat(income.extraPayment) || 0;
  const monthly =
    income.schedule === 'biweekly' ? biweeklyToMonthly(amount) : amount;
  return monthly + extra;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function EmptyState({ hasDebts, income }) {
  return (
    <div className="card p-12 flex flex-col items-center justify-center text-center gap-4 animate-fade-in">
      <div className="text-5xl">🎯</div>
      <h3 className="text-xl font-semibold text-slate-800">
        {!hasDebts
          ? 'Add your debts to get started'
          : 'Enter your monthly budget'}
      </h3>
      <p className="text-slate-500 text-sm max-w-sm">
        {!hasDebts
          ? 'Add credit cards, loans, or any debt with balance, APR, and minimum payment.'
          : 'Enter your monthly income or payment budget to see your payoff plan.'}
      </p>
      <div className="flex gap-3 mt-2 text-sm text-slate-400">
        <span className="badge badge-blue">Debt Snowball</span>
        <span className="badge badge-green">Debt Avalanche</span>
        <span className="badge badge-amber">Hybrid Strategy</span>
      </div>
    </div>
  );
}

function PayoffOrderPanel({ results, debts }) {
  const debtMap = Object.fromEntries(debts.map((d) => [d.id, d]));

  return (
    <div className="space-y-3 animate-fade-in">
      <p className="text-sm text-slate-500">
        Order debts will be paid off using{' '}
        <strong>{results.strategy}</strong> strategy:
      </p>
      {results.debtPayoffOrder.map((item, i) => {
        const debt = debtMap[item.id];
        return (
          <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-800 truncate">{item.name}</div>
              <div className="text-xs text-slate-400">
                Paid off {item.date} · Month {item.month}
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="font-medium text-slate-700">
                ${item.totalInterest.toLocaleString()} interest
              </div>
              {debt && (
                <div className="text-xs text-slate-400">
                  {debt.apr}% APR
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
