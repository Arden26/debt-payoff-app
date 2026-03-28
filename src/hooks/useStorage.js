import { useState, useCallback, useMemo } from 'react';

const LS_DATA_KEY = 'financeos_v1';
const LS_SESSION_KEY = 'financeos_session_id';

function getOrCreateSessionId() {
  try {
    // Check new key first, then legacy key from old app version
    let id = localStorage.getItem(LS_SESSION_KEY)
          || localStorage.getItem('debt_payoff_session_id');
    if (!id) {
      id = crypto.randomUUID();
    }
    // Always normalize to new key
    localStorage.setItem(LS_SESSION_KEY, id);
    return id;
  } catch {
    return null;
  }
}

/**
 * Persistence hook — localStorage (instant) + D1 cloud sync (background).
 * - On load: shows localStorage immediately, then hydrates from D1 if available
 * - On save: writes localStorage instantly, then async-syncs to D1
 * - dbStatus: 'connecting' | 'connected' | 'offline'
 */
export function useStorage() {
  const [dbStatus, setDbStatus] = useState('connecting');

  // Stable session ID — checks legacy key so existing users keep their data
  const sessionId = useMemo(() => getOrCreateSessionId(), []);

  /** Synchronous load from localStorage (instant, for initial render) */
  const load = useCallback(() => {
    try {
      const stored = localStorage.getItem(LS_DATA_KEY);
      if (stored) return JSON.parse(stored);
      // Migrate from old app key
      const legacy = localStorage.getItem('debt_payoff_v1');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        localStorage.setItem(LS_DATA_KEY, legacy);
        localStorage.removeItem('debt_payoff_v1');
        return parsed;
      }
    } catch {}
    return null;
  }, []);

  /**
   * Async sync from D1 — call after initial localStorage load.
   * Calls onData(data) if D1 has data, so caller can re-hydrate state.
   */
  const syncFromDB = useCallback(async (onData) => {
    if (!sessionId) {
      setDbStatus('offline');
      return;
    }
    try {
      const res = await fetch(`/api/load?sessionId=${sessionId}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { data } = await res.json();
      setDbStatus('connected');
      if (data) {
        localStorage.setItem(LS_DATA_KEY, JSON.stringify(data));
        onData(data);
      }
    } catch {
      setDbStatus('offline');
    }
  }, [sessionId]);

  /** Save to localStorage immediately, then async-sync to D1 */
  const save = useCallback((data) => {
    try {
      localStorage.setItem(LS_DATA_KEY, JSON.stringify(data));
    } catch {}

    if (!sessionId) return;

    fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, data }),
    })
      .then((res) => setDbStatus(res.ok ? 'connected' : 'offline'))
      .catch(() => setDbStatus('offline'));
  }, [sessionId]);

  const clear = useCallback(() => {
    try { localStorage.removeItem(LS_DATA_KEY); } catch {}
  }, []);

  return { save, load, syncFromDB, clear, dbStatus, sessionId };
}
