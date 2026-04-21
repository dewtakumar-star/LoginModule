import { useEffect, useRef, useCallback } from 'react';

export interface InactivityLogoutOptions {
  /** Inactivity timeout in milliseconds. Default: 15 minutes */
  timeoutMs?: number;
  /** Warning period before logout in milliseconds. Default: 1 minute */
  warningMs?: number;
  /** Callback invoked when the user is logged out due to inactivity */
  onLogout: () => void;
  /** Optional callback invoked when the warning period begins */
  onWarning?: (remainingMs: number) => void;
  /** Optional callback invoked when user activity resets the timer */
  onActivity?: () => void;
  /** DOM events that count as user activity */
  activityEvents?: string[];
}

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_WARNING_MS = 1 * 60 * 1000;  // 1 minute
const DEFAULT_ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'click',
  'wheel',
];

export function useInactivityLogout(options: InactivityLogoutOptions): {
  resetTimer: () => void;
} {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    warningMs = DEFAULT_WARNING_MS,
    onLogout,
    onWarning,
    onActivity,
    activityEvents = DEFAULT_ACTIVITY_EVENTS,
  } = options;

  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLogoutRef = useRef(onLogout);
  const onWarningRef = useRef(onWarning);
  const onActivityRef = useRef(onActivity);

  // Keep refs up-to-date so callbacks never become stale
  useEffect(() => { onLogoutRef.current = onLogout; }, [onLogout]);
  useEffect(() => { onWarningRef.current = onWarning; }, [onWarning]);
  useEffect(() => { onActivityRef.current = onActivity; }, [onActivity]);

  const clearTimers = useCallback(() => {
    if (logoutTimerRef.current !== null) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    if (warningTimerRef.current !== null) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearTimers();

    if (onActivityRef.current) {
      onActivityRef.current();
    }

    // Schedule warning before logout
    if (warningMs > 0 && warningMs < timeoutMs) {
      warningTimerRef.current = setTimeout(() => {
        if (onWarningRef.current) {
          onWarningRef.current(warningMs);
        }
      }, timeoutMs - warningMs);
    }

    // Schedule logout
    logoutTimerRef.current = setTimeout(() => {
      onLogoutRef.current();
    }, timeoutMs);
  }, [clearTimers, timeoutMs, warningMs]);

  useEffect(() => {
    // Start the timer on mount
    resetTimer();

    const handleActivity = () => resetTimer();

    activityEvents.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true })
    );

    return () => {
      clearTimers();
      activityEvents.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeoutMs, warningMs]);

  return { resetTimer };
}
