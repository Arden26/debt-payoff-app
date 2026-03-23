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

export function generatePersonalizedPlan(state) {
  const { debts, savingsGoals } = state;
  const analysis = analyzeFinances(state);
  const { avgMonthlyIncome, totalNeeds, totalWants } = analysis;

  if (avgMonthlyIncome <= 0) return null;

  // Active debts sorted by APR descending (highest interest first)
  const activeDebts = debts
    .filter(d => parseFloat(d.balance) > 0)
    .map(d => ({
      ...d,
      balance: parseFloat(d.balance) || 0,
      apr: parseFloat(d.apr) || 0,
      minPayment: parseFloat(d.minPayment) || 0,
      monthlyInterest: (parseFloat(d.balance) || 0) * ((parseFloat(d.apr) || 0) / 12 / 100),
    }))
    .sort((a, b) => b.apr - a.apr);

  const totalMins = activeDebts.reduce((s, d) => s + d.minPayment, 0);

  // Disposable = income - needs - recurring wants - debt minimums
  const disposable = avgMonthlyIncome - totalNeeds - totalWants - totalMins;

  // Active goals sorted by urgency (closest deadline first)
  const today = new Date();
  const activeGoals = savingsGoals
    .filter(g => (g.currentAmount || 0) < (g.targetAmount || 0))
    .map(g => {
      const needed = (g.targetAmount || 0) - (g.currentAmount || 0);
      const daysLeft = g.deadline
        ? Math.max(1, (new Date(g.deadline) - today) / (1000 * 60 * 60 * 24))
        : 730;
      const monthsLeft = Math.max(1, daysLeft / 30.4);
      const monthlyNeeded = needed / monthsLeft;
      return { ...g, needed, monthsLeft: Math.ceil(monthsLeft), monthlyNeeded };
    })
    .sort((a, b) => a.monthsLeft - b.monthsLeft);

  const allocations = [];
  let pool = Math.max(0, disposable); // money left to allocate

  // Helper: push allocation and deduct from pool
  const alloc = (item) => {
    allocations.push(item);
    pool = Math.max(0, pool - item.amount);
  };

  // --- Step 1: Urgent savings goals (deadline ≤ 6 months) ---
  activeGoals
    .filter(g => g.monthsLeft <= 6)
    .forEach(g => {
      if (pool <= 0) return;
      const amount = Math.min(pool, Math.ceil(g.monthlyNeeded / 5) * 5);
      alloc({
        type: 'savings', id: g.id, name: g.name, amount,
        urgency: 'urgent',
        tag: `⏰ Deadline in ${g.monthsLeft} month${g.monthsLeft !== 1 ? 's' : ''}`,
        reason: `You need $${Math.ceil(g.monthlyNeeded)}/mo to reach your $${Math.round(g.targetAmount).toLocaleString()} goal on time.`,
        onTrack: amount >= g.monthlyNeeded,
        monthsToComplete: amount > 0 ? Math.ceil(g.needed / amount) : null,
      });
    });

  // --- Step 2: High-interest debt (APR > 8%) — avalanche method ---
  const highInterestDebts = activeDebts.filter(d => d.apr > 8);
  if (highInterestDebts.length > 0 && pool > 0) {
    const topDebt = highInterestDebts[0];
    const extraPct = Math.min(0.7, 0.4 + (topDebt.apr - 8) / 50);
    const extraPayment = Math.max(10, Math.round((pool * extraPct) / 5) * 5);
    const amount = Math.min(pool, extraPayment);
    const totalPay = topDebt.minPayment + amount;
    const r = topDebt.apr / 12 / 100;
    const monthsToPayoff = r > 0 && totalPay > topDebt.balance * r
      ? Math.ceil(-Math.log(1 - r * topDebt.balance / totalPay) / Math.log(1 + r))
      : null;
    alloc({
      type: 'debt', id: topDebt.id, name: topDebt.name, amount,
      apr: topDebt.apr,
      urgency: 'high',
      tag: `🔥 ${topDebt.apr}% APR`,
      reason: `This debt costs you ~$${Math.round(topDebt.monthlyInterest)}/mo in interest. Paying it down first is your highest guaranteed return.`,
      monthsToPayoff,
      interestSaved: monthsToPayoff ? Math.round(topDebt.monthlyInterest * monthsToPayoff * 0.5) : null,
    });
  }

  // --- Step 3: Non-urgent savings goals ---
  activeGoals
    .filter(g => g.monthsLeft > 6)
    .forEach(g => {
      if (pool <= 0) return;
      const amount = Math.min(pool, Math.ceil(g.monthlyNeeded / 5) * 5);
      alloc({
        type: 'savings', id: g.id, name: g.name, amount,
        urgency: 'normal',
        tag: `🎯 ${g.monthsLeft} months left`,
        reason: `Save $${Math.ceil(g.monthlyNeeded)}/mo to hit $${Math.round(g.targetAmount).toLocaleString()} by your target date.`,
        onTrack: amount >= g.monthlyNeeded,
        monthsToComplete: amount > 0 ? Math.ceil(g.needed / amount) : null,
      });
    });

  // --- Step 4: Lower-interest debt with remainder ---
  const lowInterestDebts = activeDebts.filter(d => d.apr <= 8);
  if (lowInterestDebts.length > 0 && pool > 20) {
    const debt = lowInterestDebts[0];
    const amount = Math.round(pool * 0.6 / 5) * 5;
    if (amount > 0) {
      alloc({
        type: 'debt', id: debt.id, name: debt.name, amount,
        apr: debt.apr,
        urgency: 'low',
        tag: `💳 ${debt.apr}% APR`,
        reason: `Lower interest — good to pay down steadily while balancing savings.`,
      });
    }
  }

  // --- Build what-to-cut suggestions ---
  const cuts = Object.entries(analysis.wantsBreakdown)
    .filter(([, amt]) => amt > 20)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cat, avg]) => {
      const cutAmt = Math.round(avg * 0.2 / 5) * 5;
      return { category: cat, currentAvg: Math.round(avg), cutAmount: cutAmt };
    });

  // --- Timeline milestones ---
  const timeline = [];
  allocations.forEach(a => {
    if (a.type === 'debt' && a.monthsToPayoff) {
      const d = new Date();
      d.setMonth(d.getMonth() + a.monthsToPayoff);
      timeline.push({
        label: `${a.name} paid off`,
        date: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        type: 'debt',
        months: a.monthsToPayoff,
      });
    }
    if (a.type === 'savings' && a.monthsToComplete) {
      const d = new Date();
      d.setMonth(d.getMonth() + a.monthsToComplete);
      timeline.push({
        label: `${a.name} goal reached`,
        date: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        type: 'savings',
        months: a.monthsToComplete,
      });
    }
  });
  timeline.sort((a, b) => a.months - b.months);

  return {
    canPlan: true,
    income: avgMonthlyIncome,
    totalNeeds,
    totalWants,
    totalMins,
    disposable,
    allocations,
    leftover: pool,
    cuts,
    timeline,
    hasDebts: activeDebts.length > 0,
    hasGoals: activeGoals.length > 0,
  };
}
