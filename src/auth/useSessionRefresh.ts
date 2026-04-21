import { useEffect, useCallback } from 'react';
import {
  initSessionRefresh,
  cancelScheduledRefresh,
  clearTokens,
  storeTokens,
  scheduleNextRefresh,
  TokenPayload,
} from './sessionRefresh';

export interface UseSessionRefreshOptions {
  onSessionExpired?: () => void;
}

export interface UseSessionRefreshResult {
  startSession: (payload: TokenPayload) => void;
  endSession: () => void;
}

export function useSessionRefresh({ onSessionExpired }: UseSessionRefreshOptions = {}): UseSessionRefreshResult {
  const handleError = useCallback(
    (err: unknown) => {
      console.warn('[useSessionRefresh] Session expired:', err);
      onSessionExpired?.();
    },
    [onSessionExpired]
  );

  useEffect(() => {
    initSessionRefresh(handleError);
    return () => { cancelScheduledRefresh(); };
  }, [handleError]);

  const startSession = useCallback(
    (payload: TokenPayload) => {
      storeTokens(payload);
      scheduleNextRefresh(payload.expiresAt, handleError);
    },
    [handleError]
  );

  const endSession = useCallback(() => { clearTokens(); }, []);

  return { startSession, endSession };
}
