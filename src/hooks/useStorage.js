/**
 * Persistence hook — localStorage only.
 * Fast, reliable, no session ID fragility.
 * Use exportData/importData in FinanceContext for cross-device backup.
 */

import { useCallback } from 'react';

const LS_DATA_KEY = 'financeos_v1';

export function useStorage() {
  const save = useCallback((data) => {
    try {
      localStorage.setItem(LS_DATA_KEY, JSON.stringify(data));
    } catch {
      // Storage full — ignore silently
    }
  }, []);

  const load = useCallback(() => {
    try {
      const stored = localStorage.getItem(LS_DATA_KEY);
      // Also check old key from previous version
      if (!stored) {
        const legacy = localStorage.getItem('debt_payoff_v1');
        if (legacy) {
          const parsed = JSON.parse(legacy);
          localStorage.setItem(LS_DATA_KEY, legacy);
          localStorage.removeItem('debt_payoff_v1');
          return parsed;
        }
        return null;
      }
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(LS_DATA_KEY);
    } catch { /* ignore */ }
  }, []);

  return { save, load, clear };
}
