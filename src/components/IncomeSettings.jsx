import { calcBudgetRecommendation, formatCurrency, biweeklyToMonthly } from '../utils/debtCalc.js';

export function IncomeSettings({ income, onChange }) {
  const set = (field) => (e) =>
    onChange((prev) => ({ ...prev, [field]: e.target.value }));

  const rawAmount = parseFloat(income.monthlyIncome) || 0;
  const monthlyIncome =
    income.paySchedule === 'biweekly' ? biweeklyToMonthly(rawAmount) : rawAmount;

  const budget = calcBudgetRecommendation(monthlyIncome);
  const extraPayment = parseFloat(income.extraDebtPayment) || 0;
  const totalBudget = monthlyIncome + extraPayment;

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
        </div>
      )}

      {/* 50/30/20 recommendation */}
      {monthlyIncome > 0 && (
        <div className="bg-slate-50 rounded-xl p-3 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            50/30/20 Budget Guide
          </div>
          <BudgetBar label="Needs (50%)" amount={budget.needs} color="bg-blue-400" total={monthlyIncome} />
          <BudgetBar label="Wants (30%)" amount={budget.wants} color="bg-violet-400" total={monthlyIncome} />
          <BudgetBar
            label="Debt & Savings (20%)"
            amount={budget.debtAndSavings}
            color="bg-emerald-400"
            total={monthlyIncome}
            highlight
          />
          <p className="text-xs text-slate-400 pt-1">
            Recommended debt budget: <strong className="text-emerald-600">{formatCurrency(budget.debtAndSavings)}/mo</strong>
            {totalBudget > 0 && (
              <> · You're allocating <strong className="text-blue-600">{formatCurrency(totalBudget)}/mo</strong></>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

function BudgetBar({ label, amount, color, total, highlight }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className={highlight ? 'font-semibold text-slate-700' : 'text-slate-500'}>
          {label}
        </span>
        <span className={highlight ? 'font-semibold text-emerald-600' : 'text-slate-500'}>
          {formatCurrency(amount)}/mo
        </span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
