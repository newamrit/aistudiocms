import React, { useState, useRef } from 'react';
import { useBackup, DEFAULT_MODULE_SELECTION } from '../contexts/BackupContext';
import { useCompanySettings } from '../contexts/CompanySettingsContext';
import { useBookings } from '../contexts/BookingContext';
import { useAuth } from '../contexts/AuthContext';
import { BackupSnapshot, SystemBackupData, BackupModuleSelection } from '../types';
import { 
  HardDrive, Download, Upload, Calendar, Clock, RotateCcw, 
  CheckCircle2, AlertTriangle, Trash2, FileDown, FileUp, Layers, 
  ShieldCheck, Sparkles, RefreshCw, Database, AlertCircle, 
  X, Check, Info, FileText, ArrowRight, ShieldAlert, Play
} from 'lucide-react';
import { sounds } from '../utils/sounds';

export default function BackupRestorePanel() {
  const {
    snapshots,
    dailyConfig,
    updateDailyConfig,
    createSnapshot,
    downloadBackupFile,
    downloadSqlBackupFile,
    restoreFromSnapshot,
    restoreFromBackupData,
    deleteSnapshot,
    clearAllSnapshots,
    validateBackupFile,
    validateSqlBackupFile,
    isBackingUp,
    isRestoring,
  } = useBackup();

  const { settings } = useCompanySettings();
  const { bookings } = useBookings();
  const { usersList } = useAuth();

  // Local state for manual backup form & dialect
  const [manualLabel, setManualLabel] = useState('');
  const [sqlDialect, setSqlDialect] = useState<'postgres' | 'standard'>('postgres');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Restore Modal State
  const [inspectingBackup, setInspectingBackup] = useState<{
    source: 'SNAPSHOT' | 'FILE';
    format?: 'JSON' | 'SQL';
    rawSql?: string;
    snapshotId?: string;
    data: SystemBackupData;
  } | null>(null);

  const [showSqlSnippet, setShowSqlSnippet] = useState(false);
  const [moduleSelection, setModuleSelection] = useState<BackupModuleSelection>(DEFAULT_MODULE_SELECTION);
  const [confirmText, setConfirmText] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const showNotification = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedbackMessage({ type, text });
    if (type === 'success') sounds.success();
    if (type === 'error') sounds.error();
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  // Handle Manual Snapshot creation
  const handleCreateManualBackup = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const snap = createSnapshot('MANUAL', manualLabel.trim() || undefined);
      setManualLabel('');
      showNotification('success', `Snapshot "${snap.label}" created successfully! (${(snap.sizeBytes / 1024).toFixed(1)} KB)`);
    } catch (err: any) {
      showNotification('error', `Failed to create snapshot: ${err.message || 'Error'}`);
    }
  };

  // Trigger Immediate Daily Backup
  const handleTriggerDailyNow = () => {
    try {
      const snap = createSnapshot('DAILY_AUTO');
      updateDailyConfig({
        lastAutoBackupDate: new Date().toISOString().split('T')[0],
        lastAutoBackupTimestamp: new Date().toISOString(),
      });
      showNotification('success', `Daily automated backup completed! (${(snap.sizeBytes / 1024).toFixed(1)} KB)`);
    } catch (err: any) {
      showNotification('error', `Daily backup failed: ${err.message || 'Error'}`);
    }
  };

  // Handle File Input Selection (.json OR .sql)
  const handleFileSelected = (file: File) => {
    const isSql = file.name.toLowerCase().endsWith('.sql');
    const isJson = file.name.toLowerCase().endsWith('.json');

    if (!isSql && !isJson) {
      showNotification('error', 'Please upload a valid JSON backup (*.json) or SQL database dump (*.sql).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;

      if (isSql) {
        const result = validateSqlBackupFile(content);
        if (!result.valid || !result.data) {
          showNotification('error', result.error || 'Invalid SQL backup dump file.');
          return;
        }

        // Open inspection modal for SQL
        setInspectingBackup({
          source: 'FILE',
          format: 'SQL',
          rawSql: content.slice(0, 2000),
          data: result.data,
        });
      } else {
        const result = validateBackupFile(content);
        if (!result.valid || !result.data) {
          showNotification('error', result.error || 'Invalid JSON backup file structure.');
          return;
        }

        // Open inspection modal for JSON
        setInspectingBackup({
          source: 'FILE',
          format: 'JSON',
          data: result.data,
        });
      }

      setModuleSelection(DEFAULT_MODULE_SELECTION);
      setConfirmText('');
      setShowSqlSnippet(false);
    };
    reader.onerror = () => {
      showNotification('error', 'Failed to read file from disk.');
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  // Open Restore Modal for Snapshot
  const handleOpenRestoreSnapshot = (snap: BackupSnapshot) => {
    setInspectingBackup({
      source: 'SNAPSHOT',
      snapshotId: snap.id,
      data: snap.backup,
    });
    setModuleSelection(DEFAULT_MODULE_SELECTION);
    setConfirmText('');
  };

  // Execute Restore
  const handleExecuteRestore = async () => {
    if (!inspectingBackup) return;

    try {
      let result;
      if (inspectingBackup.source === 'SNAPSHOT' && inspectingBackup.snapshotId) {
        result = await restoreFromSnapshot(inspectingBackup.snapshotId, moduleSelection);
      } else {
        result = await restoreFromBackupData(inspectingBackup.data, moduleSelection);
      }

      if (result.success) {
        showNotification('success', result.message);
        setInspectingBackup(null);
      } else {
        showNotification('error', result.message);
      }
    } catch (err: any) {
      showNotification('error', `Restore error: ${err.message || 'Unknown'}`);
    }
  };

  // Format bytes to KB / MB
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getSnapshotBadge = (type: BackupSnapshot['type']) => {
    switch (type) {
      case 'DAILY_AUTO':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
            <Clock size={10} /> Daily Auto
          </span>
        );
      case 'PRE_RESTORE':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
            <ShieldCheck size={10} /> Safety Point
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
            <Sparkles size={10} /> Manual
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {feedbackMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between animate-slide-in ${
          feedbackMessage.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' 
            : feedbackMessage.type === 'error'
            ? 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            : 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
        }`}>
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : feedbackMessage.type === 'error' ? (
              <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0" />
            ) : (
              <Info size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button 
            onClick={() => setFeedbackMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 p-1 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Overview Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Protection Status */}
        <div className="bg-white dark:bg-[#111c30] border border-slate-200 dark:border-[#22324b] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              System Protection
            </span>
            <div className={`w-2.5 h-2.5 rounded-full ${dailyConfig.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {dailyConfig.enabled ? 'Active & Monitored' : 'Manual Only'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {dailyConfig.enabled 
              ? `Daily snapshot auto-runs at ${dailyConfig.scheduledTime}` 
              : 'Automated daily backup is currently paused'}
          </p>
        </div>

        {/* Card 2: Last Auto Backup */}
        <div className="bg-white dark:bg-[#111c30] border border-slate-200 dark:border-[#22324b] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Last Backup
            </span>
            <Calendar size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white truncate">
            {dailyConfig.lastAutoBackupTimestamp 
              ? new Date(dailyConfig.lastAutoBackupTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : 'Today Pending'}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {dailyConfig.lastAutoBackupTimestamp 
              ? `${new Date(dailyConfig.lastAutoBackupTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • System verified`
              : 'Will trigger on scheduled cycle'}
          </p>
        </div>

        {/* Card 3: Saved Snapshots */}
        <div className="bg-white dark:bg-[#111c30] border border-slate-200 dark:border-[#22324b] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Restore Points
            </span>
            <HardDrive size={16} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {snapshots.length} <span className="text-xs font-semibold text-slate-500">snapshots</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Retention: Keep last {dailyConfig.retentionDays} days
          </p>
        </div>

        {/* Card 4: Database Payload Scope */}
        <div className="bg-white dark:bg-[#111c30] border border-slate-200 dark:border-[#22324b] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              System Payload
            </span>
            <Database size={16} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {bookings.length} <span className="text-xs font-semibold text-slate-500">Bookings</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {usersList.length} Users · PAN {settings.panNumber} · Tax ID
          </p>
        </div>
      </div>

      {/* Main Grid: Left = Daily Scheduler & Manual Backup | Right = Restore & Export */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Daily Scheduler & Manual Snapshot */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Daily Automated Backup Management */}
          <div className="bg-white dark:bg-[#111c30] border border-slate-200 dark:border-[#22324b] rounded-2xl p-6 shadow-2xs">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800">
                  <Clock size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Daily Automated Backup Schedule
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Automatically snapshot the entire database, bookings, users, and tax credentials daily.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerDailyNow}
                  disabled={isBackingUp}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  title="Run today's automated backup immediately"
                >
                  <Play size={12} className="fill-current" />
                  Run Today's Backup Now
                </button>
              </div>
            </div>

            {/* Scheduler Controls */}
            <div className="space-y-4">
              {/* Toggle switch */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Enable Automated Daily System Backup</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Runs every 24 hours to preserve operational changes and disaster recovery snapshots.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dailyConfig.enabled}
                    onChange={(e) => {
                      updateDailyConfig({ enabled: e.target.checked });
                      sounds.click();
                      showNotification('info', e.target.checked ? 'Daily backup schedule enabled' : 'Daily backup schedule disabled');
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Time & Retention Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Preferred Daily Run Time
                  </label>
                  <select
                    value={dailyConfig.scheduledTime}
                    disabled={!dailyConfig.enabled}
                    onChange={(e) => updateDailyConfig({ scheduledTime: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    <option value="00:00">00:00 AM (Midnight)</option>
                    <option value="01:00">01:00 AM</option>
                    <option value="02:00">02:00 AM (Recommended)</option>
                    <option value="04:00">04:00 AM (Pre-Shift)</option>
                    <option value="06:00">06:00 AM</option>
                    <option value="12:00">12:00 PM (Midday)</option>
                    <option value="23:00">23:00 PM (End of Day)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Recommended during low-traffic off hours.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Snapshot Retention Policy
                  </label>
                  <select
                    value={dailyConfig.retentionDays}
                    disabled={!dailyConfig.enabled}
                    onChange={(e) => updateDailyConfig({ retentionDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    <option value={7}>Keep last 7 Days</option>
                    <option value={14}>Keep last 14 Days (Standard)</option>
                    <option value={30}>Keep last 30 Days (Recommended)</option>
                    <option value={60}>Keep last 60 Days</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Older daily snapshots auto-pruned to preserve storage.</p>
                </div>
              </div>

              {/* Auto Download Checkbox & Format */}
              <div className="pt-1 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dailyConfig.autoDownloadAfterBackup}
                    onChange={(e) => updateDailyConfig({ autoDownloadAfterBackup: e.target.checked })}
                    className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Auto-download file to local computer when daily backup executes
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Triggers a direct browser file download of the backup bundle for offline disaster recovery.
                    </p>
                  </div>
                </label>

                {dailyConfig.autoDownloadAfterBackup && (
                  <div className="pl-6 flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Daily Export Format:
                    </span>
                    <select
                      value={dailyConfig.downloadFormat || 'JSON'}
                      onChange={(e) => updateDailyConfig({ downloadFormat: e.target.value as 'JSON' | 'SQL' | 'BOTH' })}
                      className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <option value="JSON">JSON File (.json)</option>
                      <option value="SQL">SQL Database Dump (.sql)</option>
                      <option value="BOTH">Both Files (.json & .sql)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Manual Snapshot & Instant Export */}
          <div className="bg-white dark:bg-[#111c30] border border-slate-200 dark:border-[#22324b] rounded-2xl p-6 shadow-2xs">
            <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                <Layers size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Manual Snapshot & Instant Export (JSON & SQL)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Take an on-demand snapshot before making bulk edits or export an offline JSON or SQL dump.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateManualBackup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Snapshot Label (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualLabel}
                    onChange={(e) => setManualLabel(e.target.value)}
                    placeholder="e.g., Pre-Autumn Trek Season, Before Accounting Reconcile"
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={isBackingUp}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles size={14} />
                    {isBackingUp ? 'Creating...' : 'Create Snapshot'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Saved immediately in local restore points with full rollback capability.
                </p>
              </div>

              {/* Direct Download Options: JSON & SQL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* JSON Export Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                      <FileDown size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>JSON Backup Archive</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Structured object bundle of Bookings, Vendors, Tax profile & Settings.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadBackupFile()}
                    className="w-full py-2 bg-paila-blue hover:bg-paila-blue-light text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download size={13} />
                    Download .JSON File
                  </button>
                </div>

                {/* SQL Dump Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                        <Database size={15} className="text-amber-500 shrink-0" />
                        <span>SQL Database Dump</span>
                      </div>
                      <select
                        value={sqlDialect}
                        onChange={(e) => setSqlDialect(e.target.value as 'postgres' | 'standard')}
                        className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-[10px] font-semibold text-slate-700 dark:text-slate-300"
                        title="Select SQL dialect"
                      >
                        <option value="postgres">PostgreSQL</option>
                        <option value="standard">Standard ANSI</option>
                      </select>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Production DDL & DML script with CREATE TABLE & INSERT statements for DBA import.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadSqlBackupFile(undefined, sqlDialect)}
                    className="w-full py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download size={13} />
                    Download .SQL Dump
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Included Modules Checklist Indicator */}
          <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2">
              All Backups Automatically Include Full System Coverage:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-medium text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Check size={13} /> Company & PAN/VAT
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Check size={13} /> Bookings & Guests
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Check size={13} /> Staff & Auth Roles
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Check size={13} /> Vendors & Fleet
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Check size={13} /> Trekking Packages
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Check size={13} /> Payments & Costs
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Check size={13} /> System Audit Trail
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Check size={13} /> Operational Alerts
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): File Upload & Restore + Safety Notice */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Upload Backup File Card */}
          <div className="bg-white dark:bg-[#111c30] border border-slate-200 dark:border-[#22324b] rounded-2xl p-6 shadow-2xs">
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
                <Upload size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Restore from Backup File (JSON or SQL)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload an existing .JSON backup file or .SQL database dump to restore system state.
                </p>
              </div>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                dragActive 
                  ? 'border-paila-blue bg-blue-50/70 dark:bg-blue-950/40 scale-[1.01]' 
                  : 'border-slate-300 dark:border-slate-700 hover:border-paila-blue dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.sql,application/json,application/sql,text/plain"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelected(e.target.files[0]);
                    e.target.value = ''; // reset
                  }
                }}
              />
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center mx-auto mb-3">
                <FileUp size={22} />
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Click to browse or drag & drop backup file
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Supports verified <span className="font-semibold text-blue-600 dark:text-blue-400">.JSON</span> backups & <span className="font-semibold text-amber-600 dark:text-amber-400">.SQL</span> database dumps
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                <span>Select .json or .sql file from computer</span>
              </div>
            </div>

            {/* Zero Risk Guarantee */}
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                <strong className="font-bold">Zero Data-Loss Safety Lock:</strong> Before restoring any backup, the system automatically takes a pre-restore safety snapshot so you can roll back instantly with one click.
              </div>
            </div>
          </div>

          {/* Quick Disaster Recovery Advice */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-paila-orange" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Disaster Recovery Protocol
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              In the event of device change, accidental browser cache clearing, or accounting rollbacks:
            </p>
            <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc pl-4">
              <li>Keep at least one weekly .JSON backup file saved on your company Google Drive or external storage.</li>
              <li>Always check the selective modules modal to restore only specific datasets (e.g. only bookings or only tax profile).</li>
              <li>After restoring, refresh the browser window to verify all booking balances and invoices.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 3: Snapshot Restore Points History Table */}
      <div className="bg-white dark:bg-[#111c30] border border-slate-200 dark:border-[#22324b] rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Saved System Snapshots & Restore Points
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {snapshots.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select any point in time to inspect, download as JSON, or restore the live database.
            </p>
          </div>

          {snapshots.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all cursor-pointer"
              >
                Clear History
              </button>
            </div>
          )}
        </div>

        {snapshots.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <HardDrive size={36} className="mx-auto mb-2 opacity-40 text-slate-500" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No snapshots recorded yet</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              Automated daily backups will appear here, or you can click "Create Snapshot" above to save your first recovery point.
            </p>
            <button
              onClick={() => handleCreateManualBackup()}
              className="mt-4 px-4 py-2 bg-paila-blue text-white rounded-xl text-xs font-bold hover:bg-paila-blue-light transition-all cursor-pointer"
            >
              Create First System Snapshot Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 font-bold">Snapshot Label</th>
                  <th className="py-3 px-3 font-bold">Type</th>
                  <th className="py-3 px-3 font-bold">Date & Time</th>
                  <th className="py-3 px-3 font-bold">Payload Contents</th>
                  <th className="py-3 px-3 font-bold">File Size</th>
                  <th className="py-3 px-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {snapshots.map((snap) => {
                  const dateObj = new Date(snap.timestamp);
                  return (
                    <tr key={snap.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                        {snap.label}
                      </td>
                      <td className="py-3 px-3">
                        {getSnapshotBadge(snap.type)}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <div>{dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div className="text-[10px] text-slate-400">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {snap.metrics.bookingsCount} Bookings
                        </span>
                        <span className="mx-1 text-slate-300">·</span>
                        <span>{snap.metrics.usersCount} Users</span>
                        <span className="mx-1 text-slate-300">·</span>
                        <span>{snap.metrics.vendorsCount} Vendors</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatBytes(snap.sizeBytes)}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenRestoreSnapshot(snap)}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="Inspect & Restore system from this snapshot"
                          >
                            <RotateCcw size={12} />
                            Restore
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadSqlBackupFile(snap, sqlDialect)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="Download snapshot as SQL database dump (.sql)"
                          >
                            <Database size={11} className="text-amber-500" />
                            SQL
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadBackupFile(snap)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="Download snapshot as JSON file (.json)"
                          >
                            <Download size={11} className="text-blue-500" />
                            JSON
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete snapshot "${snap.label}"?`)) {
                                deleteSnapshot(snap.id);
                                sounds.click();
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                            title="Delete snapshot"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspection & Selective Restore Modal */}
      {inspectingBackup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#111c30] border border-slate-200 dark:border-[#22324b] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Confirm System Restore
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Source: {inspectingBackup.source === 'SNAPSHOT' 
                      ? 'Internal System Snapshot' 
                      : inspectingBackup.format === 'SQL' 
                        ? 'Uploaded SQL Database Dump (*.sql)' 
                        : 'Uploaded JSON Backup File (*.json)'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingBackup(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Backup Metadata Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Company / System: </span>
                  <strong className="text-slate-900 dark:text-white font-bold">
                    {inspectingBackup.data.systemName || 'Paila Nepal Holidays'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Backup Date: </span>
                  <strong className="text-slate-900 dark:text-white font-bold">
                    {new Date(inspectingBackup.data.backupDate).toLocaleString()}
                  </strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Exported By: </span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {inspectingBackup.data.metadata?.exportedBy?.name || 'Administrator'} ({inspectingBackup.data.metadata?.exportedBy?.role || 'SUPER_ADMIN'})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    inspectingBackup.format === 'SQL' 
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800' 
                      : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                  }`}>
                    {inspectingBackup.format === 'SQL' ? 'SQL Database Dump' : 'JSON Object Bundle'}
                  </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">{inspectingBackup.data.version || '2.0.0'}</span>
                </div>
              </div>

              {/* SQL Script Viewer */}
              {inspectingBackup.rawSql && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setShowSqlSnippet(!showSqlSnippet)}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    <Database size={13} />
                    {showSqlSnippet ? 'Hide SQL Script Preview' : 'Preview SQL DDL / DML Schema Statements'}
                  </button>
                  {showSqlSnippet && (
                    <pre className="mt-2 p-3 bg-slate-900 text-amber-300 rounded-xl text-[11px] font-mono max-h-48 overflow-y-auto whitespace-pre-wrap border border-slate-800">
                      {inspectingBackup.rawSql}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Selective Module Restore Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-900 dark:text-white">
                  Select Modules to Restore:
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setModuleSelection({
                      companySettings: true,
                      bookings: true,
                      users: true,
                      vendors: true,
                      packages: true,
                      operations: true,
                      activities: true,
                      alerts: true,
                    })}
                    className="text-paila-blue font-semibold hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => setModuleSelection({
                      companySettings: false,
                      bookings: false,
                      users: false,
                      vendors: false,
                      packages: false,
                      operations: false,
                      activities: false,
                      alerts: false,
                    })}
                    className="text-slate-500 hover:underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Company Settings */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={moduleSelection.companySettings}
                    onChange={(e) => setModuleSelection(prev => ({ ...prev, companySettings: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-300 text-paila-blue focus:ring-paila-blue"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Company Profile & Tax IDs
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Legal Name, PAN/VAT, Domain, Phone, Letterhead
                    </span>
                  </div>
                </label>

                {/* 2. Bookings */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={moduleSelection.bookings}
                    onChange={(e) => setModuleSelection(prev => ({ ...prev, bookings: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-300 text-paila-blue focus:ring-paila-blue"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Bookings Database ({inspectingBackup.data.data.bookings?.length || 0} Records)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Clients, pax counts, itinerary days, financial balances
                    </span>
                  </div>
                </label>

                {/* 3. Users */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={moduleSelection.users}
                    onChange={(e) => setModuleSelection(prev => ({ ...prev, users: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-300 text-paila-blue focus:ring-paila-blue"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Users & Staff Logins ({inspectingBackup.data.data.users?.length || 0} Accounts)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Roles, credentials, active staff list
                    </span>
                  </div>
                </label>

                {/* 4. Vendors */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={moduleSelection.vendors}
                    onChange={(e) => setModuleSelection(prev => ({ ...prev, vendors: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-300 text-paila-blue focus:ring-paila-blue"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Vendors & Fleet ({inspectingBackup.data.data.vendors?.length || 0} Suppliers)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Hotels, transport, vehicle plates, bank details
                    </span>
                  </div>
                </label>

                {/* 5. Packages */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={moduleSelection.packages}
                    onChange={(e) => setModuleSelection(prev => ({ ...prev, packages: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-300 text-paila-blue focus:ring-paila-blue"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Trek Packages ({inspectingBackup.data.data.packages?.length || 0} Itineraries)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Standard tour catalog, day plans, standard pricing
                    </span>
                  </div>
                </label>

                {/* 6. Operations & Allocations */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={moduleSelection.operations}
                    onChange={(e) => setModuleSelection(prev => ({ ...prev, operations: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-300 text-paila-blue focus:ring-paila-blue"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Operations & Payments
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Vendor allocations and settlement receipts
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Safety Assurance Banner */}
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-800 dark:text-emerald-200 leading-relaxed">
                <span className="font-bold">Automatic Safety Snapshot:</span> A safety point snapshot of your current state will be saved before applying these changes. You can revert immediately if needed.
              </div>
            </div>

            {/* Confirmation Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setInspectingBackup(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={isRestoring || !Object.values(moduleSelection).some(Boolean)}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-600/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw size={14} />
                {isRestoring ? 'Restoring System...' : 'Confirm & Restore Selected Modules'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#111c30] border border-slate-200 dark:border-[#22324b] rounded-2xl max-w-md w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Clear All Local Snapshots?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This will delete all saved recovery points.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to clear your local snapshot history? This does not delete your active database, but removes all local restore points.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearAllSnapshots();
                  setShowClearConfirm(false);
                  sounds.click();
                  showNotification('info', 'All local snapshot points cleared');
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
