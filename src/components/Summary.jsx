import { formatCurrency, formatMonths, STRATEGY_LABELS } from '../utils/debtCalc.js';

export function Summary({ results, monthlyBudget, totalDebt }) {
  const {
    payoffDate,
    payoffMonths,
    totalInterest,
    interestSaved,
    monthsSaved,
    strategy,
  } = results;

  const totalPaid = totalDebt + totalInterest;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
      <StatCard
        label="Payoff Date"
        value={payoffDate}
        sub={formatMonths(payoffMonths) + ' from now'}
        accent="blue"
        icon="🎯"
      />
      <StatCard
        label="Total Interest"
        value={formatCurrency(totalInterest)}
        sub={`Total paid: ${formatCurrency(totalPaid)}`}
        accent="red"
        icon="💳"
      />
      <StatCard
        label="Interest Saved"
        value={formatCurrency(interestSaved)}
        sub={`vs. minimum payments only`}
        accent="green"
        icon="💚"
      />
      <StatCard
        label="Time Saved"
        value={formatMonths(monthsSaved)}
        sub={`using ${STRATEGY_LABELS[strategy]}`}
        accent="violet"
        icon="⚡"
      />
    </div>
  );
}

const ACCENT_CLASSES = {
  blue: {
    border: 'border-blue-100',
    icon: 'bg-blue-50 text-blue-600',
    value: 'text-blue-700',
  },
  red: {
    border: 'border-red-100',
    icon: 'bg-red-50 text-red-600',
    value: 'text-red-700',
  },
  green: {
    border: 'border-emerald-100',
    icon: 'bg-emerald-50 text-emerald-600',
    value: 'text-emerald-700',
  },
  violet: {
    border: 'border-violet-100',
    icon: 'bg-violet-50 text-violet-600',
    value: 'text-violet-700',
  },
};

function StatCard({ label, value, sub, accent, icon }) {
  const cls = ACCENT_CLASSES[accent];
  return (
    <div className={`card p-4 border ${cls.border}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="stat-label">{label}</span>
        <span className={`text-base p-1 rounded-lg ${cls.icon}`}>{icon}</span>
      </div>
      <div className={`stat-value text-xl ${cls.value}`}>{value}</div>
      <div className="stat-sub mt-0.5">{sub}</div>
    </div>
  );
}
