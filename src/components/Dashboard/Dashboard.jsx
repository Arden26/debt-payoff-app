import { useMemo, useRef, useEffect } from 'react';
import { Chart, DoughnutController, ArcElement, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { useFinance, useSelectors } from '../../context/FinanceContext.jsx';
import { fmt, monthISO, daysUntil, getRecurringOccurrences } from '../../utils/formatters.js';
import { getCategoryConfig } from '../../utils/categoryConfig.js';

Chart.register(DoughnutController, ArcElement, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export function Dashboard({ onNavigate }) {
  const { state } = useFinance();
  const { getMonthIncome, getMonthExpenses, getMonthTransactions, totalSaved, totalDebt } = useSelectors();

  const today = new Date();
  const thisMonth = monthISO(today);
  const monthIncome = getMonthIncome(thisMonth);
  const monthExpenses = getMonthExpenses(thisMonth);
  const netWorth = totalSaved - totalDebt;
  const savingsRate = monthIncome > 0 ? ((monthIncome - monthExpenses) / monthIncome) * 100 : 0;

  // Upcoming recurring items (next 14 days)
  const upcoming = useMemo(() => {
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + 14);
    return state.recurringItems
      .filter((r) => r.isActive && r.type !== 'income')
      .map((r) => ({ ...r, days: daysUntil(r.nextDate) }))
      .filter((r) => r.days <= 14)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);
  }, [state.recurringItems]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recent transactions
  const recent = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  // Spending by category this month
  const spendingByCategory = useMemo(() => {
    const txs = getMonthTransactions(thisMonth).filter((t) => t.type === 'expense');
    const map = {};
    txs.forEach((t) => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [getMonthTransactions, thisMonth]);

  // Last 6 months cash flow
  const cashFlow = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
      const ym = monthISO(d);
      return {
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        income: getMonthIncome(ym),
        expenses: getMonthExpenses(ym),
      };
    });
  }, [getMonthIncome, getMonthExpenses]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-400">{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <button onClick={() => onNavigate('transactions')} className="btn-primary text-xs">+ Add Transaction</button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Net Worth" value={fmt.currency(netWorth)} sub="assets − debt" accent={netWorth >= 0 ? 'green' : 'red'} icon="🏦" />
        <StatCard label="This Month" value={fmt.currency(monthIncome - monthExpenses)} sub={`${fmt.currency(monthIncome)} in · ${fmt.currency(monthExpenses)} out`} accent={monthIncome >= monthExpenses ? 'green' : 'red'} icon="📊" />
        <StatCard label="Savings Rate" value={fmt.percent(savingsRate)} sub="of monthly income" accent="blue" icon="💚" />
        <StatCard label="Total Debt" value={fmt.currency(totalDebt)} sub={`${state.debts.length} account${state.debts.length !== 1 ? 's' : ''}`} accent="amber" icon="💳" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cash flow chart */}
        <div className="card p-4">
          <h2 className="font-semibold text-slate-800 mb-3 text-sm">Income vs Expenses (6mo)</h2>
          {cashFlow.some((m) => m.income > 0 || m.expenses > 0)
            ? <CashFlowChart data={cashFlow} />
            : <EmptyChart onNavigate={onNavigate} />}
        </div>

        {/* Spending by category */}
        <div className="card p-4">
          <h2 className="font-semibold text-slate-800 mb-3 text-sm">Spending This Month</h2>
          {spendingByCategory.length > 0
            ? <SpendingBreakdown data={spendingByCategory} total={monthExpenses} />
            : <EmptyChart msg="No expenses logged this month" onNavigate={onNavigate} />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent transactions */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800 text-sm">Recent Transactions</h2>
            <button onClick={() => onNavigate('transactions')} className="text-xs text-blue-600 hover:underline">View all</button>
          </div>
          {recent.length > 0 ? (
            <div className="space-y-2">
              {recent.map((t) => {
                const cat = getCategoryConfig(t.category, t.type);
                return (
                  <div key={t.id} className="flex items-center gap-2.5 py-1.5">
                    <span className="text-lg w-7 flex-shrink-0">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-700 truncate">{t.name}</div>
                      <div className="text-xs text-slate-400">{fmt.dateShort(t.date)} · {t.category}</div>
                    </div>
                    <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-700'}`}>
                      {t.type === 'income' ? '+' : '−'}{fmt.currency(t.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">No transactions yet</p>
          )}
        </div>

        {/* Upcoming bills */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800 text-sm">Upcoming Bills (14 days)</h2>
            <button onClick={() => onNavigate('subscriptions')} className="text-xs text-blue-600 hover:underline">Manage</button>
          </div>
          {upcoming.length > 0 ? (
            <div className="space-y-2">
              {upcoming.map((r) => (
                <div key={r.id} className="flex items-center gap-2.5 py-1.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style={{ backgroundColor: r.color + '20', color: r.color }}>
                    {r.days === 0 ? '!' : r.days}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700 truncate">{r.name}</div>
                    <div className="text-xs text-slate-400">{r.days === 0 ? 'Today' : r.days === 1 ? 'Tomorrow' : `In ${r.days} days`}</div>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{fmt.currency(r.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">Nothing due in the next 14 days 🎉</p>
          )}
        </div>
      </div>

      {/* Savings goals preview */}
      {state.savingsGoals.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800 text-sm">Savings Goals</h2>
            <button onClick={() => onNavigate('savings')} className="text-xs text-blue-600 hover:underline">View all</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {state.savingsGoals.slice(0, 3).map((g) => {
              const pct = Math.min(100, ((g.currentAmount || 0) / g.targetAmount) * 100);
              return (
                <div key={g.id} className="p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{g.icon}</span>
                    <span className="text-sm font-medium text-slate-700 truncate">{g.name}</span>
                    <span className="ml-auto text-xs font-semibold" style={{ color: g.color }}>{fmt.percent(pct)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: g.color }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{fmt.currency(g.currentAmount || 0)}</span>
                    <span>{fmt.currency(g.targetAmount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent, icon }) {
  const accents = {
    green: 'border-emerald-100 text-emerald-700',
    red: 'border-red-100 text-red-700',
    blue: 'border-blue-100 text-blue-700',
    amber: 'border-amber-100 text-amber-700',
  };
  return (
    <div className={`card p-4 border ${accents[accent]?.split(' ')[0] || ''}`}>
      <div className="flex items-start justify-between gap-1 mb-1">
        <span className="stat-label text-xs">{label}</span>
        <span className="text-base">{icon}</span>
      </div>
      <div className={`text-xl font-bold ${accents[accent]?.split(' ')[1] || 'text-slate-900'}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-0.5 truncate">{sub}</div>
    </div>
  );
}

function CashFlowChart({ data }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          { label: 'Income', data: data.map((d) => d.income), backgroundColor: '#10b98133', borderColor: '#10b981', borderWidth: 2, borderRadius: 4 },
          { label: 'Expenses', data: data.map((d) => d.expenses), backgroundColor: '#ef444433', borderColor: '#ef4444', borderWidth: 2, borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, color: '#64748b' } }, tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${fmt.currency(c.raw)}` } } },
        scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } }, y: { grid: { color: '#f1f5f9' }, ticks: { callback: (v) => fmt.currency(v), font: { size: 11 }, color: '#94a3b8' }, beginAtZero: true } },
      },
    });

    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [data]);

  return <div className="h-48"><canvas ref={canvasRef} /></div>;
}

function SpendingBreakdown({ data, total }) {
  return (
    <div className="space-y-2">
      {data.map(([category, amount]) => {
        const cat = getCategoryConfig(category, 'expense');
        const pct = total > 0 ? (amount / total) * 100 : 0;
        return (
          <div key={category}>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="flex items-center gap-1 text-slate-600 font-medium">{cat.icon} {category}</span>
              <span className="text-slate-500">{fmt.currency(amount)} · {fmt.percent(pct)}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyChart({ msg, onNavigate }) {
  return (
    <div className="h-48 flex items-center justify-center">
      <p className="text-sm text-slate-400 text-center">{msg || 'Add transactions to see your cash flow'}</p>
    </div>
  );
}
