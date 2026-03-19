import { monthlyEquivalent, monthISO } from './formatters.js';
import { biweeklyToMonthly } from './debtCalc.js';

// Categories that count as "needs" (essentials)
const NEEDS_CATS = new Set(['Housing', 'Food', 'Transport', 'Healthcare', 'Utilities']);

/**
 * Analyze the user's financial picture from real transaction data.
 * Uses the last 3 full months of transactions to compute averages.
 * Returns income breakdown, needs/wants split, and actionable recommendations.
 */
export function analyzeFinances(state) {
  const { transactions, recurringItems, debts, settings } = state;

  // Build list of last 3 full months (not the current partial month)
  const today = new Date();
  const months = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(monthISO(d));
  }

  // ── Income ──────────────────────────────────────────────────────────────────
  // Sum income from transactions for each past month
  const monthlyIncomeSamples = months.map((m) =>
    transactions
      .filter((t) => t.type === 'income' && t.date?.startsWith(m))
      .reduce((s, t) => s + (t.amount || 0), 0)
  );

  // Also add recurring income (monthly equivalent)
  const recurringIncome = recurringItems
    .filter((r) => r.isActive && r.type === 'income')
    .reduce((s, r) => s + monthlyEquivalent(r.amount, r.frequency), 0);

  const txAvgIncome = monthlyIncomeSamples.reduce((s, v) => s + v, 0) / 3;

  // Prefer: settings income (manual) > transaction average > recurring income
  let settingsIncome = parseFloat(settings.monthlyIncome) || 0;
  if (settings.paySchedule === 'biweekly' && settingsIncome > 0) {
    settingsIncome = biweeklyToMonthly(settingsIncome);
  }
  const avgMonthlyIncome = settingsIncome || txAvgIncome || recurringIncome;
  const incomeSource = settingsIncome ? 'settings' : txAvgIncome > 0 ? 'transactions' : recurringIncome > 0 ? 'recurring' : 'none';

  // ── Expense breakdown by category (3-month avg) ─────────────────────────────
  const catTotals = {}; // { category: total over 3 months }

  // From transactions
  months.forEach((m) => {
    transactions
      .filter((t) => t.type === 'expense' && t.date?.startsWith(m))
      .forEach((t) => {
        const c = t.category || 'Other';
        catTotals[c] = (catTotals[c] || 0) + (t.amount || 0);
      });
  });

  // Monthly average per category
  const catAvg = {};
  Object.entries(catTotals).forEach(([c, total]) => {
    catAvg[c] = total / 3;
  });

  // Add recurring bills/subscriptions
  recurringItems
    .filter((r) => r.isActive && r.type !== 'income')
    .forEach((r) => {
      const c = r.category || (r.type === 'subscription' ? 'Subscriptions' : 'Other');
      catAvg[c] = (catAvg[c] || 0) + monthlyEquivalent(r.amount, r.frequency);
    });

  // ── Split into needs vs wants ────────────────────────────────────────────────
  const needsBreakdown = {};
  const wantsBreakdown = {};

  Object.entries(catAvg).forEach(([c, amt]) => {
    if (c === 'Savings') return; // handled separately
    if (NEEDS_CATS.has(c)) {
      needsBreakdown[c] = (needsBreakdown[c] || 0) + amt;
    } else {
      wantsBreakdown[c] = (wantsBreakdown[c] || 0) + amt;
    }
  });

  const totalNeeds = Object.values(needsBreakdown).reduce((s, v) => s + v, 0);
  const totalWants = Object.values(wantsBreakdown).reduce((s, v) => s + v, 0);

  // ── Savings ─────────────────────────────────────────────────────────────────
  const avgMonthlySavings = months.reduce((sum, m) => {
    return sum + transactions
      .filter((t) => t.category === 'Savings' && t.date?.startsWith(m))
      .reduce((s, t) => s + (t.amount || 0), 0);
  }, 0) / 3;

  // ── Debt payments ────────────────────────────────────────────────────────────
  const totalDebtMinimums = debts.reduce((s, d) => s + (parseFloat(d.minPayment) || 0), 0);
  const extraDebtPayment = parseFloat(settings.extraDebtPayment) || 0;
  const currentDebtPayment = totalDebtMinimums + extraDebtPayment;

  // ── 50/30/20 targets ─────────────────────────────────────────────────────────
  const targetNeeds = avgMonthlyIncome * 0.5;
  const targetWants = avgMonthlyIncome * 0.3;
  const targetDebtSavings = avgMonthlyIncome * 0.2;

  const totalExpenses = totalNeeds + totalWants + avgMonthlySavings + currentDebtPayment;
  const cashRemaining = avgMonthlyIncome - totalExpenses;

  // Over/under on wants
  const overWants = Math.max(0, totalWants - targetWants);

  // ── Recommendations ──────────────────────────────────────────────────────────
  // Sort wants by amount descending, suggest cuts proportional to overage
  const wantsSorted = Object.entries(wantsBreakdown)
    .filter(([, amt]) => amt > 5)
    .sort((a, b) => b[1] - a[1]);

  const recommendations = wantsSorted.slice(0, 5).map(([cat, avgAmt]) => {
    // Cut proportional to how far over target wants we are (min 10%, max 35%)
    const cutPct = overWants > 0
      ? Math.min(0.35, Math.max(0.1, overWants / totalWants))
      : 0.15;
    const suggestedCut = Math.max(5, Math.round(avgAmt * cutPct / 5) * 5); // round to $5
    return { category: cat, currentAvg: Math.round(avgAmt), suggestedCut, cutPct };
  });

  const hasData = avgMonthlyIncome > 0 || totalNeeds > 0 || totalWants > 0;
  const hasTransactionData = txAvgIncome > 0 || Object.keys(catTotals).length > 0;

  return {
    avgMonthlyIncome,
    incomeSource,
    totalNeeds,
    totalWants,
    currentDebtPayment,
    avgMonthlySavings,
    cashRemaining,
    needsBreakdown,
    wantsBreakdown,
    targetNeeds,
    targetWants,
    targetDebtSavings,
    overWants,
    recommendations,
    hasData,
    hasTransactionData,
    monthsAnalyzed: months,
  };
}
