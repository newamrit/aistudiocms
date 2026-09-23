import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { sounds } from '../utils/sounds';
import { useAuth } from './AuthContext';

export type ActivityType =
  | 'STATUS_CHANGE'
  | 'VENDOR_SWAP'
  | 'SPOT_EXPENSE'
  | 'CHECK_IN'
  | 'EMERGENCY_ALERT'
  | 'MESSAGE';

export interface FieldActivity {
  id: number;
  type: ActivityType;
  tourLeaderId: number;
  tourLeaderName: string;
  bookingId: number;
  bookingCode: string;
  clientName: string;
  timestamp: string;
  title: string;
  description: string;
  metadata?: Record<string, any>;
  acknowledged: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface FieldActivityContextType {
  activities: FieldActivity[];
  latestIncomingActivity: FieldActivity | null;
  clearLatestIncomingActivity: () => void;
  addActivity: (activity: Omit<FieldActivity, 'id' | 'timestamp' | 'acknowledged'>) => void;
  acknowledgeActivity: (id: number) => void;
  resetToZeroState: () => void;
  getActivitiesByTourLeader: (tourLeaderId: number) => FieldActivity[];
  getActivitiesByBooking: (bookingId: number) => FieldActivity[];
  getUnacknowledgedCount: () => number;
}

const FieldActivityContext = createContext<FieldActivityContextType | undefined>(undefined);

// Seed with realistic historical activity data
const seedActivities: FieldActivity[] = [
  {
    id: 1, type: 'STATUS_CHANGE', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: '2026-01-20 06:30:00', title: 'Tour Started',
    description: 'Tour status changed from CONFIRMED to IN_PROGRESS. Group departed from Kathmandu to Nayapul.',
    metadata: { fromStatus: 'CONFIRMED', toStatus: 'IN_PROGRESS' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 2, type: 'VENDOR_SWAP', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: '2026-01-21 16:45:00', title: 'Hotel Swap Authorized',
    description: 'Swapped Ghorepani Teahouse → Snow Leopard Lodge. Reason: Original teahouse fully booked due to season rush.',
    metadata: { originalVendor: 'Ghorepani Teahouse', newVendor: 'Snow Leopard Lodge', serviceType: 'HOTEL', costDifference: 2000 },
    acknowledged: true, priority: 'MEDIUM'
  },
  {
    id: 3, type: 'SPOT_EXPENSE', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: '2026-01-21 14:30:00', title: 'Spot Expense: NPR 1,200',
    description: 'Extra water bottles for group due to heat wave conditions.',
    metadata: { amount: 1200, category: 'Refreshments', paymentMethod: 'CASH' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 4, type: 'SPOT_EXPENSE', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: '2026-01-22 09:15:00', title: 'Spot Expense: NPR 850',
    description: 'Emergency medicine purchased at pharmacy for client with altitude headache.',
    metadata: { amount: 850, category: 'Medical', paymentMethod: 'PERSONAL' },
    acknowledged: true, priority: 'HIGH'
  },
  {
    id: 5, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: '2026-01-22 17:00:00', title: 'Daily Check-in',
    description: 'All 4 trekkers safe and well. Reached Tadapani. Weather clear. Group morale good.',
    metadata: { paxSafe: 4, paxTotal: 4, weatherCondition: 'Clear', nextStop: 'Chhomrong' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 6, type: 'VENDOR_SWAP', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: '2026-01-23 12:30:00', title: 'Restaurant Swap - Pending Authorization',
    description: 'Lunch restaurant closed unexpectedly. Swapping to nearby Mountain View Cafe. Same meal plan cost.',
    metadata: { originalVendor: 'Tadapani Tea House', newVendor: 'Mountain View Cafe', serviceType: 'RESTAURANT', costDifference: 0 },
    acknowledged: false, priority: 'MEDIUM'
  },
  {
    id: 7, type: 'SPOT_EXPENSE', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: '2026-01-23 15:00:00', title: 'Spot Expense: NPR 3,500',
    description: 'Emergency porter hired at Chhomrong as one trekker developed knee pain and cannot carry own bag.',
    metadata: { amount: 3500, category: 'Transport', paymentMethod: 'CASH' },
    acknowledged: false, priority: 'HIGH'
  },
];

const FIELD_ACTIVITY_STORAGE_KEY = 'paila_cms_field_activities';

export function FieldActivityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [latestIncomingActivity, setLatestIncomingActivity] = useState<FieldActivity | null>(null);
  const [activities, setActivities] = useState<FieldActivity[]>(() => {
    try {
      const saved = localStorage.getItem(FIELD_ACTIVITY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return seedActivities;
  });

  useEffect(() => {
    try {
      localStorage.setItem(FIELD_ACTIVITY_STORAGE_KEY, JSON.stringify(activities));
    } catch {
      // ignore
    }
  }, [activities]);

  const clearLatestIncomingActivity = useCallback(() => {
    setLatestIncomingActivity(null);
  }, []);

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('paila_realtime_field_activities');
        channel.onmessage = (event) => {
          const data = event.data;
          if (data?.type === 'NEW_FIELD_ACTIVITY' && data.activity) {
            const incoming: FieldActivity = data.activity;
            setActivities(prev => {
              if (prev.some(a => a.id === incoming.id)) return prev;
              return [incoming, ...prev];
            });

            if (user?.role !== 'TOUR_OPERATOR') {
              sounds.notification();
              setLatestIncomingActivity(incoming);
            }
          } else if (data?.type === 'ACK_FIELD_ACTIVITY' && data.id) {
            setActivities(prev => prev.map(a => a.id === data.id ? { ...a, acknowledged: true } : a));
          }
        };
      }
    } catch (e) {
      console.warn('FieldActivity BroadcastChannel error:', e);
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === FIELD_ACTIVITY_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setActivities(prev => {
              const prevIds = new Set(prev.map(a => a.id));
              const newlyAdded = parsed.find((a: FieldActivity) => !prevIds.has(a.id) && !a.acknowledged);
              if (newlyAdded && user?.role !== 'TOUR_OPERATOR') {
                sounds.notification();
                setLatestIncomingActivity(newlyAdded);
              }
              return parsed;
            });
          }
        } catch {
          // ignore
        }
      }
    };

    const handleCustomActivityEvent = (e: Event) => {
      const customEvt = e as CustomEvent<FieldActivity>;
      if (customEvt.detail) {
        const incoming = customEvt.detail;
        setActivities(prev => {
          if (prev.some(a => a.id === incoming.id)) return prev;
          return [incoming, ...prev];
        });
        if (user?.role !== 'TOUR_OPERATOR') {
          sounds.notification();
          setLatestIncomingActivity(incoming);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('paila_field_activity_created' as any, handleCustomActivityEvent);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('paila_field_activity_created' as any, handleCustomActivityEvent);
    };
  }, [user?.role]);

  const addActivity = (activity: Omit<FieldActivity, 'id' | 'timestamp' | 'acknowledged'>) => {
    const newActivity: FieldActivity = {
      ...activity,
      id: Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      acknowledged: false,
    };
    setActivities(prev => [newActivity, ...prev]);

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('paila_realtime_field_activities');
        ch.postMessage({ type: 'NEW_FIELD_ACTIVITY', activity: newActivity });
        setTimeout(() => ch.close(), 100);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('paila_field_activity_created', { detail: newActivity }));
      }
    } catch {
      // ignore
    }
  };

  const acknowledgeActivity = (id: number) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('paila_realtime_field_activities');
        ch.postMessage({ type: 'ACK_FIELD_ACTIVITY', id });
        setTimeout(() => ch.close(), 100);
      }
    } catch {
      // ignore
    }
  };

  const resetToZeroState = () => {
    setActivities([]);
    setLatestIncomingActivity(null);
    try {
      localStorage.setItem(FIELD_ACTIVITY_STORAGE_KEY, JSON.stringify([]));
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('paila_realtime_field_activities');
        ch.postMessage({ type: 'RESET_FIELD_ACTIVITIES' });
        setTimeout(() => ch.close(), 100);
      }
    } catch {
      // ignore
    }
  };

  const getActivitiesByTourLeader = (tourLeaderId: number) =>
    activities.filter(a => a.tourLeaderId === tourLeaderId);

  const getActivitiesByBooking = (bookingId: number) =>
    activities.filter(a => a.bookingId === bookingId);

  const getUnacknowledgedCount = () =>
    activities.filter(a => !a.acknowledged).length;

  return (
    <FieldActivityContext.Provider value={{
      activities,
      latestIncomingActivity,
      clearLatestIncomingActivity,
      addActivity,
      acknowledgeActivity,
      resetToZeroState,
      getActivitiesByTourLeader,
      getActivitiesByBooking,
      getUnacknowledgedCount,
    }}>
      {children}
    </FieldActivityContext.Provider>
  );
}

export function useFieldActivity() {
  const context = useContext(FieldActivityContext);
  if (!context) throw new Error('useFieldActivity must be used within FieldActivityProvider');
  return context;
}
