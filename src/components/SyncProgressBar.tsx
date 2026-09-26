import React from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Wifi } from 'lucide-react';
import { useSyncProgress } from '../hooks/useSyncProgress';

export interface SyncProgressBarProps {
  /**
   * Color theme variant: 'light' (office admin), 'dark' (tour leader navy header), or 'auto'
   */
  theme?: 'dark' | 'light' | 'auto';
  /**
   * Whether to include the compact inline text badge in addition to the linear progress bar
   */
  showBadge?: boolean;
  /**
   * Placement of the linear bar relative to the header: 'bottom' (default) or 'top'
   */
  position?: 'bottom' | 'top';
  /**
   * Additional custom CSS classes for the container
   */
  className?: string;
}

export default function SyncProgressBar({
  theme = 'auto',
  showBadge = true,
  position = 'bottom',
  className = '',
}: SyncProgressBarProps) {
  const { isVisible, progress, stage, message, current, total } = useSyncProgress();

  if (!isVisible && stage === 'idle') {
    return null;
  }

  const isDark = theme === 'dark';
  const isCompleted = stage === 'completed';
  const isError = stage === 'error';
  const isReconnecting = stage === 'reconnecting';

  // Format short display message for mobile viewports
  const getShortMessage = () => {
    if (isCompleted) return 'Synced ✓';
    if (isError) return 'Sync Error';
    if (isReconnecting) return 'Reconnecting...';
    if (total > 0) return `Syncing ${current}/${total} (${progress}%)`;
    return `Syncing ${progress}%`;
  };

  return (
    <>
      {/* 1. Global Non-Intrusive 3px Linear Progress Bar (Pinned to header edge) */}
      <div
        aria-hidden="true"
        className={`absolute ${position === 'top' ? 'top-0' : 'bottom-0'} left-0 right-0 h-[3px] pointer-events-none z-30 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        } ${
          isDark
            ? 'bg-blue-950/60'
            : 'bg-slate-200/60 dark:bg-slate-800/80'
        }`}
      >
        <div
          className={`h-full relative overflow-hidden transition-all duration-300 ease-out ${
            isCompleted
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
              : isError
              ? 'bg-gradient-to-r from-rose-500 to-amber-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
              : 'bg-gradient-to-r from-[#f35500] via-amber-400 to-emerald-400 shadow-[0_0_8px_rgba(243,85,0,0.7)]'
          }`}
          style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
        >
          {/* Shimmer traveling highlight while active */}
          {!isCompleted && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-sync-shimmer" />
          )}
        </div>
      </div>

      {/* 2. Non-Intrusive Header Micro-Badge */}
      {showBadge && (
        <div
          role="status"
          aria-live="polite"
          title={message || 'Background data synchronization'}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-300 shadow-2xs backdrop-blur-md select-none shrink-0 ${
            isVisible
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
          } ${
            isCompleted
              ? isDark
                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600/40'
              : isError
              ? isDark
                ? 'bg-rose-500/20 text-rose-200 border border-rose-400/40'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300 dark:border-rose-600/40'
              : isDark
              ? 'bg-white/15 text-blue-100 border border-white/20'
              : 'bg-amber-500/10 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-500/30'
          } ${className}`}
        >
          {/* Icon */}
          {isCompleted ? (
            <CheckCircle2 size={13} className="text-emerald-500 dark:text-emerald-400 shrink-0 animate-in zoom-in-50" />
          ) : isError ? (
            <AlertCircle size={13} className="text-rose-500 shrink-0" />
          ) : isReconnecting ? (
            <Wifi size={13} className="text-amber-500 dark:text-amber-400 animate-pulse shrink-0" />
          ) : (
            <RefreshCw size={12} className="text-[#f35500] dark:text-amber-400 animate-spin shrink-0" />
          )}

          {/* Long message for desktop / Short message for mobile */}
          <span className="hidden sm:inline truncate max-w-[240px]">
            {message || (isCompleted ? 'All data synchronized ✓' : `Syncing data... ${progress}%`)}
          </span>
          <span className="inline sm:hidden truncate max-w-[120px]">
            {getShortMessage()}
          </span>

          {/* Mini Percentage Pill if syncing */}
          {!isCompleted && !isError && progress > 0 && (
            <span
              className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                isDark
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-500/20 text-amber-800 dark:text-amber-200 dark:bg-amber-400/20'
              }`}
            >
              {progress}%
            </span>
          )}
        </div>
      )}
    </>
  );
}
