import { formatCurrency, formatMonths, biweeklyToMonthly, simulatePayoff } from '../utils/debtCalc.js';

export function IncomeSettings({ income, onChange, debts, strategy }) {
  const set = (field) => (e) =>
    onChange((prev) => ({ ...prev, [field]: e.target.value }));

  const rawAmount = parseFloat(income.monthlyIncome) || 0;
  const monthlyIncome =
    income.paySchedule === 'biweekly' ? biweeklyToMonthly(rawAmount) : rawAmount;

  const extraPayment = parseFloat(income.extraDebtPayment) || 0;
  const totalBudget = monthlyIncome + extraPayment;

  // Live effect of just the extra-payment slider: compare the current
  // budget (with extra) against the same base budget with extra = 0,
  // so the number next to the slider reflects what dragging it actually buys.
  const sliderImpact = (() => {
    if (!debts || debts.length === 0 || monthlyIncome <= 0 || extraPayment <= 0) return null;
    const withExtra = simulatePayoff(debts, totalBudget, strategy);
    const withoutExtra = simulatePayoff(debts, monthlyIncome, strategy);
    if (!withExtra || !withoutExtra) return null;
    return {
      monthsSaved: Math.max(0, withoutExtra.payoffMonths - withExtra.payoffMonths),
      interestSaved: Math.max(0, withoutExtra.totalInterest - withExtra.totalInterest),
    };
  })();

  return (
    <div className="space-y-4">
      {/* Income input */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">
            {income.paySchedule === 'biweekly' ? 'Paycheck Amount' : 'Monthly Income'} ($)
          </label>
          <input
            className="input"
            type="number"
            min="0"
            step="100"
            placeholder={income.paySchedule === 'biweekly' ? '1500' : '3000'}
            value={income.monthlyIncome}
            onChange={set('monthlyIncome')}
          />
        </div>

        <div>
          <label className="label">Pay Schedule</label>
          <select
            className="input"
            value={income.paySchedule}
            onChange={set('paySchedule')}
          >
            <option value="monthly">Monthly</option>
            <option value="biweekly">Biweekly (×26)</option>
          </select>
        </div>
      </div>

      {/* Monthly equivalent for biweekly */}
      {income.paySchedule === 'biweekly' && rawAmount > 0 && (
        <p className="text-xs text-slate-400 -mt-2">
          ≈ {formatCurrency(monthlyIncome)}/mo (26 checks ÷ 12)
        </p>
      )}

      {/* Extra payment slider */}
      {monthlyIncome > 0 && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="label mb-0">Extra Monthly Payment</label>
            <span className="text-sm font-semibold text-blue-600">
              +{formatCurrency(extraPayment)}/mo
            </span>
          </div>
          <input
            type="range"
            min="0"
            max={Math.round(monthlyIncome * 0.5)}
            step="25"
            value={income.extraDebtPayment}
            onChange={set('extraDebtPayment')}
          />
          <div className="flex justify-between text-xs text-slate-400 mt-0.5">
            <span>$0</span>
            <span>{formatCurrency(monthlyIncome * 0.5)}</span>
          </div>
          {sliderImpact && (sliderImpact.monthsSaved > 0 || sliderImpact.interestSaved > 0) && (
            <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-2.5 py-1.5 mt-2">
              That extra {formatCurrency(extraPayment)}/mo pays debt off{' '}
              <strong>{formatMonths(sliderImpact.monthsSaved)} sooner</strong> and saves{' '}
              <strong>{formatCurrency(sliderImpact.interestSaved)}</strong> in interest.
            </p>
          )}
        </div>
      )}

      {/* 50/30/20 breakdown now lives only in the Spending Analysis card
          below (SmartAdvice) — it covers the same ground using actual
          transaction data instead of a static income-only estimate, so
          keeping a second, independently-computed copy here just risked
          showing a different number for the same thing. */}
      {monthlyIncome > 0 && (
        <p className="text-xs text-slate-400">
          See the Spending Analysis below for how this income breaks down against the 50/30/20 guideline.
        </p>
      )}
    </div>
  );
}
