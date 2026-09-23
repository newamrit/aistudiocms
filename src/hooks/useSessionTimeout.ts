import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sounds } from '../utils/sounds';

// 15 minutes timeout in milliseconds
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 900,000 ms (15 minutes)
const WARNING_THRESHOLD_MS = 60 * 1000; // 60 seconds warning modal
const LAST_ACTIVITY_KEY = 'paila_cms_last_activity';
const SESSION_TIMEOUT_FLAG_KEY = 'paila_session_timeout_msg';

export function useSessionTimeout() {
  const { isAuthenticated, logout } = useAuth();
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const lastActivityRef = useRef<number>(Date.now());
  const soundPlayedRef = useRef<boolean>(false);

  // Reset activity timestamp and sync with localStorage
  const recordActivity = useCallback(() => {
    const now = Date.now();
    // Throttle writes to localStorage (at most once every 3 seconds)
    if (now - lastActivityRef.current > 3000) {
      lastActivityRef.current = now;
      try {
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
      } catch {
        // Ignore
      }
      if (showWarningModal) {
        setShowWarningModal(false);
        soundPlayedRef.current = false;
      }
    }
  }, [showWarningModal]);

  // Explicit stay logged in action
  const extendSession = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    soundPlayedRef.current = false;
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    } catch {
      // Ignore
    }
    setShowWarningModal(false);
    sounds.click();
  }, []);

  // Listen to user interaction events
  useEffect(() => {
    if (!isAuthenticated) return;

    // Initialize last activity time on mount or login
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    } catch {
      // Ignore
    }

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
      'wheel',
    ];

    const handleUserActivity = () => {
      recordActivity();
    };

    activityEvents.forEach(evt => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Cross-tab synchronization via storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        const remoteTime = parseInt(e.newValue, 10);
        if (!isNaN(remoteTime)) {
          lastActivityRef.current = remoteTime;
          setShowWarningModal(false);
          soundPlayedRef.current = false;
        }
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, handleUserActivity);
      });
      window.removeEventListener('storage', handleStorage);
    };
  }, [isAuthenticated, recordActivity]);

  // Periodic heartbeat checker (runs every second)
  useEffect(() => {
    if (!isAuthenticated) {
      setShowWarningModal(false);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      let lastTime = lastActivityRef.current;

      try {
        const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed > lastTime) {
            lastTime = parsed;
            lastActivityRef.current = parsed;
          }
        }
      } catch {
        // Ignore
      }

      const elapsed = now - lastTime;
      const remainingMs = INACTIVITY_TIMEOUT_MS - elapsed;

      if (remainingMs <= 0) {
        // Inactivity timeout reached! Auto logout.
        try {
          localStorage.setItem(
            SESSION_TIMEOUT_FLAG_KEY,
            'Your session expired after 15 minutes of inactivity for security.'
          );
        } catch {
          // Ignore
        }
        setShowWarningModal(false);
        sounds.warning();
        logout();
      } else if (remainingMs <= WARNING_THRESHOLD_MS) {
        // Show warning countdown modal
        const secondsLeft = Math.max(1, Math.ceil(remainingMs / 1000));
        setSecondsRemaining(secondsLeft);
        setShowWarningModal(true);

        // Play warning tone once when modal first pops up
        if (!soundPlayedRef.current) {
          sounds.warning();
          soundPlayedRef.current = true;
        }
      } else {
        if (showWarningModal) {
          setShowWarningModal(false);
          soundPlayedRef.current = false;
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, logout, showWarningModal]);

  return {
    showWarningModal,
    secondsRemaining,
    extendSession,
    logoutNow: logout,
  };
}
