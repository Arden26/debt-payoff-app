/**
 * Debt Payoff Calculator Engine
 *
 * Algorithm design inspired by:
 *   - https://github.com/nielse63/node-debt-snowball (MIT)
 *   - https://github.com/bradymholt/debt-paydown-calculator (MIT)
 *
 * Monthly compound interest: Interest = Balance × (APR / 12 / 100)
 * Extra payments applied to priority debt (waterfall method).
 */

export const STRATEGIES = {
  SNOWBALL: 'snowball',   // Smallest balance first (psychological wins)
  AVALANCHE: 'avalanche', // Highest APR first (mathematically optimal)
  HYBRID: 'hybrid',       // Weighted score: 60% APR rank + 40% balance rank
};

export const STRATEGY_LABELS = {
  [STRATEGIES.SNOWBALL]: 'Debt Snowball',
  [STRATEGIES.AVALANCHE]: 'Debt Avalanche',
  [STRATEGIES.HYBRID]: 'Hybrid',
};

export const STRATEGY_DESCRIPTIONS = {
  [STRATEGIES.SNOWBALL]: 'Pay smallest balances first for quick wins & motivation.',
  [STRATEGIES.AVALANCHE]: 'Pay highest interest first — saves the most money.',
  [STRATEGIES.HYBRID]: 'Balance of speed and savings using a weighted score.',
};

const MAX_MONTHS = 600; // 50-year safety cap

/**
 * Run a full payoff simulation month by month.
 *
 * @param {Array<{id,name,balance,apr,minPayment}>} debts
 * @param {number} monthlyBudget  - Total dollars/month for ALL debt payments
 * @param {string} strategy       - STRATEGIES constant
 * @returns {SimResult|null}
 */
export function simulatePayoff(debts, monthlyBudget, strategy) {
  if (!debts || debts.length === 0) return null;

  const validDebts = debts.filter(
    (d) => parseFloat(d.balance) > 0 && parseFloat(d.minPayment) > 0
  );
  if (validDebts.length === 0) return null;

  // Clone into mutable state
  let state = validDebts.map((d) => ({
    id: d.id,
    name: d.name,
    balance: parseFloat(d.balance),
    apr: parseFloat(d.apr),
    minPayment: parseFloat(d.minPayment),
    totalInterestPaid: 0,
    paidOffMonth: null,
  }));

  // Ensure budget covers at least all minimum payments
  const totalMin = state.reduce((s, d) => s + d.minPayment, 0);
  const effectiveBudget = Math.max(monthlyBudget, totalMin);

  const monthlyData = [];
  const debtPayoffOrder = [];
  let totalInterestPaid = 0;
  let month = 0;

  const startDate = new Date();

  while (state.some((d) => d.balance > 0.005) && month < MAX_MONTHS) {
    month++;
    const monthDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + month,
      1
    );

    // ── Step 1: Accrue monthly interest on all active debts ───────────────
    state = state.map((d) => {
      if (d.balance <= 0.005) return { ...d, balance: 0 };
      const interest = d.balance * (d.apr / 100 / 12);
      totalInterestPaid += interest;
      return {
        ...d,
        balance: d.balance + interest,
        totalInterestPaid: d.totalInterestPaid + interest,
      };
    });

    // ── Step 2: Pay minimums on all active debts ──────────────────────────
    const activeDebts = state.filter((d) => d.balance > 0.005);
    const minPaid = activeDebts.reduce(
      (s, d) => s + Math.min(d.minPayment, d.balance),
      0
    );
    let extraBudget = Math.max(0, effectiveBudget - minPaid);

    state = state.map((d) => {
      if (d.balance <= 0.005) return { ...d, balance: 0 };
      const payment = Math.min(d.minPayment, d.balance);
      return { ...d, balance: Math.max(0, d.balance - payment) };
    });

    // ── Step 3: Apply extra budget as waterfall to priority debts ─────────
    const priority = getPriorityOrder(
      state.filter((d) => d.balance > 0.005),
      strategy
    );

    for (const target of priority) {
      if (extraBudget < 0.005) break;
      const idx = state.findIndex((d) => d.id === target.id);
      const applied = Math.min(extraBudget, state[idx].balance);
      state[idx] = {
        ...state[idx],
        balance: Math.max(0, state[idx].balance - applied),
      };
      extraBudget -= applied;
    }

    // ── Step 4: Record newly paid-off debts ───────────────────────────────
    state = state.map((d) => {
      if (d.paidOffMonth === null && d.balance <= 0.005) {
        debtPayoffOrder.push({
          id: d.id,
          name: d.name,
          month,
          date: formatDate(monthDate),
          totalInterest: Math.round(d.totalInterestPaid * 100) / 100,
        });
        return { ...d, balance: 0, paidOffMonth: month };
      }
      return d;
    });

    // ── Snapshot this month ───────────────────────────────────────────────
    const balances = {};
    state.forEach((d) => {
      balances[d.id] = Math.round(d.balance * 100) / 100;
    });

    monthlyData.push({
      month,
      date: formatDate(monthDate),
      balances,
      totalBalance: Math.round(state.reduce((s, d) => s + d.balance, 0) * 100) / 100,
    });
  }

  // Compare to minimum-payments-only scenario
  const minOnlyResult = simulateMinimumOnly(validDebts);

  return {
    months: monthlyData,
    totalInterest: Math.round(totalInterestPaid * 100) / 100,
    interestSaved: Math.round(
      Math.max(0, minOnlyResult.totalInterest - totalInterestPaid) * 100
    ) / 100,
    monthsSaved: Math.max(0, minOnlyResult.months - month),
    payoffDate: monthlyData[monthlyData.length - 1]?.date ?? 'N/A',
    payoffMonths: month,
    debtPayoffOrder,
    strategy,
  };
}

/**
 * Simulate paying only minimum payments (for comparison baseline).
 * Uses 1% balance floor as minimum to prevent infinite loops on low-APR debts.
 */
function simulateMinimumOnly(debts) {
  let state = debts.map((d) => ({
    ...d,
    balance: parseFloat(d.balance),
    apr: parseFloat(d.apr),
    minPayment: parseFloat(d.minPayment),
  }));

  let totalInterest = 0;
  let month = 0;

  while (state.some((d) => d.balance > 0.005) && month < MAX_MONTHS) {
    month++;
    state = state.map((d) => {
      if (d.balance <= 0.005) return { ...d, balance: 0 };
      const interest = d.balance * (d.apr / 100 / 12);
      totalInterest += interest;
      const newBalance = d.balance + interest;
      // Floor: max of stated minimum or 1% of balance (prevents infinite loop)
      const payment = Math.max(d.minPayment, newBalance * 0.01);
      return { ...d, balance: Math.max(0, newBalance - payment) };
    });
  }

  return { months: month, totalInterest: Math.round(totalInterest * 100) / 100 };
}

/**
 * Sort debts by strategy priority (highest priority = index 0).
 */
function getPriorityOrder(activeDebts, strategy) {
  if (activeDebts.length === 0) return [];

  switch (strategy) {
    case STRATEGIES.SNOWBALL:
      return [...activeDebts].sort((a, b) => a.balance - b.balance);

    case STRATEGIES.AVALANCHE:
      return [...activeDebts].sort((a, b) => b.apr - a.apr);

    case STRATEGIES.HYBRID: {
      const maxBal = Math.max(...activeDebts.map((d) => d.balance));
      const maxApr = Math.max(...activeDebts.map((d) => d.apr));
      // Avoid division by zero
      return [...activeDebts].sort((a, b) => {
        const scoreA =
          (maxApr > 0 ? (a.apr / maxApr) * 0.6 : 0) +
          (maxBal > 0 ? (1 - a.balance / maxBal) * 0.4 : 0);
        const scoreB =
          (maxApr > 0 ? (b.apr / maxApr) * 0.6 : 0) +
          (maxBal > 0 ? (1 - b.balance / maxBal) * 0.4 : 0);
        return scoreB - scoreA;
      });
    }

    default:
      return activeDebts;
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

export function formatCurrencyExact(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount ?? 0);
}

export function formatMonths(months) {
  if (!months || months <= 0) return '—';
  const years = Math.floor(months / 12);
  const mo = months % 12;
  if (years === 0) return `${mo}mo`;
  if (mo === 0) return `${years}yr`;
  return `${years}yr ${mo}mo`;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Convert biweekly paycheck to monthly equivalent.
 * 26 paychecks / year ÷ 12 months = 2.1667 paychecks/month
 */
export function biweeklyToMonthly(biweeklyAmount) {
  return (biweeklyAmount * 26) / 12;
}

/**
 * 50/30/20 rule recommendation for debt payments.
 */
export function calcBudgetRecommendation(monthlyIncome) {
  return {
    needs: monthlyIncome * 0.5,
    wants: monthlyIncome * 0.3,
    debtAndSavings: monthlyIncome * 0.2,
  };
}

/**
 * Generate a unique ID without external deps.
 */
export function generateId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Chart color palette for debts (accessible, distinct colors).
 */
export const DEBT_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];
