import React, { useState, useEffect, useRef } from 'react';
import { Database, Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Clock, Server, CloudUpload, ArrowRight, X } from 'lucide-react';
import { SyncQueue, SyncManager, Connectivity } from '../utils/offlineDB';
import { sounds } from '../utils/sounds';

export type SyncStatusType = 'up-to-date' | 'syncing' | 'offline' | 'pending';

export interface DatabaseStatusBulbsProps {
  compact?: boolean;
  className?: string;
  theme?: 'dark' | 'light' | 'auto';
  interactive?: boolean;
  isSyncing?: boolean;
  pendingCount?: number;
  onSyncNow?: () => Promise<unknown> | void;
}

export default function DatabaseStatusBulbs({
  compact = false,
  className = '',
  theme = 'auto',
  interactive = true,
  isSyncing: propIsSyncing,
  pendingCount: propPendingCount,
  onSyncNow: propOnSyncNow,
}: DatabaseStatusBulbsProps) {
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [internalPendingCount, setInternalPendingCount] = useState<number>(0);
  const [internalIsSyncing, setInternalIsSyncing] = useState<boolean>(false);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const popupRef = useRef<HTMLDivElement>(null);

  const pendingCount = propPendingCount !== undefined ? propPendingCount : internalPendingCount;
  const isSyncing = propIsSyncing !== undefined ? propIsSyncing : internalIsSyncing;

  // Sync state determination: 'syncing' | 'offline' | 'pending' | 'up-to-date'
  const syncState: SyncStatusType = !isOnline
    ? 'offline'
    : isSyncing
    ? 'syncing'
    : pendingCount > 0
    ? 'pending'
    : 'up-to-date';

  // Periodically refresh stats from SyncQueue if not controlled by props
  const fetchQueueStats = async () => {
    try {
      const stats = await SyncQueue.getStats();
      setInternalPendingCount(stats.total);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchQueueStats();

    const handleOnline = () => {
      setIsOnline(true);
      setIsDbConnected(true);
      fetchQueueStats();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check every 8s
    const interval = setInterval(() => {
      if (propPendingCount === undefined) {
        fetchQueueStats();
      }
    }, 8000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [propPendingCount]);

  // Handle outside click to close popup
  useEffect(() => {
    if (!showPopup) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showPopup]);

  const handleManualSync = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isOnline || isSyncing) return;

    sounds.click();
    if (propOnSyncNow) {
      await propOnSyncNow();
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      return;
    }

    setInternalIsSyncing(true);
    try {
      await SyncManager.processQueue();
      await fetchQueueStats();
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      sounds.success();
    } catch (err) {
      console.warn('Manual sync error:', err);
    } finally {
      setInternalIsSyncing(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Trigger Pill */}
      <button
        type="button"
        onClick={interactive ? () => { sounds.click(); setShowPopup(prev => !prev); } : undefined}
        disabled={!interactive}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all select-none ${
          interactive ? 'cursor-pointer active:scale-95' : 'cursor-default'
        } ${
          isDark 
            ? 'bg-slate-900/80 border border-slate-700/80 shadow-2xs hover:border-slate-600 hover:bg-slate-900' 
            : 'bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-700/90 shadow-2xs backdrop-blur-xs hover:border-slate-300 dark:hover:border-slate-600'
        }`}
        title={interactive ? `Database & Sync: ${syncState.toUpperCase()} (Click to view details)` : undefined}
        aria-label="Database & Sync Status"
      >
        {/* Bulb 1: Primary Database Engine Connection */}
        <div className="flex items-center gap-1">
          <div className="relative flex items-center justify-center">
            {!isDbConnected && (
              <div className="absolute w-2.5 h-2.5 rounded-full bg-rose-500/40 animate-ping" />
            )}
            <div 
              className={`w-2 h-2 rounded-full transition-all duration-300 relative z-10 ${
                isDbConnected 
                  ? 'bg-emerald-400 shadow-[0_0_6px_#22c55e] ring-1 ring-emerald-400/40' 
                  : 'bg-rose-500 shadow-[0_0_6px_#ef4444] ring-1 ring-rose-400/40 animate-pulse'
              }`}
            />
          </div>
          {!compact && (
            <span className={`text-[9px] font-bold uppercase tracking-wider leading-none ${
              isDbConnected 
                ? (isDark ? 'text-emerald-400' : 'text-emerald-700 dark:text-emerald-400') 
                : (isDark ? 'text-rose-400' : 'text-rose-600 dark:text-rose-400')
            }`}>
              DB
            </span>
          )}
        </div>

        {/* Divider line between the two bulbs */}
        <div className={`h-3 w-px ${isDark ? 'bg-white/20' : 'bg-slate-300 dark:bg-slate-700'}`} />

        {/* Bulb 2: Live Gateway / Cloud Sync Connection */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex items-center justify-center">
            {/* Ping aura when offline or syncing */}
            {syncState === 'offline' && (
              <div className="absolute w-3 h-3 rounded-full bg-rose-500/50 animate-ping" />
            )}
            {syncState === 'syncing' && (
              <div className="absolute w-3 h-3 rounded-full bg-amber-400/50 animate-ping" />
            )}
            
            {/* Glowing Bulb Core with distinct states */}
            <div 
              className={`w-2 h-2 rounded-full transition-all duration-300 relative z-10 ${
                syncState === 'up-to-date'
                  ? 'bg-emerald-400 shadow-[0_0_6px_#22c55e] ring-1 ring-emerald-400/40'
                  : syncState === 'syncing'
                  ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b] ring-1 ring-amber-400/50 animate-pulse'
                  : syncState === 'pending'
                  ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b] ring-1 ring-amber-400/40'
                  : 'bg-rose-500 shadow-[0_0_8px_#ef4444] ring-1 ring-rose-400/40 animate-pulse'
              }`}
            />
          </div>

          {!compact && (
            <div className="flex items-center gap-1">
              <span className={`text-[9px] font-bold uppercase tracking-wider leading-none ${
                syncState === 'up-to-date'
                  ? (isDark ? 'text-emerald-400' : 'text-emerald-700 dark:text-emerald-400')
                  : syncState === 'syncing' || syncState === 'pending'
                  ? (isDark ? 'text-amber-400' : 'text-amber-700 dark:text-amber-400')
                  : (isDark ? 'text-rose-400' : 'text-rose-600 dark:text-rose-400')
              }`}>
                {syncState === 'syncing' ? 'SYNCING' : syncState === 'offline' ? 'OFFLINE' : 'SYNC'}
              </span>

              {/* Pending Queue Count Badge */}
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  {pendingCount}
                </span>
              )}
            </div>
          )}
        </div>
      </button>

      {/* Floating Popup Modal - Viewport safe design for Mobile & Desktop */}
      {interactive && showPopup && (
        <>
          {/* Backdrop for mobile dismiss */}
          <div 
            className="fixed inset-0 z-40 bg-black/40 sm:bg-transparent backdrop-blur-2xs sm:backdrop-blur-none"
            onClick={() => setShowPopup(false)}
          />

          <div
            ref={popupRef}
            className="fixed inset-x-3 top-16 sm:absolute sm:top-full sm:right-0 sm:inset-x-auto sm:mt-2 z-50 w-auto sm:w-80 max-w-[calc(100vw-24px)] p-4 bg-slate-900/95 text-white rounded-2xl shadow-2xl border border-slate-700/80 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 origin-top-right overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Server size={14} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200 text-xs sm:text-sm">Database & Sync Status</h4>
                  <p className="text-[10px] text-slate-400">Paila Field Connectivity</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Status Details Cards */}
            <div className="space-y-2.5">
              {/* Database Storage Engine */}
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e]" />
                  <div>
                    <div className="font-semibold text-slate-200 text-[11px]">Primary Database</div>
                    <div className="text-[10px] text-slate-400">IndexedDB Local Storage</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ready & Active
                </span>
              </div>

              {/* Cloud Sync State */}
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      syncState === 'up-to-date'
                        ? 'bg-emerald-400 shadow-[0_0_6px_#22c55e]'
                        : syncState === 'syncing' || syncState === 'pending'
                        ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]'
                        : 'bg-rose-500 shadow-[0_0_6px_#ef4444]'
                    }`} />
                    <div>
                      <div className="font-semibold text-slate-200 text-[11px]">Cloud Gateway Sync</div>
                      <div className="text-[10px] text-slate-400">
                        {isOnline ? 'Online (Connected)' : 'Offline (No internet)'}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                    syncState === 'up-to-date'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : syncState === 'syncing'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                      : syncState === 'pending'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}>
                    {syncState === 'up-to-date' ? 'Up-to-Date' : syncState === 'syncing' ? 'Syncing...' : syncState === 'pending' ? 'Pending Items' : 'Offline'}
                  </span>
                </div>

                {/* Pending Items in Queue Counter */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 text-[11px]">
                  <span className="text-slate-300">Pending Sync Items:</span>
                  <span className={`font-black ${pendingCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {pendingCount} {pendingCount === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Manual Sync Trigger Button when items are pending */}
                {isOnline && pendingCount > 0 && (
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="w-full mt-2.5 py-1.5 px-3 bg-gradient-to-r from-[#f35500] to-[#d94b00] hover:from-[#e04e00] hover:to-[#c44300] text-white font-bold text-xs rounded-lg shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                    <span>{isSyncing ? 'Syncing Queue...' : 'Sync Now'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Footer Notes */}
            <div className="mt-3 pt-2.5 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Clock size={11} className="text-slate-500" /> Last sync: {lastSyncTime}
              </span>
              <span className="text-slate-500">Auto-sync on signal</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
