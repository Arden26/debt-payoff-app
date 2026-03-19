export const EXPENSE_CATEGORIES = [
  { name: 'Housing',       icon: '🏠', color: '#3b82f6' },
  { name: 'Food',          icon: '🍔', color: '#f97316' },
  { name: 'Transport',     icon: '🚗', color: '#8b5cf6' },
  { name: 'Entertainment', icon: '🎬', color: '#ec4899' },
  { name: 'Healthcare',    icon: '💊', color: '#10b981' },
  { name: 'Shopping',      icon: '🛍️', color: '#f59e0b' },
  { name: 'Utilities',     icon: '⚡', color: '#06b6d4' },
  { name: 'Personal',      icon: '💆', color: '#ef4444' },
  { name: 'Education',     icon: '📚', color: '#6366f1' },
  { name: 'Subscriptions', icon: '🔄', color: '#84cc16' },
  { name: 'Other',         icon: '📦', color: '#94a3b8' },
];

export const INCOME_CATEGORIES = [
  { name: 'Salary',     icon: '💼', color: '#10b981' },
  { name: 'Freelance',  icon: '💻', color: '#3b82f6' },
  { name: 'Investment', icon: '📈', color: '#8b5cf6' },
  { name: 'Gift',       icon: '🎁', color: '#ec4899' },
  { name: 'Refund',     icon: '↩️',  color: '#f59e0b' },
  { name: 'Other',      icon: '💰', color: '#94a3b8' },
];

export const SAVINGS_ICONS = ['🏠', '🚗', '✈️', '💍', '🎓', '🏖️', '💻', '🐣', '🏦', '🎯', '💪', '🌟'];
export const SAVINGS_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316'];

export const RECURRING_TYPES = [
  { value: 'subscription', label: 'Subscription', icon: '🔄', color: '#8b5cf6' },
  { value: 'bill',         label: 'Bill',          icon: '📄', color: '#ef4444' },
  { value: 'income',       label: 'Income',        icon: '💰', color: '#10b981' },
];

export function getCategoryConfig(name, type = 'expense') {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.find((c) => c.name === name) ?? { name, icon: '📦', color: '#94a3b8' };
}

export const DEFAULT_BUDGET_CATEGORIES = EXPENSE_CATEGORIES.map((c) => ({
  ...c,
  limit: 0,
}));
