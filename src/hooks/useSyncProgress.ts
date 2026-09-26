import { useState, useEffect, useCallback, useRef } from 'react';
import { SyncManager, SyncProgressUpdate, SyncStage, Connectivity } from '../utils/offlineDB';

export interface UseSyncProgressReturn {
  isVisible: boolean;
  progress: number;
  stage: SyncStage;
  message: string;
  current: number;
  total: number;
  currentAction?: string;
  isOnline: boolean;
  triggerSimulatedReconnect: () => void;
  triggerSyncNow: () => Promise<void>;
}

export function useSyncProgress(): UseSyncProgressReturn {
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [stage, setStage] = useState<SyncStage>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [current, setCurrent] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [currentAction, setCurrentAction] = useState<string | undefined>(undefined);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state update handler
  const handleProgressUpdate = useCallback((update: SyncProgressUpdate) => {
    setStage(update.stage);
    setProgress(update.progress);
    setMessage(update.message);
    setCurrent(update.current);
    setTotal(update.total);
    setCurrentAction(update.currentAction);

    if (update.stage !== 'idle') {
      setIsVisible(true);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    } else {
      // Fade out after completion
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 300);
    }
  }, []);

  useEffect(() => {
    // Subscribe to SyncManager
    const unsubscribe = SyncManager.addProgressListener(handleProgressUpdate);

    // Online & Offline browser events
    const handleOnline = () => {
      setIsOnline(true);
      // Immediately show reconnecting progress
      SyncManager.notifyProgress({
        stage: 'reconnecting',
        progress: 15,
        current: 0,
        total: 0,
        message: 'Internet connection restored • Syncing data...',
        timestamp: Date.now(),
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStage('idle');
      setIsVisible(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [handleProgressUpdate]);

  // Manually trigger a realistic reconnect & sync flow (for demonstration / testing)
  const triggerSimulatedReconnect = useCallback(() => {
    SyncManager.notifyProgress({
      stage: 'reconnecting',
      progress: 18,
      current: 0,
      total: 0,
      message: 'Internet reconnected • Re-establishing secure tunnel...',
      timestamp: Date.now(),
    });

    setTimeout(() => {
      SyncManager.processQueue();
    }, 450);
  }, []);

  // Trigger real sync
  const triggerSyncNow = useCallback(async () => {
    if (!Connectivity.isOnline()) return;
    SyncManager.notifyProgress({
      stage: 'syncing',
      progress: 25,
      current: 0,
      total: 0,
      message: 'Synchronizing with cloud server...',
      timestamp: Date.now(),
    });
    await SyncManager.processQueue();
  }, []);

  return {
    isVisible,
    progress,
    stage,
    message,
    current,
    total,
    currentAction,
    isOnline,
    triggerSimulatedReconnect,
    triggerSyncNow,
  };
}
