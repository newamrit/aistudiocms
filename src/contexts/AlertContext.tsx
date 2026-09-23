import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { apiClient, DB_KEYS } from '../api/apiClient';
import { sounds } from '../utils/sounds';

export interface Alert {
  id: number;
  booking_id: number | null;
  tour_leader_id: number;
  alert_type: 'EMERGENCY_SOS' | 'HIGHWAY_BLOCK' | 'VEHICLE_BREAKDOWN' | 'VENDOR_SWAP' | 'MEDICAL' | 'WEATHER' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string | null;
  location: string | null;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledged_by: number | null;
  acknowledged_by_name?: string | null;
  acknowledged_at: string | null;
  resolved_at?: string | null;
  resolved_by_name?: string | null;
  created_at: string;
  tour_leader_name?: string;
  tour_leader_phone?: string;
  booking_code?: string;
  client_name?: string;
}

interface AlertContextType {
  alerts: Alert[];
  unreadCount: number;
  loading: boolean;
  latestIncomingAlert: Alert | null;
  clearLatestIncomingAlert: () => void;
  createAlert: (alert: Omit<Alert, 'id' | 'status' | 'acknowledged_by' | 'acknowledged_at' | 'created_at'>) => Promise<number>;
  acknowledgeAlert: (alertId: number) => Promise<void>;
  resolveAlert: (alertId: number) => Promise<void>;
  refreshAlerts: () => Promise<void>;
  setAllAlerts: (newAlerts: Alert[]) => void;
  resetToZeroState: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

const STORAGE_KEY = DB_KEYS.ALERTS || 'paila_cms_alerts';
const LEGACY_STORAGE_KEY = 'paila_nepal_alerts';

const defaultSeedAlerts: Alert[] = [
  {
    id: 101,
    booking_id: 2,
    tour_leader_id: 4,
    alert_type: 'EMERGENCY_SOS',
    severity: 'CRITICAL',
    title: 'Altitude Sickness Checkpoint Alert',
    description: 'Trekker in Group A showing mild symptoms of AMS at Deurali (3,200m). Administered Diamox, monitoring SpO2 levels (82%).',
    location: 'Deurali, Annapurna Sanctuary Route',
    status: 'PENDING',
    acknowledged_by: null,
    acknowledged_at: null,
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    tour_leader_name: 'Prakash Gurung',
    tour_leader_phone: '+977-9841234567',
    booking_code: 'PNH-2026-002',
    client_name: 'Hans Mueller (Germany)',
  },
  {
    id: 102,
    booking_id: 3,
    tour_leader_id: 5,
    alert_type: 'HIGHWAY_BLOCK',
    severity: 'HIGH',
    title: 'Mugling Highway Landslide Clearance',
    description: 'Temporary roadblock reported between Kurintar and Mugling due to overnight gravel slip. Traffic being diverted to secondary lane.',
    location: 'Prithvi Highway (KM 84, Mugling Section)',
    status: 'ACKNOWLEDGED',
    acknowledged_by: 1,
    acknowledged_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    tour_leader_name: 'Sunil Shrestha',
    tour_leader_phone: '+977-9851098765',
    booking_code: 'PNH-2026-003',
    client_name: 'David Chen (Singapore)',
  },
  {
    id: 103,
    booking_id: 2,
    tour_leader_id: 4,
    alert_type: 'VENDOR_SWAP',
    severity: 'MEDIUM',
    title: 'Teahouse Allocation Shift',
    description: 'Swapped overnight halt from Tadapani Tea House to Snow Leopard Lodge due to room availability.',
    location: 'Tadapani, Annapurna Base Camp Trail',
    status: 'RESOLVED',
    acknowledged_by: 1,
    acknowledged_at: new Date(Date.now() - 300 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
    tour_leader_name: 'Prakash Gurung',
    tour_leader_phone: '+977-9841234567',
    booking_code: 'PNH-2026-002',
    client_name: 'Hans Mueller (Germany)',
  }
];

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<number, Alert>();
          for (const item of parsed) {
            if (item && item.id) map.set(item.id, item);
          }
          return Array.from(map.values());
        }
      }
    } catch {
      // ignore
    }
    return defaultSeedAlerts;
  });

  const [loading, setLoading] = useState(false);
  const [latestIncomingAlert, setLatestIncomingAlert] = useState<Alert | null>(null);
  const { user } = useAuth();
  const alertsRef = useRef<Alert[]>(alerts);
  alertsRef.current = alerts;

  // Sync to local storage
  useEffect(() => {
    try {
      const serialized = JSON.stringify(alerts);
      localStorage.setItem(STORAGE_KEY, serialized);
      localStorage.setItem(LEGACY_STORAGE_KEY, serialized);
    } catch {
      // ignore
    }
  }, [alerts]);

  const clearLatestIncomingAlert = useCallback(() => {
    setLatestIncomingAlert(null);
  }, []);

  const fetchAlerts = useCallback(async (showLoadingSpinner = false) => {
    try {
      if (showLoadingSpinner) setLoading(true);
      const dbAlerts = await apiClient.alerts.getAll();
      if (Array.isArray(dbAlerts) && dbAlerts.length > 0) {
        setAlerts(prev => {
          // Check for any newly added pending alerts
          const prevIds = new Set(prev.map(a => a.id));
          const newPending = dbAlerts.find(a => !prevIds.has(a.id) && a.status === 'PENDING');
          if (newPending && user?.role !== 'TOUR_OPERATOR') {
            sounds.warning();
            setLatestIncomingAlert(newPending);
          }
          return dbAlerts;
        });
      }
    } catch (error) {
      console.warn('Alerts API sync fallback to local cache:', error);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  }, [user?.role]);

  // Real-time broadcast and cross-tab/same-tab listener
  useEffect(() => {
    fetchAlerts(true);

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('paila_realtime_alerts_channel');
        channel.onmessage = (event) => {
          const data = event.data;
          if (data?.type === 'NEW_ALERT' && data.alert) {
            const newAlert: Alert = data.alert;
            setAlerts(prev => {
              if (prev.some(a => a.id === newAlert.id)) return prev;
              return [newAlert, ...prev];
            });
            if (user?.role !== 'TOUR_OPERATOR') {
              sounds.warning();
              setLatestIncomingAlert(newAlert);
            }
          } else if (data?.type === 'UPDATE_ALERT' && data.alert) {
            const updated: Alert = data.alert;
            setAlerts(prev => prev.map(a => a.id === updated.id ? updated : a));
          } else if (data?.type === 'REFRESH_ALERTS') {
            fetchAlerts(false);
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }

    // Cross-tab storage event listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === LEGACY_STORAGE_KEY) {
        try {
          if (e.newValue) {
            const parsed = JSON.parse(e.newValue);
            if (Array.isArray(parsed)) {
              setAlerts(prev => {
                const prevIds = new Set(prev.map(a => a.id));
                const newlyAdded = parsed.find((a: Alert) => !prevIds.has(a.id) && a.status === 'PENDING');
                if (newlyAdded && user?.role !== 'TOUR_OPERATOR') {
                  sounds.warning();
                  setLatestIncomingAlert(newlyAdded);
                }
                return parsed;
              });
            }
          }
        } catch {
          // ignore
        }
      }
    };

    // Same-window custom event listener
    const handleCustomEvent = (e: Event) => {
      const customEvt = e as CustomEvent<Alert>;
      if (customEvt.detail) {
        const newAlert = customEvt.detail;
        setAlerts(prev => {
          if (prev.some(a => a.id === newAlert.id)) return prev;
          return [newAlert, ...prev];
        });
        if (user?.role !== 'TOUR_OPERATOR') {
          sounds.warning();
          setLatestIncomingAlert(newAlert);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('paila_alert_created' as any, handleCustomEvent);

    // Live background polling every 2.5s for near-instant synchronization
    const pollInterval = setInterval(() => {
      fetchAlerts(false);
    }, 2500);

    return () => {
      if (channel) {
        channel.close();
      }
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('paila_alert_created' as any, handleCustomEvent);
      clearInterval(pollInterval);
    };
  }, [fetchAlerts, user?.role]);

  const broadcastAlertEvent = (type: 'NEW_ALERT' | 'UPDATE_ALERT' | 'REFRESH_ALERTS', alert?: Alert) => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('paila_realtime_alerts_channel');
        ch.postMessage({ type, alert });
        setTimeout(() => ch.close(), 100);
      }
    } catch (e) {
      // ignore
    }
  };

  const createAlert = async (alertData: Omit<Alert, 'id' | 'status' | 'acknowledged_by' | 'acknowledged_at' | 'created_at'>): Promise<number> => {
    try {
      const created = await apiClient.alerts.create({
        ...alertData,
        tour_leader_name: alertData.tour_leader_name || user?.name || 'Tour Leader',
        tour_leader_phone: alertData.tour_leader_phone || user?.phone || '+977-9841000000',
        booking_code: alertData.booking_code || (alertData.booking_id ? `PNH-2026-00${alertData.booking_id}` : undefined),
      });

      setAlerts(prev => [created, ...prev.filter(a => a.id !== created.id)]);
      
      // Broadcast in real-time across tabs & window
      broadcastAlertEvent('NEW_ALERT', created);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('paila_alert_created', { detail: created }));
      }

      return created.id;
    } catch (err) {
      console.error('Failed to create alert in database:', err);
      const fallbackId = Date.now();
      const fallbackAlert: Alert = {
        ...alertData,
        id: fallbackId,
        status: 'PENDING',
        acknowledged_by: null,
        acknowledged_at: null,
        created_at: new Date().toISOString(),
        tour_leader_name: alertData.tour_leader_name || user?.name || 'Tour Leader',
        tour_leader_phone: alertData.tour_leader_phone || user?.phone || '+977-9841000000',
        booking_code: alertData.booking_code || (alertData.booking_id ? `PNH-2026-00${alertData.booking_id}` : undefined),
      };
      
      setAlerts(prev => [fallbackAlert, ...prev]);
      
      broadcastAlertEvent('NEW_ALERT', fallbackAlert);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('paila_alert_created', { detail: fallbackAlert }));
      }

      return fallbackId;
    }
  };

  const acknowledgeAlert = async (alertId: number) => {
    const acknowledgedAt = new Date().toISOString();
    const acknowledgedBy = user?.id || 1;
    const acknowledgedByName = user?.name || (user?.role === 'SUPER_ADMIN' ? 'Rajesh Shrestha (Admin)' : 'Operations Team');

    let updatedAlert: Alert | null = null;
    setAlerts(prev =>
      prev.map(alert => {
        if (alert.id === alertId) {
          updatedAlert = {
            ...alert,
            status: 'ACKNOWLEDGED',
            acknowledged_by: acknowledgedBy,
            acknowledged_by_name: acknowledgedByName,
            acknowledged_at: acknowledgedAt,
          };
          return updatedAlert;
        }
        return alert;
      })
    );

    if (updatedAlert) {
      broadcastAlertEvent('UPDATE_ALERT', updatedAlert);
    }

    try {
      await apiClient.alerts.acknowledge(alertId);
    } catch (err) {
      console.warn(`Failed to sync alert #${alertId} acknowledgement to database:`, err);
    }
  };

  const resolveAlert = async (alertId: number) => {
    const resolvedAt = new Date().toISOString();
    const resolvedByName = user?.name || (user?.role === 'SUPER_ADMIN' ? 'Rajesh Shrestha (Admin)' : 'Operations Team');

    let updatedAlert: Alert | null = null;
    setAlerts(prev =>
      prev.map(alert => {
        if (alert.id === alertId) {
          updatedAlert = {
            ...alert,
            status: 'RESOLVED',
            resolved_at: resolvedAt,
            resolved_by_name: resolvedByName,
          };
          return updatedAlert;
        }
        return alert;
      })
    );

    if (updatedAlert) {
      broadcastAlertEvent('UPDATE_ALERT', updatedAlert);
    }

    try {
      await apiClient.alerts.resolve(alertId);
    } catch (err) {
      console.warn(`Failed to sync alert #${alertId} resolution to database:`, err);
    }
  };

  const setAllAlerts = (newAlerts: Alert[]) => {
    setAlerts(newAlerts);
    try {
      const serialized = JSON.stringify(newAlerts);
      localStorage.setItem(STORAGE_KEY, serialized);
      localStorage.setItem(LEGACY_STORAGE_KEY, serialized);
      broadcastAlertEvent('REFRESH_ALERTS');
    } catch {
      // ignore
    }
  };

  const resetToZeroState = () => {
    setAlerts([]);
    setLatestIncomingAlert(null);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify([]));
      broadcastAlertEvent('REFRESH_ALERTS');
    } catch {
      // ignore
    }
  };

  const unreadCount = alerts.filter(alert => alert.status === 'PENDING').length;

  return (
    <AlertContext.Provider
      value={{
        alerts,
        unreadCount,
        loading,
        latestIncomingAlert,
        clearLatestIncomingAlert,
        createAlert,
        acknowledgeAlert,
        resolveAlert,
        refreshAlerts: () => fetchAlerts(false),
        setAllAlerts,
        resetToZeroState,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within AlertProvider');
  }
  return context;
}

