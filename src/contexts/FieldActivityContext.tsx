import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { sounds } from '../utils/sounds';
import { useAuth } from './AuthContext';
import { apiClient, DB_KEYS } from '../api/apiClient';

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
  addActivity: (activity: Omit<FieldActivity, 'id' | 'timestamp' | 'acknowledged'>) => Promise<FieldActivity>;
  acknowledgeActivity: (id: number) => Promise<void>;
  refreshActivities: () => Promise<void>;
  resetToZeroState: () => void;
  getActivitiesByTourLeader: (tourLeaderId: number) => FieldActivity[];
  getActivitiesByBooking: (bookingId: number) => FieldActivity[];
  getUnacknowledgedCount: () => number;
}

const FieldActivityContext = createContext<FieldActivityContextType | undefined>(undefined);

function getRollingDate(daysAgo: number, timeStr = '12:00:00'): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day} ${timeStr}`;
}

// Seed with realistic historical activity data across the rolling last 7 days
const seedActivities: FieldActivity[] = [
  // Day 0: Today
  {
    id: 1, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(0, '08:30:00'), title: 'Namche Bazaar Check-in',
    description: 'All 6 trekkers safe and healthy. Altitude 3,440m reached. Clear Himalayan view, resting before Tengboche.',
    metadata: { paxSafe: 6, paxTotal: 6, weatherCondition: 'Clear & Sunny', nextStop: 'Tengboche Monastery', altitude: '3,440m' },
    acknowledged: false, priority: 'LOW'
  },
  {
    id: 2, type: 'SPOT_EXPENSE', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(0, '11:15:00'), title: 'Spot Expense: NPR 6,000',
    description: 'Sagarmatha National Park entry checkpoint permits and conservation fees for 6 foreign trekkers.',
    metadata: { amount: 6000, category: 'Permits', paymentMethod: 'CASH' },
    acknowledged: false, priority: 'MEDIUM'
  },
  {
    id: 3, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 1, bookingCode: 'PNH-2026-001', clientName: 'St. Xavier School Group',
    timestamp: getRollingDate(0, '14:45:00'), title: 'Pokhara Lakeside Check-in',
    description: 'All 24 students and 3 faculty members checked in safely at Pokhara. Briefing for Sarangkot sunrise excursion done.',
    metadata: { paxSafe: 27, paxTotal: 27, weatherCondition: 'Mild breeze', nextStop: 'Sarangkot' },
    acknowledged: true, priority: 'LOW'
  },
  // Day 1: Yesterday
  {
    id: 4, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(1, '16:00:00'), title: 'Phakding Teahouse Check-in',
    description: 'Lukla flight landed on schedule. Trek to Phakding completed smoothly. Trekkers acclimatizing comfortably.',
    metadata: { paxSafe: 6, paxTotal: 6, weatherCondition: 'Clear', nextStop: 'Namche Bazaar' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 5, type: 'STATUS_CHANGE', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(1, '07:15:00'), title: 'Tour Started: In Progress',
    description: 'Tour status changed from CONFIRMED to IN_PROGRESS. Domestic flight Tribhuvan Airport → Tenzing-Hillary Lukla completed.',
    metadata: { fromStatus: 'CONFIRMED', toStatus: 'IN_PROGRESS' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 6, type: 'SPOT_EXPENSE', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(1, '18:30:00'), title: 'Spot Expense: NPR 1,800',
    description: 'Boiled water refills & hydration supplies for client acclimatization at Phakding.',
    metadata: { amount: 1800, category: 'Food & Refreshments', paymentMethod: 'CASH' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 7, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 3, bookingCode: 'PNH-2026-003', clientName: 'Sarah Jenkins (UK)',
    timestamp: getRollingDate(1, '17:20:00'), title: 'Australian Camp Check-in',
    description: 'Poon Hill circuit group arrived at Australian Camp. Evening views of Annapurna South spectacular.',
    metadata: { paxSafe: 2, paxTotal: 2, weatherCondition: 'Clear skies', nextStop: 'Ghandruk' },
    acknowledged: true, priority: 'LOW'
  },
  // Day 2: 2 days ago
  {
    id: 8, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(2, '06:15:00'), title: 'Annapurna Base Camp Check-in',
    description: 'Reached ABC 4,130m for morning golden hour. 100% group members fit, oxygen saturation 88-92%.',
    metadata: { paxSafe: 6, paxTotal: 6, weatherCondition: 'Cold & Crisp', nextStop: 'Bamboo' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 9, type: 'VENDOR_SWAP', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(2, '14:20:00'), title: 'Lodge Swap Authorized',
    description: 'Swapped Sanctuary Teahouse → Snowland Lodge due to complimentary hot shower and heated dining room.',
    metadata: { originalVendor: 'Sanctuary Teahouse', newVendor: 'Snowland Lodge', serviceType: 'HOTEL', costDifference: 1500 },
    acknowledged: true, priority: 'MEDIUM'
  },
  {
    id: 10, type: 'SPOT_EXPENSE', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(2, '19:00:00'), title: 'Spot Expense: NPR 2,200',
    description: 'Dining hall fireplace heating fee and battery charging cards for clients.',
    metadata: { amount: 2200, category: 'Utilities', paymentMethod: 'CASH' },
    acknowledged: true, priority: 'LOW'
  },
  // Day 3: 3 days ago
  {
    id: 11, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(3, '15:40:00'), title: 'Machhapuchhre Base Camp Check-in',
    description: 'Arrived at MBC 3,700m. Cloud cover moving in. Trekkers instructed to stay hydrated.',
    metadata: { paxSafe: 6, paxTotal: 6, weatherCondition: 'Overcast & Foggy', nextStop: 'ABC' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 12, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 1, bookingCode: 'PNH-2026-001', clientName: 'St. Xavier School Group',
    timestamp: getRollingDate(3, '18:10:00'), title: 'Chitwan Resort Check-in',
    description: 'School safari group arrived at Sauraha, Chitwan. Evening Tharu cultural show attended safely.',
    metadata: { paxSafe: 27, paxTotal: 27, weatherCondition: 'Warm 28°C', nextStop: 'Jungle Walk' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 13, type: 'SPOT_EXPENSE', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(3, '12:00:00'), title: 'Spot Expense: NPR 3,000',
    description: 'Emergency porter assistance for trekker recovering from mild sprain.',
    metadata: { amount: 3000, category: 'Transport', paymentMethod: 'CASH' },
    acknowledged: true, priority: 'HIGH'
  },
  // Day 4: 4 days ago
  {
    id: 14, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(4, '16:30:00'), title: 'Deurali Ridge Check-in',
    description: 'Reached Deurali 3,200m before afternoon rainfall. Avalanche chute passage crossed safely under guide supervision.',
    metadata: { paxSafe: 6, paxTotal: 6, weatherCondition: 'Afternoon Rain', nextStop: 'MBC' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 15, type: 'VENDOR_SWAP', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(4, '13:00:00'), title: 'Lunch Restaurant Swap',
    description: 'Original tea shop closed. Swapped to Panorama View Kitchen. Same set menu pricing.',
    metadata: { originalVendor: 'Modi Khola Teahouse', newVendor: 'Panorama Kitchen', serviceType: 'RESTAURANT', costDifference: 0 },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 16, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 3, bookingCode: 'PNH-2026-003', clientName: 'Sarah Jenkins (UK)',
    timestamp: getRollingDate(4, '17:45:00'), title: 'Ghorepani Poon Hill Check-in',
    description: 'Checked into Ghorepani Hotel. Ready for early 4:30 AM sunrise hike to Poon Hill.',
    metadata: { paxSafe: 2, paxTotal: 2, weatherCondition: 'Clear skies', nextStop: 'Poon Hill Peak' },
    acknowledged: true, priority: 'LOW'
  },
  // Day 5: 5 days ago
  {
    id: 17, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(5, '15:15:00'), title: 'Himalaya Hotel Check-in',
    description: 'Ascent from Bamboo completed in 4 hours. Group pace steady, enjoying rhododendron forest section.',
    metadata: { paxSafe: 6, paxTotal: 6, weatherCondition: 'Sunny', nextStop: 'Deurali' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 18, type: 'SPOT_EXPENSE', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(5, '10:30:00'), title: 'Spot Expense: NPR 2,400',
    description: 'Heavy duty rain ponchos & waterproof pack covers purchased for group.',
    metadata: { amount: 2400, category: 'Gear', paymentMethod: 'CASH' },
    acknowledged: true, priority: 'LOW'
  },
  // Day 6: 6 days ago
  {
    id: 19, type: 'CHECK_IN', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(6, '16:50:00'), title: 'Chhomrong Village Check-in',
    description: 'Departed Jhinu Danda hot springs and ascended stone steps to Chhomrong. All 6 clients feeling strong.',
    metadata: { paxSafe: 6, paxTotal: 6, weatherCondition: 'Clear', nextStop: 'Bamboo' },
    acknowledged: true, priority: 'LOW'
  },
  {
    id: 20, type: 'STATUS_CHANGE', tourLeaderId: 4, tourLeaderName: 'Prakash Gurung',
    bookingId: 2, bookingCode: 'PNH-2026-002', clientName: 'Hans Mueller (Germany)',
    timestamp: getRollingDate(6, '09:00:00'), title: 'Kathmandu Departure Briefing',
    description: 'Comprehensive gear check and orientation delivered at Thamel office. Private vehicle departed on schedule.',
    metadata: { fromStatus: 'PROPOSED', toStatus: 'CONFIRMED' },
    acknowledged: true, priority: 'LOW'
  }
];

const FIELD_ACTIVITY_STORAGE_KEY = DB_KEYS.FIELD_ACTIVITIES || 'paila_cms_field_activities';

export function FieldActivityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [latestIncomingActivity, setLatestIncomingActivity] = useState<FieldActivity | null>(null);
  const [activities, setActivities] = useState<FieldActivity[]>(() => {
    try {
      const saved = localStorage.getItem(FIELD_ACTIVITY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check if parsed activities contain recent dates (within last 7 days)
          const now = Date.now();
          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
          const hasRecent = parsed.some(a => {
            const t = new Date(a.timestamp).getTime();
            return !isNaN(t) && (now - t) < sevenDaysMs;
          });
          if (hasRecent) return parsed;
        }
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

  const fetchFieldActivities = useCallback(async () => {
    try {
      const dbActivities = await apiClient.fieldActivities.getAll();
      if (Array.isArray(dbActivities) && dbActivities.length > 0) {
        setActivities(prev => {
          const prevIds = new Set(prev.map(a => a.id));
          const newlyAdded = dbActivities.find((a: FieldActivity) => !prevIds.has(a.id) && !a.acknowledged);
          if (newlyAdded && user?.role !== 'TOUR_OPERATOR') {
            sounds.notification();
            setLatestIncomingActivity(newlyAdded);
          }
          return dbActivities;
        });
      }
    } catch (err) {
      console.warn('Field activities sync fallback:', err);
    }
  }, [user?.role]);

  // Initial fetch and real-time polling every 2.5s
  useEffect(() => {
    fetchFieldActivities();

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
          } else if (data?.type === 'REFRESH_FIELD_ACTIVITIES') {
            fetchFieldActivities();
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

    // Live background polling every 20s for sync
    const pollInterval = setInterval(() => {
      fetchFieldActivities();
    }, 20000);

    // Establish persistent WebSocket connection for real-time field activities instantly
    let ws: WebSocket | null = null;
    let wsReconnectTimeout: any = null;

    const connectWS = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'NEW_FIELD_ACTIVITY' && data.activity) {
              const incoming: FieldActivity = data.activity;
              setActivities(prev => {
                if (prev.some(a => a.id === incoming.id)) return prev;
                return [incoming, ...prev];
              });
              if (user?.role !== 'TOUR_OPERATOR') {
                sounds.notification();
                setLatestIncomingActivity(incoming);
              }
            } else if (data.type === 'ACK_FIELD_ACTIVITY' && data.id) {
              setActivities(prev => prev.map(a => a.id === Number(data.id) ? { ...a, acknowledged: true } : a));
            }
          } catch (err) {
            console.warn('Error parsing FieldActivity WS message:', err);
          }
        };

        ws.onclose = () => {
          wsReconnectTimeout = setTimeout(connectWS, 4000);
        };

        ws.onerror = (err) => {
          console.warn('FieldActivity WS error, closing socket:', err);
          ws?.close();
        };
      } catch (err) {
        console.warn('Failed to connect FieldActivity WS:', err);
        wsReconnectTimeout = setTimeout(connectWS, 4000);
      }
    };

    connectWS();

    return () => {
      if (channel) channel.close();
      if (ws) {
        ws.close();
      }
      if (wsReconnectTimeout) {
        clearTimeout(wsReconnectTimeout);
      }
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('paila_field_activity_created' as any, handleCustomActivityEvent);
      clearInterval(pollInterval);
    };
  }, [fetchFieldActivities, user?.role]);

  const addActivity = async (activity: Omit<FieldActivity, 'id' | 'timestamp' | 'acknowledged'>): Promise<FieldActivity> => {
    let created: FieldActivity;
    try {
      created = await apiClient.fieldActivities.create({
        ...activity,
        acknowledged: false,
      });
    } catch {
      created = {
        ...activity,
        id: Date.now(),
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        acknowledged: false,
      };
    }

    setActivities(prev => [created, ...prev.filter(a => a.id !== created.id)]);

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('paila_realtime_field_activities');
        ch.postMessage({ type: 'NEW_FIELD_ACTIVITY', activity: created });
        setTimeout(() => ch.close(), 100);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('paila_field_activity_created', { detail: created }));
      }
    } catch {
      // ignore
    }

    return created;
  };

  const acknowledgeActivity = async (id: number): Promise<void> => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
    try {
      await apiClient.fieldActivities.acknowledge(id);
    } catch (err) {
      console.warn('Failed to acknowledge field activity on server:', err);
    }
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

  const refreshActivities = async () => {
    await fetchFieldActivities();
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
      refreshActivities,
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
