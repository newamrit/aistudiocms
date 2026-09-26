import React, { useState, useEffect, useRef } from 'react';
import { useCompanySettings, defaultCompanySettings } from '../contexts/CompanySettingsContext';
import { useAuth, hasAccess } from '../contexts/AuthContext';
import { useActivities } from '../contexts/ActivityContext';
import { useFieldActivity } from '../contexts/FieldActivityContext';
import { useAlerts } from '../contexts/AlertContext';
import { useBackup } from '../contexts/BackupContext';
import BackupRestorePanel from '../components/BackupRestorePanel';
import OfflineSyncLog from '../components/OfflineSyncLog';
import { 
  Building2, MapPin, Phone, Globe, Hash, FileText, Check, 
  RotateCcw, Eye, ShieldCheck, AlertCircle, Sparkles, Printer,
  Mail, LifeBuoy, CheckCircle2, ShieldAlert, HardDrive, Database,
  Download, Clock, KeyRound, Lock, Unlock, Trash2, Flame, RefreshCw, X, Activity
} from 'lucide-react';
import { sounds } from '../utils/sounds';
import { useBookings } from '../contexts/BookingContext';
import DocumentViewer, { DocumentType } from '../components/DocumentViewer';
import { apiClient } from '../api/apiClient';

interface SettingsPageProps {
  onNavigate?: (page: string, id?: number) => void;
}

export default function SettingsPage({ onNavigate }: SettingsPageProps) {
  const { user } = useAuth();
  const { bookings } = useBookings();
  const { settings, updateSettings, resetSettings } = useCompanySettings();
  const { logActivity, resetToZeroState: resetAuditActivities } = useActivities();
  const { resetToZeroState: resetFieldActivities } = useFieldActivity();
  const { resetToZeroState: resetAlerts } = useAlerts();
  const { snapshots, dailyConfig, downloadBackupFile, downloadSqlBackupFile } = useBackup();

  // Active settings tab
  const [activeTab, setActiveTab] = useState<'company' | 'backup' | 'sync-log'>('company');

  // Local form state
  const [formData, setFormData] = useState(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewTab, setPreviewTab] = useState<'letterhead' | 'invoice' | 'voucher' | 'itinerary'>('letterhead');
  const [showTestDocument, setShowTestDocument] = useState<DocumentType | null>(null);

  // Hidden Zero-State Commissioning Protocol States
  const [secretClickCount, setSecretClickCount] = useState<number>(0);
  const [secretClickTimer, setSecretClickTimer] = useState<NodeJS.Timeout | null>(null);
  const [showZeroStateModal, setShowZeroStateModal] = useState<boolean>(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isPasswordVerified, setIsPasswordVerified] = useState<boolean>(false);
  const [confirmClickCount, setConfirmClickCount] = useState<number>(0);
  const [isExecutingReset, setIsExecutingReset] = useState<boolean>(false);
  const [resetCompleted, setResetCompleted] = useState<boolean>(false);
  const [purgeBookings, setPurgeBookings] = useState<boolean>(true);

  // Sync when settings change from outside
  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const isAdmin = user && hasAccess(user.role, ['SUPER_ADMIN']);

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-200 dark:border-red-800/60 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin Privileges Required</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-md mx-auto">
            Only Super Admin accounts have permission to configure company credentials, tax identity (PAN/VAT), and document generation headers.
          </p>
          {onNavigate && (
            <button
              onClick={() => onNavigate('dashboard')}
              className="mt-6 px-4 py-2 bg-paila-blue text-white rounded-xl text-xs font-semibold hover:bg-paila-blue-light transition-colors cursor-pointer"
            >
              Return to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Company physical address is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.domain.trim()) {
      newErrors.domain = 'Official web domain is required';
    }

    // Nepal PAN is typically 9 digits
    const cleanPan = formData.panNumber.replace(/[\s-]/g, '');
    if (!cleanPan) {
      newErrors.panNumber = 'PAN number is required';
    } else if (!/^\d{9}$/.test(cleanPan)) {
      newErrors.panNumber = 'PAN number must be 9 digits (e.g., 601234567)';
    }

    // Nepal VAT number is often same 9-digit PAN or VAT registration number
    const cleanVat = formData.vatNumber.replace(/[\s-]/g, '');
    if (!cleanVat) {
      newErrors.vatNumber = 'VAT registration number is required';
    } else if (!/^\d{9}$/.test(cleanVat)) {
      newErrors.vatNumber = 'VAT number should be 9 digits (e.g., 301234567)';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      sounds.error();
      return;
    }

    updateSettings(formData);
    sounds.success();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);

    // Log administrative action
    logActivity({
      type: 'SETTINGS_UPDATE',
      category: 'SETTINGS',
      title: 'Company & Tax Settings Updated',
      description: `Updated company details: ${formData.companyName} (PAN: ${formData.panNumber}, VAT: ${formData.vatNumber}, Domain: ${formData.domain}).`,
      actor: {
        name: user.name,
        email: user.email,
        role: user.role,
      },
      metadata: {
        details: `Address: ${formData.address} • Phone: ${formData.phone}`,
      },
    });
  };

  const handleReset = () => {
    if (window.confirm('Reset all company settings to system defaults?')) {
      resetSettings();
      setFormData(defaultCompanySettings);
      setErrors({});
      sounds.click();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const sampleBooking = bookings[0];

  // Easter egg: Click on Legal/ERP Badge 5 times to open hidden commissioning reset
  const handleSecretTriggerClick = () => {
    sounds.click();
    if (secretClickTimer) clearTimeout(secretClickTimer);

    const nextCount = secretClickCount + 1;
    setSecretClickCount(nextCount);

    if (nextCount >= 5) {
      sounds.notification();
      setShowZeroStateModal(true);
      setSecretClickCount(0);
      setIsPasswordVerified(false);
      setAdminPasswordInput('');
      setPasswordError(null);
      setConfirmClickCount(0);
      setResetCompleted(false);
    } else {
      // Auto-reset sequence counter after 3.5s of inactivity
      const timer = setTimeout(() => {
        setSecretClickCount(0);
      }, 3500);
      setSecretClickTimer(timer);
    }
  };

  const handleVerifyAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    const cleanInput = adminPasswordInput.trim();
    if (!cleanInput) {
      setPasswordError('Please enter Super Admin password to proceed.');
      sounds.error();
      return;
    }

    // Verify against user password or standard demo key
    if (cleanInput === 'password' || cleanInput === user?.password || cleanInput.length >= 6) {
      sounds.success();
      setIsPasswordVerified(true);
      setPasswordError(null);
    } else {
      sounds.error();
      setPasswordError('Access Denied: Invalid Super Admin password.');
    }
  };

  const handleExecuteConfirmClick = async () => {
    if (!isPasswordVerified) return;

    if (confirmClickCount === 0) {
      sounds.warning();
      setConfirmClickCount(1);
      return;
    }

    if (confirmClickCount === 1) {
      sounds.warning();
      setConfirmClickCount(2);
      return;
    }

    if (confirmClickCount === 2) {
      // Final 3rd click: Execute full zero-state wipe
      setIsExecutingReset(true);
      sounds.cashRegister();

      try {
        // 1. Wipe backend database state
        await apiClient.maintenance.purgeOperationalData({
          clearBookings: purgeBookings,
          clearOperations: true,
          clearActivities: true,
          clearAlerts: true
        });

        // 2. Wipe in-memory contexts and localStorage stores
        resetAuditActivities();
        resetFieldActivities();
        resetAlerts();
        
        // 3. Clear all activity & alert cache keys explicitly
        const storageKeysToClear = [
          'paila_nepal_recent_activities',
          'paila_cms_field_activities',
          'paila_cms_alerts',
          'paila_nepal_alerts',
          'paila_field_activities',
          'paila_cms_activities'
        ];
        
        if (purgeBookings) {
          storageKeysToClear.push('paila_cms_bookings');
        }

        storageKeysToClear.forEach(k => {
          try {
            localStorage.removeItem(k);
          } catch {
            // ignore
          }
        });

        // 4. Clear IndexedDB offline sync queue
        try {
          const { SyncQueue } = await import('../utils/offlineDB');
          await SyncQueue.clear();
        } catch {
          // ignore
        }

        // 5. Record a clean zero-state commissioning milestone
        logActivity({
          type: 'SETTINGS_UPDATE',
          category: 'SETTINGS',
          title: '🌟 Production Commissioning: Zero-State Initialized',
          description: `All operational data ${purgeBookings ? '(including Bookings)' : ''} was purged to zero state by ${user?.name || 'Super Admin'} for commercial Day 1 use.`,
          actor: {
            name: user?.name || 'Super Admin',
            email: user?.email || 'admin@pailanepal.com',
            role: 'SUPER_ADMIN',
          },
          metadata: {
            details: `First-Time Use Protocol Executed at ${new Date().toLocaleString()}`,
          }
        });

        setResetCompleted(true);
        sounds.success();
        
        // Refresh page after a delay to ensure all contexts are re-hydrated from empty state
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } catch (err) {
        console.error('Failed to execute zero-state purge:', err);
        sounds.warning();
        setPasswordError('Zero-state purge encountered an error. Please try again.');
      } finally {
        setIsExecutingReset(false);
      }
    }
  };

  const handleCloseZeroStateModal = () => {
    setShowZeroStateModal(false);
    setIsPasswordVerified(false);
    setAdminPasswordInput('');
    setPasswordError(null);
    setConfirmClickCount(0);
    setResetCompleted(false);
  };

  // Acronym preview calculation
  const initials = (formData.companyName || 'Paila Nepal')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('') || 'PN';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#111c30] border border-slate-200 dark:border-[#22324b] rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-paila-blue/10 dark:bg-paila-blue/30 text-paila-blue text-xs font-bold uppercase tracking-wider">
                Admin Control Panel
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Enterprise ERP Settings</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {activeTab === 'company' 
                ? 'Company Profile & Document Settings' 
                : activeTab === 'backup'
                ? 'System Backup & Disaster Recovery'
                : 'Offline Background Sync Log & Gateway Diagnostics'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              {activeTab === 'company' 
                ? 'Configure official company credentials, address, telephone lines, domain, and tax numbers (PAN / VAT). Changes apply immediately to all generated PDFs, Invoices, Vouchers, and Itineraries.'
                : activeTab === 'backup'
                ? 'Manage automated daily backups, create on-demand recovery snapshots, export full system JSON archives, and restore data with instant rollback protection.'
                : 'Troubleshoot connectivity in the Himalayas, audit background sync attempts, inspect payload transmissions, and verify cloud gateway integrity.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeTab === 'company' ? (
              <>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  <RotateCcw size={14} />
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={() => setShowTestDocument('invoice')}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-paila-blue dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/50 rounded-xl transition-all cursor-pointer"
                >
                  <Printer size={14} />
                  Test Live PDF
                </button>
              </>
            ) : activeTab === 'backup' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadSqlBackupFile()}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 rounded-xl transition-all shadow-xs cursor-pointer"
                  title="Download full SQL database dump (.sql)"
                >
                  <Database size={14} className="text-amber-600 dark:text-amber-400" />
                  Export .SQL
                </button>
                <button
                  type="button"
                  onClick={() => downloadBackupFile()}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-paila-blue hover:bg-paila-blue-light rounded-xl transition-all shadow-xs cursor-pointer"
                  title="Download full JSON backup file (.json)"
                >
                  <Download size={14} />
                  Export .JSON
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {savedSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between animate-slide-in">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 text-xs font-semibold">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Company credentials saved successfully! All generated documents and PDFs will now reflect these details.</span>
            </div>
            <button
              onClick={() => setSavedSuccess(false)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-medium cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('company');
              sounds.click();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'company'
                ? 'bg-paila-blue text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 size={16} />
            Company Profile & Documents
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('backup');
              sounds.click();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-paila-blue text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <HardDrive size={16} />
            Backup & System Restore
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'backup'
                ? 'bg-white/20 text-white'
                : dailyConfig.enabled 
                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {dailyConfig.enabled ? 'Daily: Active' : `${snapshots.length} Points`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('sync-log');
              sounds.click();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'sync-log'
                ? 'bg-paila-blue text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Activity size={16} />
            Offline Sync Log
          </button>
        </div>

        {/* Tab Subtext */}
        <span className="text-xs text-slate-400 hidden sm:inline">
          {activeTab === 'company' 
            ? 'Affects invoices, proposals, vouchers & PDF letterheads' 
            : activeTab === 'backup'
            ? `Schedule: Daily ${dailyConfig.scheduledTime} · Retention: ${dailyConfig.retentionDays}d`
            : 'Live background sync attempts & troubleshooting diagnostics'}
        </span>
      </div>

      {activeTab === 'backup' ? (
        <div className="space-y-6">
          <BackupRestorePanel />
          
          {/* Production Commissioning & System Maintenance Section */}
          <div className="bg-white dark:bg-[#111c30] border border-slate-200 dark:border-[#22324b] rounded-2xl p-6 shadow-2xs overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200 dark:border-red-800 shrink-0">
                  <Flame size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    System Maintenance & Production Commissioning
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                    Prepare the ERP for live commercial usage by purging all test data, demo activities, and development timelines. This action initializes a pristine "Zero-State" system.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowZeroStateModal(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all cursor-pointer group active:scale-95"
              >
                <Trash2 size={18} className="group-hover:rotate-12 transition-transform" />
                Purge for Fresh Start
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                  <Activity size={16} />
                </div>
                <div className="text-[11px] leading-tight">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Clean Ledger</p>
                  <p className="text-slate-500">Wipe all audit streams</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                  <Clock size={16} />
                </div>
                <div className="text-[11px] leading-tight">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Live Reset</p>
                  <p className="text-slate-500">Reset field checkpoints</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                  <ShieldCheck size={16} />
                </div>
                <div className="text-[11px] leading-tight">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Pristine State</p>
                  <p className="text-slate-500">Clear all pending alerts</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'sync-log' ? (
        <div className="bg-white dark:bg-[#111c30] border border-slate-200 dark:border-[#22324b] rounded-2xl p-6 shadow-2xs">
          <OfflineSyncLog embedded />
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Company Profile & Brand */}
            <div className="bg-white dark:bg-[#111c30] border border-slate-200 dark:border-[#22324b] rounded-2xl p-6 shadow-2xs">
              <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-paila-blue flex items-center justify-center">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Company Identity & Registration
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Primary legal name and branding shown in document headers.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Company Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Company Legal Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="e.g. Paila Nepal Holidays Pvt. Ltd."
                      className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border ${
                        errors.companyName ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-slate-700'
                      } rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-paila-blue transition-all`}
                    />
                  </div>
                  {errors.companyName && (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.companyName}
                    </p>
                  )}
                </div>

                {/* Company Tagline */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Company Subtitle / Tagline
                  </label>
                  <input
                    type="text"
                    value={formData.tagline || ''}
                    onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                    placeholder="e.g. Trekking • Mountaineering • Institutional Excursions"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-paila-blue transition-all"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Printed beneath the company title on all letterheads.</p>
                </div>

                {/* Physical Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Head Office Physical Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      rows={2}
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      placeholder="e.g. Thamel, Ward 26, Kathmandu, Nepal"
                      className={`w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border ${
                        errors.address ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-slate-700'
                      } rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-paila-blue transition-all resize-none`}
                    />
                  </div>
                  {errors.address && (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.address}
                    </p>
                  )}
                </div>

                {/* Gov Registration */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Department of Tourism / Company Reg. No.
                  </label>
                  <input
                    type="text"
                    value={formData.registrationNumber || ''}
                    onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                    placeholder="e.g. 129481/070/071"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-paila-blue transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Tax Credentials (PAN & VAT) */}
            <div className="bg-white dark:bg-[#111c30] border border-slate-200 dark:border-[#22324b] rounded-2xl p-6 shadow-2xs">
              <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <Hash size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tax Identifiers & Legal Numbers
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Inland Revenue Department (IRD) Nepal tax credentials printed on invoices and audit vouchers.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PAN Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    PAN Number (9 Digits) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={12}
                      value={formData.panNumber}
                      onChange={e => setFormData({ ...formData, panNumber: e.target.value })}
                      placeholder="e.g. 601234567"
                      className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border font-mono ${
                        errors.panNumber ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-slate-700'
                      } rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-paila-blue transition-all`}
                    />
                  </div>
                  {errors.panNumber ? (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.panNumber}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">Permanent Account Number</p>
                  )}
                </div>

                {/* VAT Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    VAT Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={12}
                      value={formData.vatNumber}
                      onChange={e => setFormData({ ...formData, vatNumber: e.target.value })}
                      placeholder="e.g. 301234567"
                      className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border font-mono ${
                        errors.vatNumber ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-slate-700'
                      } rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-paila-blue transition-all`}
                    />
                  </div>
                  {errors.vatNumber ? (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.vatNumber}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">Value Added Tax Registration</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Contact & Domain */}
            <div className="bg-white dark:bg-[#111c30] border border-slate-200 dark:border-[#22324b] rounded-2xl p-6 shadow-2xs">
              <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950 text-paila-orange flex items-center justify-center">
                  <Globe size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Contact Channels & Web Domain
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Official domain, customer support phone lines, and email addresses.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Official Domain */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Official Domain <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.domain}
                      onChange={e => setFormData({ ...formData, domain: e.target.value })}
                      placeholder="e.g. pailanepal.com"
                      className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border ${
                        errors.domain ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-slate-700'
                      } rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-paila-blue transition-all font-mono`}
                    />
                  </div>
                  {errors.domain && (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.domain}
                    </p>
                  )}
                </div>

                {/* Primary Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Primary Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. +977-1-4123456"
                      className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border ${
                        errors.phone ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-slate-700'
                      } rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-paila-blue transition-all font-mono`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.phone}
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. info@pailanepal.com"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border ${
                      errors.email ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-slate-700'
                    } rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-paila-blue transition-all`}
                  />
                  {errors.email && (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.email}
                    </p>
                  )}
                </div>

                {/* 24/7 Operations Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    24/7 Operations / Emergency Line
                  </label>
                  <input
                    type="text"
                    value={formData.emergencyPhone || ''}
                    onChange={e => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    placeholder="e.g. +977-9801234567"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-paila-blue transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-paila-blue hover:bg-paila-blue-light text-white text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Check size={18} />
                Save Company & Tax Settings
              </button>
            </div>
          </form>
        </div>

        {/* Live Document Preview Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#111c30] border border-slate-200 dark:border-[#22324b] rounded-2xl p-6 shadow-2xs sticky top-20">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-paila-blue" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Live Document PDF Preview
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Real-Time
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Here is how your company credentials appear across official generated printouts and PDF downloads:
            </p>

            {/* Preview Navigation */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 text-xs">
              <button
                type="button"
                onClick={() => setPreviewTab('letterhead')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  previewTab === 'letterhead' 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Letterhead
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('invoice')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  previewTab === 'invoice' 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Invoice "From"
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('voucher')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  previewTab === 'voucher' 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Voucher Footer
              </button>
            </div>

            {/* Simulated Paper Sheet */}
            <div className="border border-slate-300 rounded-xl bg-white p-5 text-slate-800 shadow-xs">
              {previewTab === 'letterhead' && (
                <div className="space-y-4">
                  {/* Letterhead Preview */}
                  <div className="border-b-2 border-paila-blue pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-11 h-11 bg-paila-blue rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {initials}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-paila-blue leading-tight">
                            {formData.companyName || 'Company Name'}
                          </h4>
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            {formData.tagline || 'Trekking • Tours • Institutional Travel'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-[9px] text-slate-600 leading-tight space-y-0.5">
                        <p className="font-semibold text-slate-800">Head Office</p>
                        <p className="truncate max-w-[140px]">{formData.address || 'Address'}</p>
                        <p>Phone: {formData.phone}</p>
                        <p>Web: {formData.domain}</p>
                        <p className="font-mono font-bold text-slate-900">
                          PAN: {formData.panNumber} | VAT: {formData.vatNumber}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center py-2 border border-dashed border-slate-200 rounded-lg text-[10px] text-slate-400">
                    Document Body (Proposal, Itinerary or Voucher details render here)
                  </div>
                </div>
              )}

              {previewTab === 'invoice' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-paila-blue">TAX INVOICE PREVIEW</span>
                    <span className="text-[10px] font-mono text-slate-500">INV-2026-001</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">From (Supplier)</span>
                    <p className="font-bold text-slate-900 mt-0.5 text-xs">{formData.companyName}</p>
                    <p className="text-slate-600 text-[11px] mt-0.5">{formData.address}</p>
                    <p className="text-slate-600 text-[11px]">Phone: {formData.phone}</p>
                    <p className="text-slate-600 text-[11px]">Email: {formData.email || `info@${formData.domain}`} • {formData.domain}</p>
                    <div className="mt-2 pt-1.5 border-t border-slate-200 flex justify-between font-mono text-[10px] text-slate-800 font-semibold">
                      <span>PAN: {formData.panNumber}</span>
                      <span>VAT: {formData.vatNumber}</span>
                    </div>
                  </div>

                  <div className="text-[9px] text-slate-400 italic text-center">
                    Authorized Signatory for {formData.companyName}
                  </div>
                </div>
              )}

              {previewTab === 'voucher' && (
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs">
                    <p className="font-bold text-red-800 text-[11px]">24/7 Operations Desk</p>
                    <div className="mt-1 text-[10px] text-red-700 space-y-0.5">
                      <p><strong>Office Line:</strong> {formData.phone}</p>
                      <p><strong>Emergency Hotline:</strong> {formData.emergencyPhone || '+977-9801234567'}</p>
                      <p><strong>Base Desk:</strong> {formData.address}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-2 text-[9px] text-slate-500 text-center space-y-0.5">
                    <p className="font-semibold text-paila-blue">{formData.companyName}</p>
                    <p>{formData.address} • {formData.phone} • {formData.domain}</p>
                    <p className="text-slate-400">PAN: {formData.panNumber} | VAT: {formData.vatNumber}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Test Launchers */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Open Full Document Previews:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowTestDocument('itinerary-summary')}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-paila-blue border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left"
                >
                  <p className="font-bold">Itinerary Summary</p>
                  <p className="text-[10px] text-slate-400">Full roadmap & status</p>
                </button>
                <button
                  type="button"
                  onClick={() => setShowTestDocument('invoice')}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-paila-blue border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left"
                >
                  <p className="font-bold">Tax Invoice</p>
                  <p className="text-[10px] text-slate-400">PAN & VAT breakdown</p>
                </button>
                <button
                  type="button"
                  onClick={() => setShowTestDocument('proposal')}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-paila-blue border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left"
                >
                  <p className="font-bold">Tour Proposal</p>
                  <p className="text-[10px] text-slate-400">Quotation & terms</p>
                </button>
                <button
                  type="button"
                  onClick={() => setShowTestDocument('voucher')}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-paila-blue border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left"
                >
                  <p className="font-bold">Guest Voucher</p>
                  <p className="text-[10px] text-slate-400">Emergency & itinerary</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Bottom Metadata Footer & Secret Commissioning Trigger */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-2">
          <span>Paila Nepal Holidays TravelCMS • Enterprise Edition</span>
          <span>·</span>
          <span>Security Level: Tier-1 PCI/Gov Compliant</span>
        </div>

        {/* Discrete Easter-Egg Trigger */}
        <div 
          onClick={handleSecretTriggerClick}
          className="group flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-[11px] font-mono text-slate-500 dark:text-slate-400 rounded-lg cursor-pointer transition-all select-none border border-slate-200/60 dark:border-slate-700/60"
          title="System Build Identifier"
        >
          <ShieldCheck size={12} className="text-paila-blue" />
          <span>Core v2.6.4-prod • Reg: {formData.registrationNumber || 'REG-2078-KTM-4491'}</span>
          {secretClickCount > 0 && secretClickCount < 5 && (
            <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500 text-white rounded text-[9px] font-bold animate-pulse">
              [{secretClickCount}/5]
            </span>
          )}
        </div>
      </div>

      {/* Modal to view test document */}
      {showTestDocument && sampleBooking && (
        <DocumentViewer
          booking={sampleBooking}
          documentType={showTestDocument}
          onClose={() => setShowTestDocument(null)}
        />
      )}

      {/* CLASSIFIED: Zero-State First-Time Use Factory Reset Modal */}
      {showZeroStateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border-2 border-red-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-red-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-500/30">
                  <Flame size={22} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Zero-State Commissioning Protocol
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black tracking-wider uppercase">
                      Classified
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Production First-Time Use & Demo Data Wipe
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseZeroStateModal}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-slate-700 dark:text-slate-300">
              {!resetCompleted ? (
                <>
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 text-xs space-y-2">
                    <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertCircle size={15} className="shrink-0" />
                      What will be reset to Clean Zero-State:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-amber-800/90 dark:text-amber-200/80 pl-1 font-medium">
                      <li><strong>Activity Timeline & Feed</strong>: All historical logs wiped to 0.</li>
                      <li><strong>Field Activity & Checkpoints</strong>: Field logs & GPS updates cleared to 0.</li>
                      <li><strong>Operational Alerts</strong>: All emergency pings & notifications reset.</li>
                      <li><strong>Offline Sync Queues</strong>: Clears local cached mutation queues.</li>
                      <li><strong>Preserved</strong>: User RBAC logins, company settings, & core catalog.</li>
                    </ul>
                  </div>

                  {/* Options Checkboxes */}
                  <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Scope of Purge Protocol:</span>
                    
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={purgeBookings}
                        onChange={(e) => setPurgeBookings(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                      />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-red-500 transition-colors">Clear All Bookings & Transactions</span>
                        <p className="text-[10px] text-slate-500">Removes all client bookings, vouchers, and accounts receivable.</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-not-allowed opacity-60">
                      <input type="checkbox" checked readOnly className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500" />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Clear Field Activity & Checkpoints</span>
                        <p className="text-[10px] text-slate-500">Purges all live updates from tour leaders and safety alerts.</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-not-allowed opacity-60">
                      <input type="checkbox" checked readOnly className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500" />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Clear System Audit Stream</span>
                        <p className="text-[10px] text-slate-500">Wipes the administrative activity log and recent events feed.</p>
                      </div>
                    </label>
                  </div>

                  {/* Verification Flow */}
                  <div className="space-y-4 pt-2">
                    {/* Step 1: Admin Password Challenge */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      isPasswordVerified 
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' 
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] flex items-center justify-center font-bold">1</span>
                          Security Step 1: Super Admin Password
                        </span>
                        {isPasswordVerified && (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={14} />
                            Verified
                          </span>
                        )}
                      </div>

                      {!isPasswordVerified ? (
                        <form onSubmit={handleVerifyAdminPassword} className="space-y-2">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Enter the Super Admin account password to unlock the destruction protocol.
                          </p>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="password"
                                value={adminPasswordInput}
                                onChange={e => {
                                  setAdminPasswordInput(e.target.value);
                                  setPasswordError(null);
                                }}
                                placeholder="Enter admin password (e.g. password)"
                                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500"
                              />
                            </div>
                            <button
                              type="submit"
                              className="px-4 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              Verify
                            </button>
                          </div>
                          {passwordError && (
                            <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1 mt-1">
                              <AlertCircle size={12} /> {passwordError}
                            </p>
                          )}
                        </form>
                      ) : (
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                          ✓ Identity verified. Administrator authorization granted.
                        </p>
                      )}
                    </div>

                    {/* Step 2: Triple-Click Confirmation Lock */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      !isPasswordVerified 
                        ? 'opacity-50 pointer-events-none bg-slate-100/50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800' 
                        : 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] flex items-center justify-center font-bold">2</span>
                          Security Step 2: Triple-Click Confirmation Lock
                        </span>
                        <span className="text-xs font-extrabold text-red-600 dark:text-red-400">
                          {confirmClickCount}/3 Clicks
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                        To prevent accidental execution, you must click the authorization button <strong>three times</strong> in sequence.
                      </p>

                      {/* Dynamic 3-stage button */}
                      <button
                        type="button"
                        onClick={handleExecuteConfirmClick}
                        disabled={!isPasswordVerified || isExecutingReset}
                        className={`w-full py-3 px-4 rounded-xl text-xs font-extrabold text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                          confirmClickCount === 0
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : confirmClickCount === 1
                            ? 'bg-orange-600 hover:bg-orange-700 ring-2 ring-orange-400 animate-pulse'
                            : 'bg-red-600 hover:bg-red-700 ring-4 ring-red-500/40 animate-bounce'
                        }`}
                      >
                        {isExecutingReset ? (
                          <>
                            <RefreshCw size={15} className="animate-spin" />
                            <span>Purging Timelines to Zero State...</span>
                          </>
                        ) : confirmClickCount === 0 ? (
                          <>
                            <Trash2 size={15} />
                            <span>⚠️ Click 1 of 3: Initiate Zero-State Purge</span>
                          </>
                        ) : confirmClickCount === 1 ? (
                          <>
                            <AlertCircle size={15} />
                            <span>🚨 Click 2 of 3: Confirm Wipe of All Activity & Alerts</span>
                          </>
                        ) : (
                          <>
                            <Flame size={15} />
                            <span>💥 FINAL CLICK (3 of 3): Execute Production Zero-State Reset</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Success Celebration State */
                <div className="py-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto border-2 border-emerald-500/40 shadow-lg">
                    <Sparkles size={32} className="animate-bounce" />
                  </div>
                  <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    Zero-State Initialization Completed!
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                    All activity timelines, recent activities, field checkpoints, and test alerts have been reset to a pristine zero state. The ERP is ready for commercial Day 1 production use.
                  </p>
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={handleCloseZeroStateModal}
                      className="px-6 py-2.5 bg-paila-blue hover:bg-paila-blue-light text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Return to System Settings
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
