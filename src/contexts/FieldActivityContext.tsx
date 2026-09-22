import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  addActivity: (activity: Omit<FieldActivity, 'id' | 'timestamp' | 'acknowledged'>) => void;
  acknowledgeActivity: (id: number) => void;
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

export function FieldActivityProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<FieldActivity[]>(seedActivities);

  const addActivity = (activity: Omit<FieldActivity, 'id' | 'timestamp' | 'acknowledged'>) => {
    const newActivity: FieldActivity = {
      ...activity,
      id: Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      acknowledged: false,
    };
    setActivities(prev => [newActivity, ...prev]);
  };

  const acknowledgeActivity = (id: number) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
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
      addActivity,
      acknowledgeActivity,
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
