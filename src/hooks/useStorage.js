/**
 * Offline-first persistence hook.
 * Priority: Cloudflare KV (via Pages Functions) → localStorage
 *
 * Session ID is stored in localStorage (stable per device/browser).
 * KV stores data keyed by session ID with a 1-year TTL.
 */

import { useCallback, useState } from 'react';

const LS_DATA_KEY = 'debt_payoff_v1';
const LS_SESSION_KEY = 'debt_payoff_session_id';

function getOrCreateSessionId() {
  let id = localStorage.getItem(LS_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(LS_SESSION_KEY, id);
  }
  return id;
}

export function useStorage() {
  const [sessionId] = useState(getOrCreateSessionId);
  const [kvAvailable, setKvAvailable] = useState(true);

  /** Save data — always writes localStorage first, then attempts KV sync. */
  const save = useCallback(
    async (data) => {
      // Immediate local save (no-fail)
      try {
        localStorage.setItem(LS_DATA_KEY, JSON.stringify(data));
      } catch {
        // localStorage full or unavailable — silently ignore
      }

      // Best-effort KV sync
      if (!kvAvailable) return;
      try {
        const res = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, data }),
        });
        if (!res.ok) setKvAvailable(false);
      } catch {
        setKvAvailable(false);
      }
    },
    [sessionId, kvAvailable]
  );

  /**
   * Load data — tries KV first, falls back to localStorage.
   * Returns null if no data found anywhere.
   */
  const load = useCallback(async () => {
    // Try KV first (cross-device sync)
    if (kvAvailable) {
      try {
        const res = await fetch(`/api/load?sessionId=${encodeURIComponent(sessionId)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) return json.data;
        } else {
          setKvAvailable(false);
        }
      } catch {
        setKvAvailable(false);
      }
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(LS_DATA_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [sessionId, kvAvailable]);

  /** Wipe all saved data (local + KV) */
  const clear = useCallback(async () => {
    try {
      localStorage.removeItem(LS_DATA_KEY);
    } catch {
      /* ignore */
    }
    if (kvAvailable) {
      try {
        await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, data: null }),
        });
      } catch {
        /* ignore */
      }
    }
  }, [sessionId, kvAvailable]);

  return { save, load, clear, sessionId, kvAvailable };
}
