import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Database, 
  Download, 
  Search, 
  Trash2, 
  Activity, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Zap, 
  Server, 
  FileSpreadsheet, 
  FileCode, 
  Info, 
  HelpCircle,
  X,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Signal
} from 'lucide-react';
import { 
  SyncAttemptLog, 
  getSyncLogs, 
  clearSyncLogs, 
  subscribeToSyncLogs, 
  testConnectivityPing, 
  exportSyncLogsToCSV, 
  exportSyncLogsToJSON 
} from '../utils/offlineSyncLog';
import { SyncQueue, SyncManager, Connectivity } from '../utils/offlineDB';
import { sounds } from '../utils/sounds';

export interface OfflineSyncLogProps {
  isOpen?: boolean;
  onClose?: () => void;
  embedded?: boolean;
  className?: string;
}

type StatusFilter = 'ALL' | 'SUCCESS' | 'FAILED' | 'PING';
type TimeFilter = 'ALL' | 'TODAY' | 'LAST_24H';

export default function OfflineSyncLog({
  isOpen = true,
  onClose,
  embedded = false,
  className = ''
}: OfflineSyncLogProps) {
  const [logs, setLogs] = useState<SyncAttemptLog[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(Connectivity.isOnline());

  // Show Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load logs and subscribe to updates
  useEffect(() => {
    setLogs(getSyncLogs());
    const unsubscribe = subscribeToSyncLogs((updatedLogs) => {
      setLogs(updatedLogs);
    });

    const updateQueueStats = async () => {
      try {
        const stats = await SyncQueue.getStats();
        setPendingQueueCount(stats.total);
      } catch {
        // ignore
      }
    };

    updateQueueStats();
    const interval = setInterval(updateQueueStats, 6000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const todayStart = new Date().setHours(0, 0, 0, 0);

    return logs.filter(log => {
      // Status filter
      if (statusFilter === 'SUCCESS' && log.status !== 'SUCCESS') return false;
      if (statusFilter === 'FAILED' && log.status !== 'FAILED') return false;
      if (statusFilter === 'PING' && log.type !== 'HEALTH_PING') return false;

      // Time filter
      if (timeFilter === 'TODAY' && log.timestamp < todayStart) return false;
      if (timeFilter === 'LAST_24H' && log.timestamp < (now - oneDay)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const corpus = [
          log.actionName,
          log.endpoint,
          log.method,
          log.error,
          log.troubleshootingTip,
          log.requestPayloadSummary,
          String(log.statusCode || '')
        ].filter(Boolean).join(' ').toLowerCase();

        if (!corpus.includes(q)) return false;
      }

      return true;
    });
  }, [logs, statusFilter, timeFilter, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = logs.length;
    const successes = logs.filter(l => l.status === 'SUCCESS').length;
    const failures = logs.filter(l => l.status === 'FAILED').length;
    const pings = logs.filter(l => l.type === 'HEALTH_PING').length;
    const successRate = (total > 0 && Number.isFinite(successes)) ? Math.round((successes / total) * 100) : 100;

    const durations = logs
      .filter(l => typeof l.durationMs === 'number' && Number.isFinite(l.durationMs) && l.durationMs > 0)
      .map(l => l.durationMs);
    const avgLatency = durations.length > 0 
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) 
      : 0;

    return {
      total: Number.isFinite(total) ? total : 0,
      successes: Number.isFinite(successes) ? successes : 0,
      failures: Number.isFinite(failures) ? failures : 0,
      pings: Number.isFinite(pings) ? pings : 0,
      successRate: Number.isFinite(successRate) ? successRate : 100,
      avgLatency: Number.isFinite(avgLatency) ? avgLatency : 0,
    };
  }, [logs]);

  // Actions
  const handleTestPing = async () => {
    sounds.click();
    setIsPinging(true);
    try {
      const result = await testConnectivityPing();
      if (result.status === 'SUCCESS') {
        sounds.success();
        showToast(`Gateway ping successful! Latency: ${result.durationMs}ms`);
      } else {
        sounds.warning();
        showToast(`Gateway ping failed: ${result.error || 'Server unreachable'}`);
      }
    } catch (err: any) {
      sounds.warning();
      showToast('Diagnostics ping error');
    } finally {
      setIsPinging(false);
    }
  };

  const handleForceSyncQueue = async () => {
    sounds.click();
    setIsSyncingQueue(true);
    try {
      const res = await SyncManager.processQueue();
      const stats = await SyncQueue.getStats();
      setPendingQueueCount(stats.total);
      if (res.failed === 0) {
        sounds.success();
        showToast(`Sync completed: ${res.success} items committed.`);
      } else {
        sounds.warning();
        showToast(`Sync finished: ${res.success} succeeded, ${res.failed} failed.`);
      }
    } catch (err) {
      sounds.warning();
      showToast('Queue sync failed. See log for details.');
    } finally {
      setIsSyncingQueue(false);
    }
  };

  const handleClearLogs = () => {
    if (window.confirm('Clear all offline sync attempt history? This will reset the diagnostic log.')) {
      sounds.click();
      clearSyncLogs();
      showToast('Offline sync logs cleared.');
    }
  };

  const handleCopyLog = (log: SyncAttemptLog, e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.click();
    const report = `[Sync Log Diagnostic Report]
Timestamp: ${log.formattedTime}
Action: ${log.actionName} (${log.method || 'GET'} ${log.endpoint || ''})
Status: ${log.status} (HTTP ${log.statusCode || 0})
Duration: ${log.durationMs}ms
Error: ${log.error || 'None'}
Troubleshooting Guidance: ${log.troubleshootingTip || 'None'}
Network State: Online=${log.networkState.online}, RTT=${log.networkState.rtt || 'N/A'}ms, Type=${log.networkState.effectiveType || 'N/A'}`;

    navigator.clipboard.writeText(report);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2500);
    showToast('Diagnostic summary copied to clipboard');
  };

  // If used as modal and not open, don't render
  if (!embedded && !isOpen) return null;

  const content = (
    <div className={`space-y-5 text-slate-800 dark:text-slate-100 ${className}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl shadow-2xl border border-slate-700/80 text-xs font-semibold backdrop-blur-md">
            <Info size={15} className="text-blue-400 dark:text-blue-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Activity size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Offline Sync Log
                </h3>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isOnline 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {isOnline ? 'Online Gateway' : 'Offline Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Audit history of background sync attempts, connectivity diagnostics & Himalayan teahouse recovery
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Diagnostics Ping */}
          <button
            type="button"
            onClick={handleTestPing}
            disabled={isPinging}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
            title="Ping backend API to measure live gateway response time"
          >
            <Zap size={14} className={isPinging ? 'animate-bounce text-amber-500' : 'text-blue-600 dark:text-blue-400'} />
            <span>{isPinging ? 'Pinging...' : 'Test Connectivity'}</span>
          </button>

          {/* Force Sync Queue */}
          <button
            type="button"
            onClick={handleForceSyncQueue}
            disabled={isSyncingQueue || !isOnline}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#f35500] to-[#d94b00] hover:from-[#e04e00] hover:to-[#c44300] text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
            title={!isOnline ? 'Connect to internet to sync queue' : 'Process all buffered mutations in local queue'}
          >
            <RefreshCw size={14} className={isSyncingQueue ? 'animate-spin' : ''} />
            <span>{isSyncingQueue ? 'Syncing...' : pendingQueueCount > 0 ? `Sync Queue (${pendingQueueCount})` : 'Force Sync'}</span>
          </button>

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => { sounds.click(); exportSyncLogsToCSV(filteredLogs); showToast('Exported sync log to CSV'); }}
              className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
              title="Download filtered log as CSV"
            >
              <FileSpreadsheet size={15} />
            </button>
            <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700" />
            <button
              type="button"
              onClick={() => { sounds.click(); exportSyncLogsToJSON(filteredLogs); showToast('Exported sync log to JSON'); }}
              className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
              title="Download raw log JSON"
            >
              <FileCode size={15} />
            </button>
          </div>

          {/* Clear Logs */}
          {logs.length > 0 && (
            <button
              type="button"
              onClick={handleClearLogs}
              className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
              title="Clear all log history"
            >
              <Trash2 size={15} />
            </button>
          )}

          {/* Close Modal Button (if modal mode) */}
          {!embedded && onClose && (
            <button
              type="button"
              onClick={() => { sounds.click(); onClose(); }}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors ml-1"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* KPI Diagnostic Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Sync Attempts */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Total Attempts</span>
            <Database size={13} className="text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.total}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Recorded events</div>
        </div>

        {/* Success Rate */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
            <span>Success Rate</span>
            <CheckCircle2 size={13} className="text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mt-1 flex items-baseline gap-1">
            {metrics.successRate}%
            <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">({metrics.successes} ok)</span>
          </div>
          <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Health score</div>
        </div>

        {/* Failed Attempts */}
        <div 
          onClick={() => { sounds.click(); setStatusFilter(prev => prev === 'FAILED' ? 'ALL' : 'FAILED'); }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            metrics.failures > 0 
              ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 hover:border-rose-400' 
              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
          }`}
          title="Click to toggle filter for failed attempts"
        >
          <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 flex items-center justify-between">
            <span>Failed Attempts</span>
            <XCircle size={13} className={metrics.failures > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'} />
          </div>
          <div className="text-xl font-bold text-rose-800 dark:text-rose-200 mt-1">
            {metrics.failures}
          </div>
          <div className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
            {metrics.failures > 0 ? 'Click to inspect errors' : 'Clean sync record'}
          </div>
        </div>

        {/* Average Latency */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Avg Response</span>
            <Clock size={13} className="text-blue-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.avgLatency} <span className="text-xs font-normal text-slate-500">ms</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Round-trip latency</div>
        </div>

        {/* Local Storage Pending Queue */}
        <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 shadow-2xs">
          <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center justify-between">
            <span>Pending Queue</span>
            <Layers size={13} className="text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-800 dark:text-amber-200 mt-1">
            {pendingQueueCount} <span className="text-xs font-normal text-amber-600">items</span>
          </div>
          <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">Awaiting transmission</div>
        </div>

        {/* Gateway Telemetry */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Connection</span>
            <Signal size={13} className={isOnline ? 'text-emerald-500' : 'text-rose-500'} />
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
            {isOnline ? 'Himalayan Live' : 'Disconnected'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Auto-retry active</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => { sounds.click(); setStatusFilter('ALL'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Logs ({metrics.total})
          </button>
          <button
            type="button"
            onClick={() => { sounds.click(); setStatusFilter('SUCCESS'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'SUCCESS'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 size={12} />
            <span>Success ({metrics.successes})</span>
          </button>
          <button
            type="button"
            onClick={() => { sounds.click(); setStatusFilter('FAILED'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'FAILED'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <XCircle size={12} />
            <span>Failed ({metrics.failures})</span>
          </button>
          <button
            type="button"
            onClick={() => { sounds.click(); setStatusFilter('PING'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'PING'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap size={12} />
            <span>Diagnostics ({metrics.pings})</span>
          </button>
        </div>

        {/* Search & Time Range */}
        <div className="flex items-center gap-2 flex-1 md:max-w-xs">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search action, error, URL..."
              className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today Only</option>
            <option value="LAST_24H">Last 24h</option>
          </select>
        </div>
      </div>

      {/* Log Feed & Audit Ledger */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Activity size={24} />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No sync attempts match filters</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try resetting the search terms or status filter to see all events.'
                : 'No sync events recorded yet. Click "Test Connectivity" to perform an on-demand gateway ping.'}
            </p>
            <button
              type="button"
              onClick={handleTestPing}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Run Connectivity Ping
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const isSuccess = log.status === 'SUCCESS';
              const isFailed = log.status === 'FAILED';

              return (
                <div 
                  key={log.id} 
                  className={`transition-colors ${
                    isFailed ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''
                  }`}
                >
                  {/* Summary Row */}
                  <div
                    onClick={() => {
                      sounds.click();
                      setExpandedLogId(isExpanded ? null : log.id);
                    }}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer select-none"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      {/* Status Icon */}
                      <div className="mt-0.5 sm:mt-0 shrink-0">
                        {isSuccess ? (
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/80 shadow-2xs">
                            <CheckCircle2 size={16} />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-800/80 shadow-2xs animate-pulse">
                            <XCircle size={16} />
                          </div>
                        )}
                      </div>

                      {/* Action Title & Meta */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {log.actionName}
                          </span>
                          
                          {/* Sync Type Badge */}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            log.type === 'HEALTH_PING' 
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              : log.type === 'RECONNECT_AUTO'
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                              : log.type === 'MANUAL_TRIGGER'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}>
                            {log.type.replace(/_/g, ' ')}
                          </span>

                          {/* HTTP Status Code Pill */}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            isSuccess 
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300' 
                              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                          }`}>
                            {log.statusCode ? `HTTP ${log.statusCode}` : 'NETWORK_ERR'}
                          </span>
                        </div>

                        {/* Subline: Endpoint, Time, Latency */}
                        <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {log.endpoint && (
                            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                              {log.method || 'POST'} {log.endpoint}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock size={11} className="text-slate-400" />
                            {log.formattedTime}
                          </span>
                          <span className={`font-medium ${
                            log.durationMs < 250 ? 'text-emerald-600 dark:text-emerald-400' :
                            log.durationMs < 1000 ? 'text-amber-600 dark:text-amber-400' :
                            'text-rose-600 dark:text-rose-400'
                          }`}>
                            {log.durationMs}ms
                          </span>
                        </div>

                        {/* Error preview if failed */}
                        {isFailed && log.error && (
                          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1 truncate">
                            Error: {log.error}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Action: Expand indicator & Copy */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleCopyLog(log, e)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Copy diagnostic summary"
                      >
                        {copiedId === log.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>

                      <div className="text-slate-400 p-1">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Troubleshooting Details Drawer */}
                  {isExpanded && (
                    <div className="px-4 pb-5 pt-1 bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in duration-200 text-xs">
                      {/* 1. Actionable Troubleshooting Guidance Box */}
                      <div className={`p-3.5 rounded-xl border mb-3.5 ${
                        isFailed 
                          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200' 
                          : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                      }`}>
                        <div className="flex items-center gap-2 font-bold mb-1">
                          {isFailed ? <AlertTriangle size={14} className="text-rose-600" /> : <ShieldCheck size={14} className="text-emerald-600" />}
                          <span>Operator Diagnostic Guidance:</span>
                        </div>
                        <p className="leading-relaxed text-[11.5px] opacity-95">
                          {log.troubleshootingTip}
                        </p>
                      </div>

                      {/* 2. Telemetry and Technical Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3.5">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Connection State</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs mt-0.5 block">
                            {log.networkState.online ? 'Online (Device Connected)' : 'Offline (Network Disconnected)'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Network Quality</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs mt-0.5 block">
                            {log.networkState.effectiveType?.toUpperCase() || 'Standard'} • RTT: {log.networkState.rtt || '—'}ms
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Retry Attempt</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs mt-0.5 block">
                            {log.retryAttempt !== undefined ? `Attempt #${log.retryAttempt + 1}` : 'Initial Execution'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Transmission Size</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs mt-0.5 block">
                            {log.itemsProcessed} record{log.itemsProcessed === 1 ? '' : 's'} ({log.itemsSucceeded} ok / {log.itemsFailed} err)
                          </span>
                        </div>
                      </div>

                      {/* 3. Request Payload & Response Data */}
                      {log.requestPayloadSummary && (
                        <div className="mb-3">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Payload Summary:
                          </span>
                          <pre className="p-2.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto border border-slate-800">
                            {log.requestPayloadSummary}
                          </pre>
                        </div>
                      )}

                      {log.error && (
                        <div className="mb-2">
                          <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 block mb-1">
                            Raw Error Message:
                          </span>
                          <div className="p-2.5 rounded-xl bg-rose-950/20 text-rose-300 border border-rose-900/40 font-mono text-[11px]">
                            {log.error}
                          </div>
                        </div>
                      )}

                      {/* Retry Action Button for Failed Record */}
                      {isFailed && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">
                            Record remains buffered in IndexedDB and will auto-sync on signal recovery.
                          </span>
                          <button
                            type="button"
                            onClick={handleForceSyncQueue}
                            disabled={!isOnline || isSyncingQueue}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                          >
                            <RefreshCw size={12} className={isSyncingQueue ? 'animate-spin' : ''} />
                            <span>Retry Queue Sync Now</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Operator Troubleshooting Knowledge Base Callout */}
      <div className="p-4 rounded-2xl bg-linear-to-r from-blue-900/10 via-indigo-900/10 to-blue-900/10 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 text-xs">
        <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200 mb-1.5">
          <HelpCircle size={15} className="text-blue-600 dark:text-blue-400" />
          <span>Himalayan Field Operations Troubleshooting Guide</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
          <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-800">
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">1. Zero Data Loss Protocol</span>
            All check-ins, spot expenses, and status updates are saved immediately to local IndexedDB storage before any network request is attempted.
          </div>
          <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-800">
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">2. High Pass Connectivity Drop</span>
            Between Lukla, Namche, and ABC/EBC passes, cellular connections often drop. The PWA queue retries in the background automatically as soon as an Everest Link or NTC signal handshake is detected.
          </div>
          <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-800">
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">3. Verification & Pings</span>
            Operators can click "Test Connectivity" at any time to verify teahouse Wi-Fi status without transmitting pending accounting changes.
          </div>
        </div>
      </div>
    </div>
  );

  // If embedded in a page/tab, render directly
  if (embedded) {
    return content;
  }

  // Modal mode
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white dark:bg-[#111c30] border border-slate-200 dark:border-[#22324b] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {content}
        </div>
      </div>
    </div>
  );
}
