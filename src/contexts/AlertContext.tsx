import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

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
  acknowledged_at: string | null;
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
  createAlert: (alert: Omit<Alert, 'id' | 'status' | 'acknowledged_by' | 'acknowledged_at' | 'created_at'>) => Promise<number>;
  acknowledgeAlert: (alertId: number) => Promise<void>;
  refreshAlerts: () => Promise<void>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

const STORAGE_KEY = 'paila_nepal_alerts';

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
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return defaultSeedAlerts;
  });

  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Save to localStorage whenever alerts change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    } catch {
      // ignore
    }
  }, [alerts]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      // If a custom API base URL is specified and not the local SPA, attempt fetch
      const apiUrl = (import.meta as any).env?.VITE_API_URL;
      if (apiUrl) {
        const response = await fetch(`${apiUrl}/alerts`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (data?.success && Array.isArray(data?.data)) {
              setAlerts(data.data);
              return;
            }
          }
        }
      }
    } catch (error) {
      console.warn('API sync bypassed, using local alerts cache:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async (alertData: Omit<Alert, 'id' | 'status' | 'acknowledged_by' | 'acknowledged_at' | 'created_at'>): Promise<number> => {
    const newId = Date.now();
    const newAlert: Alert = {
      ...alertData,
      id: newId,
      status: 'PENDING',
      acknowledged_by: null,
      acknowledged_at: null,
      created_at: new Date().toISOString(),
      tour_leader_name: alertData.tour_leader_name || user?.name || 'Tour Leader',
      tour_leader_phone: alertData.tour_leader_phone || user?.phone || '+977-9841000000',
      booking_code: alertData.booking_code || (alertData.booking_id ? `PNH-2026-00${alertData.booking_id}` : undefined),
    };

    setAlerts(prev => [newAlert, ...prev]);

    // Optional background sync if API exists
    const apiUrl = (import.meta as any).env?.VITE_API_URL;
    if (apiUrl) {
      try {
        await fetch(`${apiUrl}/alerts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAlert),
        });
      } catch {
        // Safe to ignore in offline / local-first mode
      }
    }

    return newId;
  };

  const acknowledgeAlert = async (alertId: number) => {
    const acknowledgedAt = new Date().toISOString();
    const acknowledgedBy = user?.id || 1;

    setAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId
          ? {
              ...alert,
              status: 'ACKNOWLEDGED',
              acknowledged_by: acknowledgedBy,
              acknowledged_at: acknowledgedAt,
            }
          : alert
      )
    );

    // Optional background sync
    const apiUrl = (import.meta as any).env?.VITE_API_URL;
    if (apiUrl) {
      try {
        await fetch(`${apiUrl}/alerts`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert_id: alertId,
            acknowledged_by: acknowledgedBy,
          }),
        });
      } catch {
        // Safe to ignore
      }
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const unreadCount = alerts.filter(alert => alert.status === 'PENDING').length;

  return (
    <AlertContext.Provider
      value={{
        alerts,
        unreadCount,
        loading,
        createAlert,
        acknowledgeAlert,
        refreshAlerts: fetchAlerts,
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
