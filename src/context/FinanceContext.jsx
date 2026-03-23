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
    case 'ADD_DEBT': {
      const bal = parseFloat(action.payload.balance) || 0;
      return { ...state, debts: [...state.debts, { ...action.payload, id: generateId(), originalBalance: bal }] };
    }
    case 'UPDATE_DEBT':
      return { ...state, debts: state.debts.map((d) => d.id === action.payload.id ? action.payload : d) };
    case 'DELETE_DEBT':
      return { ...state, debts: state.debts.filter((d) => d.id !== action.id) };
    case 'MAKE_DEBT_PAYMENT': {
      const { debtId, debtName, amount, date, notes } = action;
      return {
        ...state,
        debts: state.debts.map((d) =>
          d.id === debtId
            ? { ...d, balance: Math.max(0, parseFloat(d.balance) - amount) }
            : d
        ),
        transactions: [
          {
            id: generateId(),
            type: 'expense',
            name: `Debt Payment: ${debtName}`,
            amount,
            date: date || todayISO(),
            category: 'Debt Payment',
            notes: notes || '',
          },
          ...state.transactions,
        ],
      };
    }

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
      return {
        ...INITIAL_STATE,
        ...action.payload,
        settings: { ...INITIAL_STATE.settings, ...(action.payload.settings || {}) },
        budgetCategories: action.payload.budgetCategories?.length
          ? action.payload.budgetCategories
          : INITIAL_STATE.budgetCategories,
      };

    case 'IMPORT_TRANSACTIONS': {
      const imported = action.payload.map((t) => ({
        ...t,
        id: generateId(),
        category: t.category || 'Other',
        notes: t.notes || '',
      }));
      return { ...state, transactions: [...imported, ...state.transactions] };
    }

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
  const { save, load, clear } = useStorage();
  const loaded = useRef(false);
  const saveTimer = useRef(null);

  // Load from localStorage once on mount (synchronous)
  useEffect(() => {
    const saved = load();
    if (saved) dispatch({ type: 'HYDRATE', payload: saved });
    loaded.current = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-save whenever state changes
  useEffect(() => {
    if (!loaded.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(state), 400);
    return () => clearTimeout(saveTimer.current);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Download all data as a JSON backup file */
  const exportData = useCallback(() => {
    const blob = new Blob(
      [JSON.stringify({ ...state, exportedAt: new Date().toISOString(), version: 1 }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  /** Import data from a JSON backup file (prompts file picker) */
  const importData = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          // Strip metadata fields before hydrating
          const { exportedAt, version, ...data } = parsed; // eslint-disable-line no-unused-vars
          dispatch({ type: 'HYDRATE', payload: data });
        } catch {
          alert('Invalid backup file. Please select a valid FinanceOS .json backup.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  /** Wipe all local data */
  const resetAll = useCallback(() => {
    clear();
    dispatch({ type: 'RESET' });
  }, [clear]);

  return (
    <FinanceContext.Provider value={{ state, dispatch, exportData, importData, resetAll }}>
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
