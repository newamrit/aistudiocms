import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Activity, ActivityCategory, ActivityType } from '../types';

interface ActivityContextType {
  activities: Activity[];
  logActivity: (activity: Omit<Activity, 'id' | 'timestamp'> & { timestamp?: string }) => void;
  clearActivities: () => void;
  getActivitiesByCategory: (category: ActivityCategory) => Activity[];
  unreadCount?: number;
}

const STORAGE_KEY = 'paila_nepal_recent_activities';

const initialSeedActivities: Activity[] = [
  {
    id: 'act-1',
    type: 'USER_LOGIN',
    category: 'LOGIN',
    title: 'Super Admin Login',
    description: 'Amrit Timilsina authenticated successfully from Kathmandu Operations HQ.',
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    actor: {
      name: 'Amrit Timilsina',
      email: 'admin@pailanepal.com',
      role: 'SUPER_ADMIN',
    },
    metadata: {
      ipAddress: '103.10.28.45 (Kathmandu, NP)',
      details: 'Chrome on macOS • Session started',
    },
  },
  {
    id: 'act-2',
    type: 'BOOKING_STATUS_CHANGE',
    category: 'BOOKING',
    title: 'Booking Confirmed',
    description: 'Booking PNH-2026-002 (Hans Mueller - Annapurna Circuit) confirmed with 50% advance deposit.',
    timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    actor: {
      name: 'Bikash Sharma',
      email: 'operations@pailanepal.com',
      role: 'OPERATIONS',
    },
    metadata: {
      bookingId: 2,
      bookingCode: 'PNH-2026-002',
      clientName: 'Hans Mueller',
      oldStatus: 'PROPOSED',
      newStatus: 'CONFIRMED',
      amount: 450000,
      currency: 'NPR',
    },
  },
  {
    id: 'act-3',
    type: 'VENDOR_PAYMENT',
    category: 'PAYMENT',
    title: 'Vendor Disbursement Released',
    description: 'Disbursed NPR 45,000 to Annapurna Mountain Lodge (Hotel Allocation #102).',
    timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    actor: {
      name: 'Sita Dahal',
      email: 'finance@pailanepal.com',
      role: 'SUPER_ADMIN',
    },
    metadata: {
      vendorName: 'Annapurna Mountain Lodge',
      amount: 45000,
      currency: 'NPR',
      paymentMode: 'BANK_TRANSFER',
      bookingCode: 'PNH-2026-002',
      details: 'Ref: NBL-TRF-9821340',
    },
  },
  {
    id: 'act-4',
    type: 'FIELD_CHECKPOINT',
    category: 'OPERATIONS',
    title: 'Tour Checkpoint Completed',
    description: 'Prakash Gurung marked Day 3 checkpoint: "Ghorepani Poon Hill Ascent (3,210m)" - 100% pax reported healthy.',
    timestamp: new Date(Date.now() - 130 * 60 * 1000).toISOString(),
    actor: {
      name: 'Prakash Gurung',
      email: 'prakash@pailanepal.com',
      role: 'TOUR_OPERATOR',
    },
    metadata: {
      bookingCode: 'PNH-2026-002',
      location: 'Poon Hill Viewpoint (3,210m)',
      details: 'Weather: Clear Sky, -2°C • 6/6 Pax Verified',
    },
  },
  {
    id: 'act-5',
    type: 'CLIENT_PAYMENT',
    category: 'PAYMENT',
    title: 'Advance Payment Received',
    description: 'Received NPR 150,000 advance payment from St. Xavier\'s College for Pokhara Educational Tour.',
    timestamp: new Date(Date.now() - 210 * 60 * 1000).toISOString(),
    actor: {
      name: 'Ramesh Karki',
      email: 'sales@pailanepal.com',
      role: 'SALES',
    },
    metadata: {
      bookingId: 1,
      bookingCode: 'PNH-2026-001',
      clientName: 'St. Xavier\'s College',
      amount: 150000,
      currency: 'NPR',
      paymentMode: 'CHEQUE',
    },
  },
  {
    id: 'act-6',
    type: 'FIELD_ALERT',
    category: 'ALERT',
    title: 'Field Safety Alert Logged',
    description: 'High Altitude AMS monitoring logged for client in Group B at Deurali halt.',
    timestamp: new Date(Date.now() - 340 * 60 * 1000).toISOString(),
    actor: {
      name: 'Prakash Gurung',
      role: 'TOUR_OPERATOR',
    },
    metadata: {
      bookingCode: 'PNH-2026-002',
      location: 'Deurali (3,200m)',
      details: 'Administered Diamox • Stabilized',
    },
  },
  {
    id: 'act-7',
    type: 'USER_LOGIN',
    category: 'LOGIN',
    title: 'Tour Leader Portal Access',
    description: 'Sunil Shrestha logged in via Mobile PWA from Chitwan National Park Buffer Zone.',
    timestamp: new Date(Date.now() - 480 * 60 * 1000).toISOString(),
    actor: {
      name: 'Sunil Shrestha',
      email: 'sunil@pailanepal.com',
      role: 'TOUR_OPERATOR',
    },
    metadata: {
      ipAddress: '27.34.40.12 (Chitwan, NP)',
      details: 'PWA Standalone Mode • Offline sync enabled',
    },
  },
  {
    id: 'act-8',
    type: 'BOOKING_CREATED',
    category: 'BOOKING',
    title: 'New Booking Proposal Drafted',
    description: 'Drafted 4-day Corporate Retreat proposal for Nabil Bank Ltd (25 pax).',
    timestamp: new Date(Date.now() - 600 * 60 * 1000).toISOString(),
    actor: {
      name: 'Ramesh Karki',
      email: 'sales@pailanepal.com',
      role: 'SALES',
    },
    metadata: {
      bookingCode: 'PNH-2026-004',
      clientName: 'Nabil Bank Ltd',
      amount: 380000,
      currency: 'NPR',
    },
  }
];

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>(() => {
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
    return initialSeedActivities;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
    } catch {
      // ignore
    }
  }, [activities]);

  const logActivity = (newActivityData: Omit<Activity, 'id' | 'timestamp'> & { timestamp?: string }) => {
    const id = `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newEntry: Activity = {
      ...newActivityData,
      id,
      timestamp: newActivityData.timestamp || new Date().toISOString(),
    };

    setActivities(prev => [newEntry, ...prev.slice(0, 99)]); // Keep last 100 activities
  };

  const clearActivities = () => {
    setActivities(initialSeedActivities);
  };

  const getActivitiesByCategory = (category: ActivityCategory) => {
    return activities.filter(a => a.category === category);
  };

  return (
    <ActivityContext.Provider
      value={{
        activities,
        logActivity,
        clearActivities,
        getActivitiesByCategory,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivities() {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivities must be used within an ActivityProvider');
  }
  return context;
}
