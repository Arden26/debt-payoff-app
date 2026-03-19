import { useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext.jsx';
import { analyzeFinances } from '../../utils/smartStrategy.js';
import { simulatePayoff, formatCurrency, formatMonths } from '../../utils/debtCalc.js';
import { fmt } from '../../utils/formatters.js';

export function SmartAdvice({ debts, monthlyBudget, strategy }) {
  const { state } = useFinance();
  const analysis = useMemo(() => analyzeFinances(state), [state]);

  // Simulate impact of each recommendation's suggested cut on debt payoff
  const impacts = useMemo(() => {
    if (!debts.length || !analysis.hasData) return [];
    const base = simulatePayoff(debts, monthlyBudget, strategy);
    if (!base) return [];

    return analysis.recommendations.map((rec) => {
      const newBudget = monthlyBudget + rec.suggestedCut;
      const improved = simulatePayoff(debts, newBudget, strategy);
      if (!improved) return null;
      const monthsSaved = base.payoffMonths - improved.payoffMonths;
      const interestSaved = Math.round(base.totalInterest - improved.totalInterest);
      return { ...rec, monthsSaved, interestSaved };
    }).filter((r) => r && (r.monthsSaved > 0 || r.interestSaved > 0));
  }, [debts, monthlyBudget, strategy, analysis]);

  if (!analysis.hasData) return null;

  const { avgMonthlyIncome, totalNeeds, totalWants, currentDebtPayment,
    avgMonthlySavings, cashRemaining, targetNeeds, targetWants,
    targetDebtSavings, overWants, incomeSource } = analysis;

  const totalOut = totalNeeds + totalWants + currentDebtPayment + avgMonthlySavings;
  const needsPct = avgMonthlyIncome > 0 ? (totalNeeds / avgMonthlyIncome) * 100 : 0;
  const wantsPct = avgMonthlyIncome > 0 ? (totalWants / avgMonthlyIncome) * 100 : 0;
  const debtPct  = avgMonthlyIncome > 0 ? (currentDebtPayment / avgMonthlyIncome) * 100 : 0;
  const savePct  = avgMonthlyIncome > 0 ? (avgMonthlySavings / avgMonthlyIncome) * 100 : 0;

  const needsOver  = totalNeeds > targetNeeds;
  const wantsOver  = totalWants > targetWants;
  const debtUnder  = currentDebtPayment < targetDebtSavings * 0.5;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            🧠 Smart Analysis
          </h3>
          {incomeSource !== 'settings' && incomeSource !== 'none' && (
            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
              Based on last 3 months
            </span>
          )}
        </div>

        {/* Income banner */}
        {avgMonthlyIncome > 0 && (
          <div className="flex items-center justify-between mb-3 p-2.5 bg-emerald-50 rounded-xl">
            <span className="text-sm text-emerald-700 font-medium">Avg Monthly Income</span>
            <span className="font-bold text-emerald-700">{formatCurrency(avgMonthlyIncome)}</span>
          </div>
        )}

        {/* ── Spending breakdown bars ── */}
        <div className="space-y-2.5">
          <SpendingRow
            label="Needs"
            sublabel="housing, food, transport…"
            amount={totalNeeds}
            target={targetNeeds}
            targetLabel="50% target"
            pct={needsPct}
            color="bg-blue-400"
            over={needsOver}
          />
          <SpendingRow
            label="Wants"
            sublabel="entertainment, shopping…"
            amount={totalWants}
            target={targetWants}
            targetLabel="30% target"
            pct={wantsPct}
            color="bg-violet-400"
            over={wantsOver}
          />
          <SpendingRow
            label="Debt Payments"
            sublabel="minimums + extra"
            amount={currentDebtPayment}
            target={targetDebtSavings * 0.5}
            targetLabel=""
            pct={debtPct}
            color="bg-rose-400"
            over={false}
          />
          {avgMonthlySavings > 0 && (
            <SpendingRow
              label="Savings"
              sublabel=""
              amount={avgMonthlySavings}
              pct={savePct}
              color="bg-emerald-400"
              over={false}
            />
          )}
        </div>

        {/* Cash remaining */}
        {avgMonthlyIncome > 0 && (
          <div className={`mt-3 pt-3 border-t border-slate-100 flex justify-between text-sm font-semibold ${
            cashRemaining >= 0 ? 'text-emerald-600' : 'text-red-500'
          }`}>
            <span>Monthly remaining</span>
            <span>{cashRemaining >= 0 ? '+' : ''}{formatCurrency(cashRemaining)}</span>
          </div>
        )}
      </div>

      {/* ── Budget health ── */}
      {avgMonthlyIncome > 0 && (needsOver || wantsOver || debtUnder) && (
        <div className="card p-4">
          <h4 className="font-semibold text-slate-700 mb-2 text-sm">Budget Health</h4>
          <div className="space-y-1.5">
            {needsOver && (
              <Alert type="warn" icon="🏠">
                Your <strong>needs spending</strong> ({fmt.percent(needsPct)}) is over the 50% target — consider reviewing fixed costs like housing or transport.
              </Alert>
            )}
            {wantsOver && (
              <Alert type="warn" icon="🛍️">
                Your <strong>wants spending</strong> ({fmt.percent(wantsPct)}) is over the 30% target by {formatCurrency(overWants)}/mo — this is the biggest lever for faster payoff.
              </Alert>
            )}
            {debtUnder && currentDebtPayment < 50 && (
              <Alert type="info" icon="💳">
                You're allocating very little to debt payments. Even <strong>{formatCurrency(100)}/mo extra</strong> can significantly shorten your payoff timeline.
              </Alert>
            )}
            {cashRemaining < 0 && (
              <Alert type="danger" icon="⚠️">
                You're spending <strong>{formatCurrency(Math.abs(cashRemaining))}/mo more than you earn</strong>. Reduce expenses before adding extra debt payments.
              </Alert>
            )}
            {cashRemaining > 0 && cashRemaining >= 50 && (
              <Alert type="success" icon="✅">
                You have <strong>{formatCurrency(cashRemaining)}/mo</strong> unallocated — adding this to debt payments would accelerate payoff.
              </Alert>
            )}
          </div>
        </div>
      )}

      {/* ── Cut recommendations ── */}
      {impacts.length > 0 && (
        <div className="card p-4">
          <h4 className="font-semibold text-slate-700 mb-1 text-sm">What to Cut</h4>
          <p className="text-xs text-slate-400 mb-3">Each suggestion shows the impact on your debt payoff timeline.</p>
          <div className="space-y-2">
            {impacts.map((rec) => (
              <div key={rec.category} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-medium text-slate-800">{rec.category}</span>
                    <span className="text-xs text-slate-400">avg {formatCurrency(rec.currentAvg)}/mo</span>
                  </div>
                  <div className="text-xs text-violet-600 font-medium">
                    Cut by {formatCurrency(rec.suggestedCut)}/mo ({Math.round(rec.cutPct * 100)}% less)
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {rec.monthsSaved > 0 && (
                    <div className="text-xs font-bold text-emerald-600">{formatMonths(rec.monthsSaved)} sooner</div>
                  )}
                  {rec.interestSaved > 0 && (
                    <div className="text-xs text-emerald-500">saves {formatCurrency(rec.interestSaved)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Combined impact */}
          {impacts.length > 1 && (() => {
            const totalCut = impacts.reduce((s, r) => s + r.suggestedCut, 0);
            const combinedBudget = monthlyBudget + totalCut;
            const base = simulatePayoff(debts, monthlyBudget, strategy);
            const combined = simulatePayoff(debts, combinedBudget, strategy);
            if (!base || !combined) return null;
            const mSaved = base.payoffMonths - combined.payoffMonths;
            const iSaved = Math.round(base.totalInterest - combined.totalInterest);
            if (mSaved <= 0) return null;
            return (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                <div className="text-xs text-emerald-600 font-medium mb-0.5">If you apply all cuts</div>
                <div className="text-sm font-bold text-emerald-700">
                  Pay off debt {formatMonths(mSaved)} sooner · save {formatCurrency(iSaved)} in interest
                </div>
                <div className="text-xs text-emerald-500 mt-0.5">
                  {formatCurrency(totalCut)}/mo extra toward debt
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* No cuts needed */}
      {analysis.hasData && impacts.length === 0 && overWants <= 0 && avgMonthlyIncome > 0 && (
        <div className="card p-4 text-center">
          <span className="text-2xl block mb-1">🎉</span>
          <p className="text-sm font-medium text-slate-700">Your budget is well-balanced!</p>
          <p className="text-xs text-slate-400 mt-0.5">Keep it up and you'll hit your payoff goal on track.</p>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function SpendingRow({ label, sublabel, amount, target, targetLabel, pct, color, over }) {
  const barPct = Math.min(100, pct);
  const targetPct = target && amount > 0 ? Math.min(100, (target / (amount / (pct / 100))) * 100) : null;

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <div>
          <span className={`text-xs font-semibold ${over ? 'text-red-500' : 'text-slate-600'}`}>{label}</span>
          {sublabel && <span className="text-xs text-slate-400 ml-1">{sublabel}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {over && <span className="text-xs text-red-500 font-medium">↑ Over</span>}
          <span className={`text-xs font-semibold ${over ? 'text-red-500' : 'text-slate-700'}`}>
            {formatCurrency(amount)}<span className="font-normal text-slate-400">  {Math.round(pct)}%</span>
          </span>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
        <div className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-400' : color}`} style={{ width: `${barPct}%` }} />
        {targetPct !== null && (
          <div className="absolute top-0 h-full w-px bg-slate-400 opacity-50" style={{ left: `${targetPct}%` }} />
        )}
      </div>
      {targetLabel && target && (
        <div className="text-right text-[10px] text-slate-400 mt-0.5">{targetLabel}: {formatCurrency(target)}</div>
      )}
    </div>
  );
}

function Alert({ type, icon, children }) {
  const styles = {
    warn:    'bg-amber-50 text-amber-800 border-amber-100',
    info:    'bg-blue-50 text-blue-800 border-blue-100',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    danger:  'bg-red-50 text-red-800 border-red-100',
  };
  return (
    <div className={`flex gap-2 p-2.5 rounded-xl border text-xs ${styles[type]}`}>
      <span className="flex-shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
