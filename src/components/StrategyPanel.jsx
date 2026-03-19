import { useMemo } from 'react';
import { STRATEGIES, STRATEGY_LABELS, STRATEGY_DESCRIPTIONS, simulatePayoff, formatCurrency, formatMonths } from '../utils/debtCalc.js';

const STRATEGY_ICONS = {
  [STRATEGIES.SNOWBALL]: '⛄',
  [STRATEGIES.AVALANCHE]: '🏔️',
  [STRATEGIES.HYBRID]: '⚡',
};

export function StrategyPanel({ strategy, onChange, debts, monthlyBudget }) {
  // Run all 3 strategies for comparison
  const comparisons = useMemo(() => {
    if (!debts.length || !monthlyBudget) return null;
    return Object.values(STRATEGIES).map((s) => {
      const r = simulatePayoff(debts, monthlyBudget, s);
      return r ? { strategy: s, months: r.payoffMonths, interest: r.totalInterest } : null;
    }).filter(Boolean);
  }, [debts, monthlyBudget]);

  // Find best/worst for highlighting
  const bestInterest = comparisons ? Math.min(...comparisons.map((c) => c.interest)) : null;
  const fastestMonths = comparisons ? Math.min(...comparisons.map((c) => c.months)) : null;

  return (
    <div className="space-y-2">
      {Object.values(STRATEGIES).map((s) => {
        const comp = comparisons?.find((c) => c.strategy === s);
        const isSelected = strategy === s;
        const isBestMoney = comp && comp.interest === bestInterest;
        const isFastest = comp && comp.months === fastestMonths;

        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-150 ${
              isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-100 bg-white hover:border-slate-200'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg leading-none mt-0.5">{STRATEGY_ICONS[s]}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-semibold ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                    {STRATEGY_LABELS[s]}
                  </span>
                  {isBestMoney && (
                    <span className="badge badge-green text-xs">Best $</span>
                  )}
                  {isFastest && !isBestMoney && (
                    <span className="badge badge-blue text-xs">Fastest</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{STRATEGY_DESCRIPTIONS[s]}</p>
                {comp && (
                  <div className="flex gap-3 mt-1.5 text-xs">
                    <span className="text-slate-600">
                      <strong>{formatMonths(comp.months)}</strong> payoff
                    </span>
                    <span className="text-slate-600">
                      <strong>{formatCurrency(comp.interest)}</strong> interest
                    </span>
                  </div>
                )}
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
              }`}>
                {isSelected && (
                  <svg className="w-full h-full text-white" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.5 4L6.5 11 3 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                )}
              </div>
            </div>
          </button>
        );
      })}

      {comparisons && comparisons.length > 1 && (
        <ComparisonSavings comparisons={comparisons} selected={strategy} />
      )}
    </div>
  );
}

function ComparisonSavings({ comparisons, selected }) {
  const selectedComp = comparisons.find((c) => c.strategy === selected);
  const worstInterest = Math.max(...comparisons.map((c) => c.interest));
  const saving = worstInterest - (selectedComp?.interest ?? worstInterest);

  if (saving <= 0) return null;

  return (
    <div className="text-xs text-center text-emerald-600 font-medium bg-emerald-50 rounded-lg py-2 px-3">
      vs. worst option, this strategy saves you{' '}
      <strong>{formatCurrency(saving)}</strong> in interest
    </div>
  );
}
