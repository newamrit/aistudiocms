import React, { useState } from 'react';
import { useAlerts } from '../contexts/AlertContext';
import { 
  WifiOff, Wifi, RefreshCw, AlertTriangle, CheckCircle2, 
  ChevronDown, ChevronUp, Database, ArrowUpRight, 
  X, Layers, Clock, ShieldAlert, Sparkles, ServerCrash, Check
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface OfflineWarningAlertProps {
  className?: string;
}

export default function OfflineWarningAlert({ className = '' }: OfflineWarningAlertProps) {
  const {
    isOnline,
    isApiConnected,
    connectionStatus,
    pendingSyncCount,
    lastSyncTime,
    syncing,
    simulateOffline,
    setSimulateOffline,
    retrySync,
    dismissOfflineAlert,
    isOfflineAlertDismissed,
    setIsOfflineAlertDismissed,
    reconnectSuccess,
    offlineQueueItems,
  } = useAlerts();

  const [showQueueDetails, setShowQueueDetails] = useState<boolean>(false);

  // Check if we should display the offline warning
  const isDisconnected = !isOnline || !isApiConnected || connectionStatus === 'offline' || connectionStatus === 'degraded' || connectionStatus === 'reconnecting';

  // Format the last sync time
  const formatSyncTime = (date: Date | null) => {
    if (!date) return 'Never';
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return date.toLocaleTimeString();
    }
  };

  return (
    <>
      {/* 1. Connection Restored Success Banner / Toast */}
      {reconnectSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-900/95 text-emerald-100 border border-emerald-500/40 rounded-xl shadow-2xl backdrop-blur-md">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
              <CheckCircle2 size={18} className="animate-bounce" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-200">Connection Restored</div>
              <div className="text-[11px] text-emerald-300/80">Backend API synchronized. All local cached changes sent.</div>
            </div>
            <div className="ml-2 pl-2 border-l border-emerald-700/50">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-800/60 px-2 py-0.5 rounded-full">
                <Check size={10} /> Live
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Offline Warning Alert Banner */}
      {isDisconnected && !isOfflineAlertDismissed && (
        <aside 
          aria-label="Offline Warning"
          className={`w-full bg-linear-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 dark:from-amber-950/40 dark:via-rose-950/30 dark:to-amber-950/40 border-b border-amber-300/60 dark:border-amber-500/30 backdrop-blur-md shadow-xs transition-all duration-300 relative z-30 ${className}`}
        >
          <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Alert Left: Status & Warning Message */}
              <div className="flex items-start sm:items-center gap-3">
                <div className="relative shrink-0 mt-0.5 sm:mt-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 dark:bg-amber-500/30 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    {connectionStatus === 'reconnecting' ? (
                      <RefreshCw size={18} className="animate-spin text-amber-500" />
                    ) : (
                      <WifiOff size={18} className="animate-pulse text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 inline" />
                      {simulateOffline
                        ? 'Simulated Offline Mode Active'
                        : connectionStatus === 'reconnecting'
                        ? 'Reconnecting to Backend API...'
                        : 'Backend API Disconnected — Offline Sync Active'}
                    </span>
                    
                    {/* Status badges */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">
                      <Database size={10} /> Local Cache Active
                    </span>

                    {pendingSyncCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-700/50 animate-pulse">
                        <Layers size={10} /> {pendingSyncCount} Change{pendingSyncCount > 1 ? 's' : ''} Queued
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 mt-0.5 font-medium leading-normal">
                    {simulateOffline 
                      ? 'Offline simulation is enabled for testing. All mutations will be buffered locally.'
                      : 'Changes and field updates are safely recorded to local storage and will sync automatically when connection returns.'}
                  </p>
                </div>
              </div>

              {/* Alert Right: Metadata & Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                {/* Last Synced indicator */}
                <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-medium text-amber-800/80 dark:text-amber-300/70 bg-amber-500/10 dark:bg-amber-900/40 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  <Clock size={12} className="text-amber-600 dark:text-amber-400" />
                  <span>Last synced: {formatSyncTime(lastSyncTime)}</span>
                </div>

                {/* View Queue Toggle Button */}
                {pendingSyncCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowQueueDetails(prev => !prev)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/30 transition-colors cursor-pointer"
                    title="View pending sync items"
                  >
                    <Layers size={13} />
                    <span>Queue ({pendingSyncCount})</span>
                    {showQueueDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}

                {/* Retry / Sync Now Button */}
                <button
                  type="button"
                  onClick={() => retrySync()}
                  disabled={syncing || simulateOffline}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-95 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  title={simulateOffline ? 'Disable simulation first to reconnect' : 'Check backend connection & sync immediately'}
                >
                  <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                  <span>{syncing ? 'Checking...' : 'Sync Now'}</span>
                </button>

                {/* Simulation Toggle for Easy Demo/Testing */}
                <button
                  type="button"
                  onClick={() => setSimulateOffline(prev => !prev)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                    simulateOffline
                      ? 'bg-rose-600 text-white hover:bg-rose-700'
                      : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                  title="Toggle Simulated Disconnection"
                >
                  {simulateOffline ? 'Exit Sim' : 'Sim Offline'}
                </button>

                {/* Minimize / Dismiss Banner Button */}
                <button
                  type="button"
                  onClick={dismissOfflineAlert}
                  className="p-1 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
                  title="Minimize offline warning"
                  aria-label="Dismiss banner"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Expandable Sync Queue Breakdown */}
            {showQueueDetails && pendingSyncCount > 0 && (
              <div className="mt-3 pt-3 border-t border-amber-300/40 dark:border-amber-700/40 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Database size={13} className="text-amber-600" />
                    Pending Offline Changes ({pendingSyncCount})
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400">Will automatically execute on reconnect</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                  {offlineQueueItems.map((item, idx) => (
                    <div 
                      key={item.id || idx}
                      className="p-2 rounded-lg bg-amber-50/80 dark:bg-slate-900/60 border border-amber-200/80 dark:border-amber-800/40 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate">
                          {item.endpoint || 'Sync Action'}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                          {item.method || 'POST'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                        <span>Retries: {item.retryCount || 0}</span>
                        <span>{item.timestamp ? formatDistanceToNow(item.timestamp, { addSuffix: true }) : 'Queued'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* 3. Minimized Floating Pill (When main alert is dismissed) */}
      {isDisconnected && isOfflineAlertDismissed && (
        <button
          type="button"
          onClick={() => setIsOfflineAlertDismissed(false)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-3.5 py-2 bg-amber-500 dark:bg-amber-600 text-white rounded-full shadow-xl hover:bg-amber-600 dark:hover:bg-amber-500 transition-all transform hover:scale-105 cursor-pointer animate-in fade-in slide-in-from-bottom-2"
          title="Click to view offline warning & sync details"
        >
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
            <WifiOff size={14} />
          </div>
          <span className="text-xs font-bold">
            Offline Mode {pendingSyncCount > 0 ? `(${pendingSyncCount} Queued)` : ''}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        </button>
      )}
    </>
  );
}
