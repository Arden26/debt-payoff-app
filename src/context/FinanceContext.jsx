import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { generateId, todayISO } from '../utils/formatters.js';
import { DEFAULT_BUDGET_CATEGORIES } from '../utils/categoryConfig.js';
import { useStorage } from '../hooks/useStorage.js';
import { STRATEGIES } from '../utils/debtCalc.js';

// ─── Initial State ────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  transactions: [],       // { id, type, name, amount, date, category, notes }
  recurringItems: [],     // { id, name, amount, frequency, nextDate, category, type, color, isActive }
  savingsGoals: [],       // { id, name, targetAmount, currentAmount, deadline, color, icon }
  debts: [],              // { id, name, balance, apr, minPayment }
  budgetCategories: DEFAULT_BUDGET_CATEGORIES,
  settings: {
    monthlyIncome: '',
    paySchedule: 'monthly',
    extraDebtPayment: 0,
    debtStrategy: STRATEGIES.AVALANCHE,
    currency: 'USD',
  },
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    // Transactions
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [{ ...action.payload, id: generateId() }, ...state.transactions] };
    case 'UPDATE_TRANSACTION':
      return { ...state, transactions: state.transactions.map((t) => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.id) };

    // Recurring Items
    case 'ADD_RECURRING':
      return { ...state, recurringItems: [{ ...action.payload, id: generateId(), isActive: true }, ...state.recurringItems] };
    case 'UPDATE_RECURRING':
      return { ...state, recurringItems: state.recurringItems.map((r) => r.id === action.payload.id ? action.payload : r) };
    case 'DELETE_RECURRING':
      return { ...state, recurringItems: state.recurringItems.filter((r) => r.id !== action.id) };

    // Savings Goals
    case 'ADD_SAVINGS_GOAL':
      return { ...state, savingsGoals: [{ ...action.payload, id: generateId() }, ...state.savingsGoals] };
    case 'UPDATE_SAVINGS_GOAL':
      return { ...state, savingsGoals: state.savingsGoals.map((g) => g.id === action.payload.id ? action.payload : g) };
    case 'DELETE_SAVINGS_GOAL':
      return { ...state, savingsGoals: state.savingsGoals.filter((g) => g.id !== action.id) };
    case 'CONTRIBUTE_SAVINGS': {
      return {
        ...state,
        savingsGoals: state.savingsGoals.map((g) =>
          g.id === action.goalId
            ? { ...g, currentAmount: Math.min(g.targetAmount, (g.currentAmount || 0) + action.amount) }
            : g
        ),
        transactions: [
          { id: generateId(), type: 'expense', name: `Savings: ${action.goalName}`, amount: action.amount, date: todayISO(), category: 'Savings', notes: '' },
          ...state.transactions,
        ],
      };
    }

    // Debts
    case 'ADD_DEBT':
      return { ...state, debts: [...state.debts, { ...action.payload, id: generateId() }] };
    case 'UPDATE_DEBT':
      return { ...state, debts: state.debts.map((d) => d.id === action.payload.id ? action.payload : d) };
    case 'DELETE_DEBT':
      return { ...state, debts: state.debts.filter((d) => d.id !== action.id) };

    // Budget Categories
    case 'UPDATE_BUDGET_CATEGORY':
      return {
        ...state,
        budgetCategories: state.budgetCategories.map((c) =>
          c.name === action.payload.name ? { ...c, limit: action.payload.limit } : c
        ),
      };

    // Settings
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    // Hydrate from storage
    case 'HYDRATE':
      return { ...INITIAL_STATE, ...action.payload };

    case 'RESET':
      return INITIAL_STATE;

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const FinanceContext = createContext(null);

export function FinanceProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const { save, load } = useStorage();
  const loaded = useRef(false);
  const saveTimer = useRef(null);

  // Load from storage once on mount
  useEffect(() => {
    load().then((saved) => {
      if (saved) dispatch({ type: 'HYDRATE', payload: saved });
      loaded.current = true;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-save whenever state changes
  useEffect(() => {
    if (!loaded.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(state), 600);
    return () => clearTimeout(saveTimer.current);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <FinanceContext.Provider value={{ state, dispatch }}>
      {children}
    </FinanceContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}

/** Derived selectors */
export function useSelectors() {
  const { state } = useFinance();

  const getMonthTransactions = useCallback(
    (yearMonth) => state.transactions.filter((t) => t.date?.startsWith(yearMonth)),
    [state.transactions]
  );

  const getMonthIncome = useCallback(
    (yearMonth) =>
      getMonthTransactions(yearMonth)
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + (t.amount || 0), 0),
    [getMonthTransactions]
  );

  const getMonthExpenses = useCallback(
    (yearMonth) =>
      getMonthTransactions(yearMonth)
        .filter((t) => t.type === 'expense')
        .reduce((s, t) => s + (t.amount || 0), 0),
    [getMonthTransactions]
  );

  const totalSaved = state.savingsGoals.reduce((s, g) => s + (g.currentAmount || 0), 0);
  const totalDebt = state.debts.reduce((s, d) => s + (parseFloat(d.balance) || 0), 0);

  return { getMonthTransactions, getMonthIncome, getMonthExpenses, totalSaved, totalDebt };
}
