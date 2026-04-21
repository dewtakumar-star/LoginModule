import React, { useState, useCallback, useEffect } from 'react';
import { useInactivityLogout } from '../hooks/useInactivityLogout';

export interface InactivityGuardProps {
  /** Inactivity timeout in milliseconds. Default: 15 minutes */
  timeoutMs?: number;
  /** Warning period before logout in milliseconds. Default: 1 minute */
  warningMs?: number;
  /** Async function that performs the logout (clear session, redirect, etc.) */
  onLogout: () => void | Promise<void>;
  /** Content rendered when the user is authenticated */
  children: React.ReactNode;
}

/**
 * InactivityGuard wraps authenticated content and automatically logs out
 * the user after a configurable period of inactivity. A countdown warning
 * modal is displayed before the session expires.
 */
export const InactivityGuard: React.FC<InactivityGuardProps> = ({
  timeoutMs = 15 * 60 * 1000,
  warningMs = 60 * 1000,
  onLogout,
  children,
}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCountdown = useCallback(() => {
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const handleWarning = useCallback(
    (remainingMs: number) => {
      setShowWarning(true);
      setCountdown(Math.ceil(remainingMs / 1000));

      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            stopCountdown();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [stopCountdown]
  );

  const handleLogout = useCallback(async () => {
    stopCountdown();
    setShowWarning(false);
    await onLogout();
  }, [onLogout, stopCountdown]);

  const handleActivity = useCallback(() => {
    if (showWarning) {
      stopCountdown();
      setShowWarning(false);
    }
  }, [showWarning, stopCountdown]);

  const { resetTimer } = useInactivityLogout({
    timeoutMs,
    warningMs,
    onLogout: handleLogout,
    onWarning: handleWarning,
    onActivity: handleActivity,
  });

  // Clean up countdown on unmount
  useEffect(() => () => stopCountdown(), [stopCountdown]);

  const handleStayLoggedIn = useCallback(() => {
    stopCountdown();
    setShowWarning(false);
    resetTimer();
  }, [resetTimer, stopCountdown]);

  return (
    <>
      {children}

      {showWarning && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inactivity-warning-title"
          aria-describedby="inactivity-warning-desc"
          style={overlayStyle}
        >
          <div style={modalStyle}>
            <h2 id="inactivity-warning-title" style={{ marginTop: 0 }}>
              Session Expiring Soon
            </h2>
            <p id="inactivity-warning-desc">
              You have been inactive for a while. For your security, you will be
              automatically logged out in{' '}
              <strong>{countdown} second{countdown !== 1 ? 's' : ''}</strong>.
            </p>
            <div style={buttonRowStyle}>
              <button
                onClick={handleStayLoggedIn}
                style={primaryButtonStyle}
                autoFocus
              >
                Stay Logged In
              </button>
              <button onClick={handleLogout} style={secondaryButtonStyle}>
                Log Out Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const modalStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '8px',
  padding: '2rem',
  maxWidth: '420px',
  width: '90%',
  boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
  fontFamily: 'sans-serif',
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  justifyContent: 'flex-end',
  marginTop: '1.5rem',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '0.6rem 1.2rem',
  backgroundColor: '#1a73e8',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 600,
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '0.6rem 1.2rem',
  backgroundColor: 'transparent',
  color: '#1a73e8',
  border: '1px solid #1a73e8',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 600,
};

export default InactivityGuard;
