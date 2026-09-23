import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  SystemBackupData, 
  BackupSnapshot, 
  DailyBackupConfig, 
  BackupModuleSelection,
  CompanySettings,
  Booking,
  User,
  Vendor,
  Package,
  OperationAllocation,
  VendorPayment,
  Activity,
  Alert
} from '../types';
import { useCompanySettings } from './CompanySettingsContext';
import { useBookings } from './BookingContext';
import { useAuth } from './AuthContext';
import { useActivities } from './ActivityContext';
import { useAlerts } from './AlertContext';
import { sounds } from '../utils/sounds';
import { generateSqlDump, parseSqlDump } from '../utils/sqlBackup';

const SNAPSHOTS_STORAGE_KEY = 'paila_cms_backup_snapshots';
const DAILY_CONFIG_STORAGE_KEY = 'paila_cms_daily_backup_config';

export const VENDORS_STORAGE_KEY = 'paila_cms_vendors';
export const PACKAGES_STORAGE_KEY = 'paila_cms_packages';
export const ALLOCATIONS_STORAGE_KEY = 'paila_cms_operation_allocations';
export const PAYMENTS_STORAGE_KEY = 'paila_cms_vendor_payments';

const DEFAULT_DAILY_CONFIG: DailyBackupConfig = {
  enabled: true,
  scheduledTime: '02:00',
  retentionDays: 14,
  lastAutoBackupDate: null,
  lastAutoBackupTimestamp: null,
  autoDownloadAfterBackup: false,
  downloadFormat: 'JSON',
};

export const DEFAULT_MODULE_SELECTION: BackupModuleSelection = {
  companySettings: true,
  bookings: true,
  users: true,
  vendors: true,
  packages: true,
  operations: true,
  activities: true,
  alerts: true,
};

interface BackupContextType {
  snapshots: BackupSnapshot[];
  dailyConfig: DailyBackupConfig;
  updateDailyConfig: (updates: Partial<DailyBackupConfig>) => void;
  createSnapshot: (type?: 'MANUAL' | 'DAILY_AUTO' | 'PRE_RESTORE', customLabel?: string) => BackupSnapshot;
  downloadBackupFile: (snapshotOrData?: BackupSnapshot | SystemBackupData) => void;
  downloadSqlBackupFile: (snapshotOrData?: BackupSnapshot | SystemBackupData, dialect?: 'postgres' | 'standard') => void;
  restoreFromSnapshot: (snapshotId: string, selection?: BackupModuleSelection) => Promise<{ success: boolean; message: string }>;
  restoreFromBackupData: (backupData: SystemBackupData, selection?: BackupModuleSelection) => Promise<{ success: boolean; message: string }>;
  deleteSnapshot: (snapshotId: string) => void;
  clearAllSnapshots: () => void;
  validateBackupFile: (fileContent: string) => { valid: boolean; data?: SystemBackupData; error?: string };
  validateSqlBackupFile: (sqlContent: string) => { valid: boolean; data?: SystemBackupData; error?: string; detectedTables?: string[] };
  isBackingUp: boolean;
  isRestoring: boolean;
}

const BackupContext = createContext<BackupContextType | undefined>(undefined);

// Helper to get current persistent vendors
export function getStoredVendors(): Vendor[] {
  try {
    const stored = localStorage.getItem(VENDORS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return [];
}

// Helper to get current persistent packages
export function getStoredPackages(): Package[] {
  try {
    const stored = localStorage.getItem(PACKAGES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return [];
}

// Helper to get current persistent allocations
export function getStoredAllocations(): OperationAllocation[] {
  try {
    const stored = localStorage.getItem(ALLOCATIONS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return [];
}

// Helper to get current persistent payments
export function getStoredPayments(): VendorPayment[] {
  try {
    const stored = localStorage.getItem(PAYMENTS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return [];
}

export function BackupProvider({ children }: { children: ReactNode }) {
  const { settings, updateSettings } = useCompanySettings();
  const { bookings, setAllBookings } = useBookings();
  const { user, usersList, setAllUsers } = useAuth();
  const { activities, logActivity, setAllActivities } = useActivities();
  const { alerts, setAllAlerts } = useAlerts();

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Load Daily Backup Config
  const [dailyConfig, setDailyConfig] = useState<DailyBackupConfig>(() => {
    try {
      const stored = localStorage.getItem(DAILY_CONFIG_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_DAILY_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_DAILY_CONFIG;
  });

  // Save Daily Backup Config
  useEffect(() => {
    try {
      localStorage.setItem(DAILY_CONFIG_STORAGE_KEY, JSON.stringify(dailyConfig));
    } catch {
      // Ignore
    }
  }, [dailyConfig]);

  // Load Snapshots List
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>(() => {
    try {
      const stored = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return [];
  });

  // Save Snapshots List
  useEffect(() => {
    try {
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(snapshots));
    } catch {
      // Ignore
    }
  }, [snapshots]);

  // Compile full system backup data from current runtime
  const assembleCurrentSystemBackup = (): SystemBackupData => {
    const currentVendors = getStoredVendors();
    const currentPackages = getStoredPackages();
    const currentAllocations = getStoredAllocations();
    const currentPayments = getStoredPayments();

    return {
      version: '2.4.0',
      backupDate: new Date().toISOString(),
      systemName: settings.companyName || 'Paila Nepal Holidays Pvt. Ltd.',
      systemDomain: settings.domain || 'pailanepal.com',
      environment: 'PRODUCTION_ERP',
      metadata: {
        totalBookings: bookings.length,
        totalUsers: usersList.length,
        totalVendors: currentVendors.length,
        totalPackages: currentPackages.length,
        totalActivities: activities.length,
        totalAlerts: alerts.length,
        totalAllocations: currentAllocations.length,
        totalPayments: currentPayments.length,
        exportedBy: {
          name: user?.name || 'Super Admin',
          email: user?.email || 'admin@pailanepal.com',
          role: user?.role || 'SUPER_ADMIN',
        },
      },
      data: {
        companySettings: { ...settings },
        bookings: JSON.parse(JSON.stringify(bookings)),
        users: JSON.parse(JSON.stringify(usersList)),
        vendors: JSON.parse(JSON.stringify(currentVendors)),
        packages: JSON.parse(JSON.stringify(currentPackages)),
        operationAllocations: JSON.parse(JSON.stringify(currentAllocations)),
        vendorPayments: JSON.parse(JSON.stringify(currentPayments)),
        activities: JSON.parse(JSON.stringify(activities)),
        alerts: JSON.parse(JSON.stringify(alerts)),
        theme: localStorage.getItem('paila_erp_theme') || 'system',
      },
    };
  };

  // Create a snapshot in local storage
  const createSnapshot = (
    type: 'MANUAL' | 'DAILY_AUTO' | 'PRE_RESTORE' = 'MANUAL', 
    customLabel?: string
  ): BackupSnapshot => {
    setIsBackingUp(true);
    const backupData = assembleCurrentSystemBackup();
    const now = new Date();
    const timestamp = now.toISOString();

    let defaultLabel = '';
    if (type === 'DAILY_AUTO') {
      defaultLabel = `Daily Automated Backup - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (type === 'PRE_RESTORE') {
      defaultLabel = `Safety Snapshot (Pre-Restore) - ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      defaultLabel = customLabel || `Manual System Snapshot - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    const jsonString = JSON.stringify(backupData);
    const sizeBytes = new Blob([jsonString]).size;

    const newSnapshot: BackupSnapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      type,
      label: customLabel || defaultLabel,
      sizeBytes,
      metrics: {
        bookingsCount: backupData.data.bookings?.length || 0,
        usersCount: backupData.data.users?.length || 0,
        vendorsCount: backupData.data.vendors?.length || 0,
        packagesCount: backupData.data.packages?.length || 0,
        activitiesCount: backupData.data.activities?.length || 0,
        hasSettings: !!backupData.data.companySettings,
      },
      backup: backupData,
    };

    setSnapshots(prev => {
      // Apply retention policy: filter out snapshots older than retentionDays for daily backups
      const maxAgeMs = dailyConfig.retentionDays * 24 * 60 * 60 * 1000;
      const nowMs = Date.now();
      
      const filtered = [newSnapshot, ...prev].filter(snap => {
        if (snap.type !== 'DAILY_AUTO') return true; // keep manuals unless user deletes
        const snapAge = nowMs - new Date(snap.timestamp).getTime();
        return snapAge <= maxAgeMs;
      });

      return filtered.slice(0, 50); // Hard limit to 50 snapshots max in storage
    });

    logActivity({
      type: 'SYSTEM_BACKUP',
      category: 'BACKUP',
      title: type === 'DAILY_AUTO' ? 'Scheduled Daily Backup Completed' : 'System Backup Created',
      description: `${newSnapshot.label} successfully created (${(sizeBytes / 1024).toFixed(1)} KB). Contains ${newSnapshot.metrics.bookingsCount} bookings, ${newSnapshot.metrics.usersCount} users, ${newSnapshot.metrics.vendorsCount} vendors.`,
      actor: {
        name: user?.name || (type === 'DAILY_AUTO' ? 'Daily Backup Scheduler' : 'Super Admin'),
        email: user?.email,
        role: user?.role || 'SUPER_ADMIN',
      },
      metadata: {
        details: `Snapshot ID: ${newSnapshot.id}, Size: ${(sizeBytes / 1024).toFixed(1)} KB`,
      },
    });

    setIsBackingUp(false);
    return newSnapshot;
  };

  // Download snapshot or full backup as JSON file to computer
  const downloadBackupFile = (snapshotOrData?: BackupSnapshot | SystemBackupData) => {
    let data: SystemBackupData;
    if (snapshotOrData && 'backup' in snapshotOrData) {
      data = snapshotOrData.backup;
    } else if (snapshotOrData && 'version' in snapshotOrData) {
      data = snapshotOrData;
    } else {
      data = assembleCurrentSystemBackup();
    }

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const dateStr = new Date(data.backupDate).toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeCompName = (data.systemName || 'paila_erp').toLowerCase().replace(/[^a-z0-9]/g, '_');
    a.href = url;
    a.download = `${safeCompName}_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    sounds.success();
  };

  // Download snapshot or full backup as executable SQL dump file
  const downloadSqlBackupFile = (
    snapshotOrData?: BackupSnapshot | SystemBackupData, 
    dialect: 'postgres' | 'standard' = 'postgres'
  ) => {
    let data: SystemBackupData;
    if (snapshotOrData && 'backup' in snapshotOrData) {
      data = snapshotOrData.backup;
    } else if (snapshotOrData && 'version' in snapshotOrData) {
      data = snapshotOrData;
    } else {
      data = assembleCurrentSystemBackup();
    }

    const sqlStr = generateSqlDump(data, dialect);
    const blob = new Blob([sqlStr], { type: 'application/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const dateStr = new Date(data.backupDate).toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeCompName = (data.systemName || 'paila_erp').toLowerCase().replace(/[^a-z0-9]/g, '_');
    a.href = url;
    a.download = `${safeCompName}_database_dump_${dateStr}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    sounds.success();
  };

  // Validate uploaded JSON backup file
  const validateBackupFile = (fileContent: string): { valid: boolean; data?: SystemBackupData; error?: string } => {
    try {
      const parsed = JSON.parse(fileContent);
      if (!parsed || typeof parsed !== 'object') {
        return { valid: false, error: 'The file is not a valid JSON document.' };
      }

      if (!parsed.version && !parsed.backupDate && !parsed.data) {
        return { valid: false, error: 'Unrecognized backup structure. Missing "version" or "data" payload.' };
      }

      if (!parsed.data || typeof parsed.data !== 'object') {
        return { valid: false, error: 'Backup does not contain system payload data.' };
      }

      return { valid: true, data: parsed as SystemBackupData };
    } catch (err: any) {
      return { valid: false, error: `JSON Parse error: ${err.message || 'Corrupted file'}` };
    }
  };

  // Validate uploaded SQL dump file
  const validateSqlBackupFile = (sqlContent: string): { 
    valid: boolean; 
    data?: SystemBackupData; 
    error?: string; 
    detectedTables?: string[];
  } => {
    return parseSqlDump(sqlContent);
  };

  // Restore from system backup data with selective module toggles
  const restoreFromBackupData = async (
    backupData: SystemBackupData, 
    selection: BackupModuleSelection = DEFAULT_MODULE_SELECTION
  ): Promise<{ success: boolean; message: string }> => {
    setIsRestoring(true);
    try {
      // Step 1: Create a safety restore point before applying changes
      createSnapshot('PRE_RESTORE', `Safety Point (Before Restore on ${new Date().toLocaleTimeString()})`);

      const restoredModulesList: string[] = [];

      // 1. Company Settings
      if (selection.companySettings && backupData.data.companySettings) {
        updateSettings(backupData.data.companySettings);
        restoredModulesList.push('Company Profile & Tax Settings');
      }

      // 2. Bookings
      if (selection.bookings && Array.isArray(backupData.data.bookings)) {
        setAllBookings(backupData.data.bookings);
        restoredModulesList.push(`${backupData.data.bookings.length} Bookings`);
      }

      // 3. Users
      if (selection.users && Array.isArray(backupData.data.users)) {
        setAllUsers(backupData.data.users);
        restoredModulesList.push(`${backupData.data.users.length} Users`);
      }

      // 4. Vendors
      if (selection.vendors && Array.isArray(backupData.data.vendors)) {
        localStorage.setItem(VENDORS_STORAGE_KEY, JSON.stringify(backupData.data.vendors));
        restoredModulesList.push(`${backupData.data.vendors.length} Vendors`);
      }

      // 5. Packages
      if (selection.packages && Array.isArray(backupData.data.packages)) {
        localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(backupData.data.packages));
        restoredModulesList.push(`${backupData.data.packages.length} Packages`);
      }

      // 6. Allocations & Payments
      if (selection.operations) {
        if (Array.isArray(backupData.data.operationAllocations)) {
          localStorage.setItem(ALLOCATIONS_STORAGE_KEY, JSON.stringify(backupData.data.operationAllocations));
        }
        if (Array.isArray(backupData.data.vendorPayments)) {
          localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(backupData.data.vendorPayments));
        }
        restoredModulesList.push('Operations & Vendor Payments');
      }

      // 7. Activities
      if (selection.activities && Array.isArray(backupData.data.activities)) {
        setAllActivities(backupData.data.activities);
        restoredModulesList.push(`${backupData.data.activities.length} Audit Logs`);
      }

      // 8. Alerts
      if (selection.alerts && Array.isArray(backupData.data.alerts)) {
        setAllAlerts(backupData.data.alerts);
        restoredModulesList.push(`${backupData.data.alerts.length} System Alerts`);
      }

      // Theme if present
      if (backupData.data.theme) {
        try {
          localStorage.setItem('paila_erp_theme', backupData.data.theme);
        } catch {}
      }

      // Log the restore event
      logActivity({
        type: 'SYSTEM_RESTORE',
        category: 'BACKUP',
        title: 'System Restored from Backup',
        description: `Successfully restored modules: ${restoredModulesList.join(', ')}. Original backup timestamp: ${backupData.backupDate}.`,
        actor: {
          name: user?.name || 'Super Admin',
          email: user?.email,
          role: user?.role || 'SUPER_ADMIN',
        },
        metadata: {
          details: `Restored ${restoredModulesList.length} modules from backup dated ${new Date(backupData.backupDate).toLocaleString()}`,
        },
      });

      sounds.success();
      setIsRestoring(false);
      return { 
        success: true, 
        message: `System restored successfully: ${restoredModulesList.join(', ')}.` 
      };
    } catch (err: any) {
      setIsRestoring(false);
      return { 
        success: false, 
        message: `Failed to restore backup: ${err.message || 'Unknown error'}` 
      };
    }
  };

  // Restore from snapshot ID
  const restoreFromSnapshot = async (
    snapshotId: string, 
    selection: BackupModuleSelection = DEFAULT_MODULE_SELECTION
  ): Promise<{ success: boolean; message: string }> => {
    const snap = snapshots.find(s => s.id === snapshotId);
    if (!snap) {
      return { success: false, message: 'Snapshot not found.' };
    }
    return restoreFromBackupData(snap.backup, selection);
  };

  // Delete snapshot
  const deleteSnapshot = (snapshotId: string) => {
    setSnapshots(prev => prev.filter(s => s.id !== snapshotId));
  };

  // Clear all snapshots
  const clearAllSnapshots = () => {
    setSnapshots([]);
  };

  // Update Daily Backup Config
  const updateDailyConfig = (updates: Partial<DailyBackupConfig>) => {
    setDailyConfig(prev => ({ ...prev, ...updates }));
  };

  // Automatic Daily Backup Scheduler Effect
  // Evaluates once per session / day: If enabled and today has not yet been backed up, take snapshot!
  useEffect(() => {
    if (!dailyConfig.enabled) return;

    const todayStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    if (dailyConfig.lastAutoBackupDate === todayStr) {
      // Already backed up today
      return;
    }

    // Schedule automated backup for today
    const timer = setTimeout(() => {
      try {
        const snap = createSnapshot('DAILY_AUTO');
        setDailyConfig(prev => ({
          ...prev,
          lastAutoBackupDate: todayStr,
          lastAutoBackupTimestamp: new Date().toISOString(),
        }));

        if (dailyConfig.autoDownloadAfterBackup) {
          if (dailyConfig.downloadFormat === 'SQL') {
            downloadSqlBackupFile(snap);
          } else if (dailyConfig.downloadFormat === 'BOTH') {
            downloadBackupFile(snap);
            setTimeout(() => downloadSqlBackupFile(snap), 500);
          } else {
            downloadBackupFile(snap);
          }
        }
      } catch (e) {
        console.error('Failed to run daily auto-backup', e);
      }
    }, 2500); // slight delay after app boot

    return () => clearTimeout(timer);
  }, [dailyConfig.enabled, dailyConfig.lastAutoBackupDate]);

  return (
    <BackupContext.Provider
      value={{
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
      }}
    >
      {children}
    </BackupContext.Provider>
  );
}

export function useBackup() {
  const context = useContext(BackupContext);
  if (!context) {
    throw new Error('useBackup must be used within a BackupProvider');
  }
  return context;
}
