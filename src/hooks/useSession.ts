import { useSyncExternalStore, useCallback } from 'react';
import { sessionStore } from '../core/SessionStore';
import type { SessionData } from '../core/SessionStore';

/**
 * React hook for accessing session data collected across all acts.
 */
export function useSession() {
  const data = useSyncExternalStore(
    sessionStore.subscribe.bind(sessionStore),
    sessionStore.getData.bind(sessionStore),
  );

  return {
    data,
    store: sessionStore,
    hasData: useCallback((key: keyof SessionData) => {
      const val = data[key];
      if (val === null) return false;
      if (Array.isArray(val)) return val.length > 0;
      return true;
    }, [data]),
  };
}
