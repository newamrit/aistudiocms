import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Booking, BookingStatus, BookingStatusHistoryEntry } from '../types';
import { useActivities } from './ActivityContext';
import { apiClient } from '../api/apiClient';

export const BOOKINGS_STORAGE_KEY = 'paila_cms_bookings';

interface BookingContextType {
  bookings: Booking[];
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  addBooking: (booking: Omit<Booking, 'id' | 'bookingCode'>) => Promise<Booking>;
  updateBooking: (id: number, updates: Partial<Booking>, actor?: { name: string; role: string; email?: string }) => Promise<void>;
  changeBookingStatus: (
    id: number, 
    newStatus: BookingStatus, 
    options?: { 
      reason?: string; 
      notes?: string; 
      actor?: { name: string; role: string; email?: string } 
    }
  ) => Promise<void>;
  bulkUpdateStatus: (ids: number[], newStatus: BookingStatus, actorName?: string, actorRole?: string) => Promise<void>;
  deleteBooking: (id: number) => Promise<void>;
  bulkDeleteBookings: (ids: number[]) => Promise<void>;
  getBookingById: (id: number) => Booking | undefined;
  setAllBookings: (newBookings: Booking[]) => void;
  refreshBookings: () => Promise<void>;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const stored = localStorage.getItem(BOOKINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return [];
  });

  // Reference to always access current state synchronously in async callbacks
  const bookingsRef = useRef<Booking[]>(bookings);
  useEffect(() => {
    bookingsRef.current = bookings;
  }, [bookings]);

  const { logActivity } = useActivities();

  // Hydrate from live MySQL database
  const refreshBookings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dbBookings = await apiClient.bookings.list();
      if (Array.isArray(dbBookings)) {
        setBookings(dbBookings);
      }
    } catch (err: any) {
      console.warn('Failed to load bookings from database:', err);
      setError(err?.message || 'Database connection offline');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshBookings();
  }, []);

  // Save bookings to localStorage whenever changed
  useEffect(() => {
    try {
      if (bookings && bookings.length > 0) {
        localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
      }
    } catch {
      // Ignore
    }
  }, [bookings]);

  // Real-time synchronization across browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === BOOKINGS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setBookings(parsed);
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setAllBookings = (newBookings: Booking[]) => {
    setBookings(newBookings);
    try {
      localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(newBookings));
    } catch {
      // Ignore
    }
  };

  // ---------------------------------------------------------------------------
  // OPTIMISTIC ADD BOOKING
  // ---------------------------------------------------------------------------
  const addBooking = async (bookingData: Omit<Booking, 'id' | 'bookingCode'>): Promise<Booking> => {
    setIsSyncing(true);
    try {
      const created = await apiClient.bookings.create(bookingData);
      
      setBookings(prev => {
        const next = [created, ...prev.filter(b => b.id !== created.id)];
        try {
          localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });

      logActivity({
        type: 'BOOKING_CREATED',
        category: 'BOOKING',
        title: `New Booking Created: ${created.clientName}`,
        description: `Created booking ${created.bookingCode} for ${created.packageName || 'Custom Package'} (${created.paxCount} pax).`,
        actor: {
          name: created.createdByName || 'Staff Member',
          role: 'SALES',
        },
        metadata: {
          bookingId: created.id,
          bookingCode: created.bookingCode,
          clientName: created.clientName,
          amount: created.totalAgreedAmount,
          currency: 'NPR',
        },
      });

      return created;
    } catch (err: any) {
      console.error('[BookingContext] Database booking save error:', err);
      setError(err?.message || 'Failed to save booking to database.');
      throw new Error(err?.message || 'Failed to save booking to database.');
    } finally {
      setIsSyncing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // OPTIMISTIC UPDATE BOOKING
  // ---------------------------------------------------------------------------
  const updateBooking = async (
    id: number, 
    updates: Partial<Booking>, 
    actor?: { name: string; role: string; email?: string }
  ): Promise<void> => {
    const previousSnapshot = [...bookingsRef.current];
    const existing = previousSnapshot.find(b => b.id === id);
    if (!existing) return;

    const nowIso = new Date().toISOString();
    let updatedHistory = existing.statusHistory ? [...existing.statusHistory] : [];
    
    if (updates.status && updates.status !== existing.status) {
      const newEntry: BookingStatusHistoryEntry = {
        id: `sh-${id}-${Date.now()}`,
        bookingId: id,
        bookingCode: existing.bookingCode,
        fromStatus: existing.status,
        toStatus: updates.status,
        changedAt: nowIso,
        changedBy: {
          name: actor?.name || 'Administrator',
          role: actor?.role || 'SUPER_ADMIN',
          email: actor?.email,
        },
        reason: `Status changed from ${existing.status.replace('_', ' ')} to ${updates.status.replace('_', ' ')}`,
        source: 'ADMIN_PORTAL'
      };
      updatedHistory.push(newEntry);
    }

    const optimisticRecord: Booking = {
      ...existing,
      ...updates,
      statusHistory: updatedHistory,
    };

    // 1. Instantly update state & commit to localStorage
    setBookings(prev => {
      const next = prev.map(b => b.id === id ? optimisticRecord : b);
      try {
        localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (updates.status && updates.status !== existing.status) {
      logActivity({
        type: 'BOOKING_STATUS_CHANGE',
        category: 'BOOKING',
        title: `Booking Status Changed: ${existing.bookingCode}`,
        description: `Status changed from ${existing.status.replace('_', ' ')} to ${updates.status.replace('_', ' ')} for ${existing.clientName}.`,
        actor: {
          name: actor?.name || 'Operations Team',
          role: (actor?.role || 'OPERATIONS') as any,
          email: actor?.email,
        },
        metadata: {
          bookingId: id,
          bookingCode: existing.bookingCode,
          clientName: existing.clientName,
          oldStatus: existing.status,
          newStatus: updates.status,
          amount: existing.totalAgreedAmount,
        },
      });
    }

    // 2. Persist to API & database
    setIsSyncing(true);
    try {
      await apiClient.bookings.update(id, updates);
    } catch (err: any) {
      console.warn(`[BookingContext] Syncing booking #${id} with server:`, err);
    } finally {
      setIsSyncing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // OPTIMISTIC CHANGE BOOKING STATUS
  // ---------------------------------------------------------------------------
  const changeBookingStatus = async (
    id: number,
    newStatus: BookingStatus,
    options?: {
      reason?: string;
      notes?: string;
      actor?: { name: string; role: string; email?: string };
    }
  ): Promise<void> => {
    const previousSnapshot = [...bookingsRef.current];
    const existing = previousSnapshot.find(b => b.id === id);
    if (!existing || existing.status === newStatus) return;

    const nowIso = new Date().toISOString();
    const actorName = options?.actor?.name || 'Administrator';
    const actorRole = options?.actor?.role || 'SUPER_ADMIN';

    const historyEntry: BookingStatusHistoryEntry = {
      id: `sh-${id}-${Date.now()}`,
      bookingId: id,
      bookingCode: existing.bookingCode,
      fromStatus: existing.status,
      toStatus: newStatus,
      changedAt: nowIso,
      changedBy: {
        name: actorName,
        role: actorRole,
        email: options?.actor?.email,
      },
      reason: options?.reason || `Status updated to ${newStatus.replace('_', ' ')}`,
      notes: options?.notes,
      source: 'ADMIN_PORTAL',
    };

    // 1. Immediately reflect status badge & history in state & localStorage
    setBookings(prev => {
      const next = prev.map(booking => {
        if (booking.id !== id) return booking;
        const currentHistory = booking.statusHistory || [];
        return {
          ...booking,
          status: newStatus,
          statusHistory: [...currentHistory, historyEntry],
        };
      });
      try {
        localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    logActivity({
      type: 'BOOKING_STATUS_CHANGE',
      category: 'BOOKING',
      title: `Status: ${existing.bookingCode} ➔ ${newStatus.replace('_', ' ')}`,
      description: `${actorName} updated status of ${existing.clientName} to ${newStatus.replace('_', ' ')}. ${options?.reason ? `("${options.reason}")` : ''}`,
      actor: {
        name: actorName,
        role: actorRole as any,
        email: options?.actor?.email,
      },
      metadata: {
        bookingId: id,
        bookingCode: existing.bookingCode,
        clientName: existing.clientName,
        oldStatus: existing.status,
        newStatus,
      },
    });

    // 2. Persist status change to database
    setIsSyncing(true);
    try {
      await apiClient.bookings.updateStatus(id, newStatus, options);
    } catch (err: any) {
      console.warn(`[BookingContext] Status sync warning for #${id}:`, err);
    } finally {
      setIsSyncing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // OPTIMISTIC BULK UPDATE STATUS
  // ---------------------------------------------------------------------------
  const bulkUpdateStatus = async (
    ids: number[], 
    newStatus: BookingStatus, 
    actorName: string = 'Administrator', 
    actorRole: string = 'SUPER_ADMIN'
  ): Promise<void> => {
    if (!ids || ids.length === 0) return;
    const nowIso = new Date().toISOString();

    // 1. Optimistic Update: Bulk update all targeted records in one atomic pass
    setBookings(prev => {
      const next = prev.map(booking => {
        if (!ids.includes(booking.id) || booking.status === newStatus) return booking;
        const historyEntry: BookingStatusHistoryEntry = {
          id: `sh-${booking.id}-${Date.now()}`,
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
          fromStatus: booking.status,
          toStatus: newStatus,
          changedAt: nowIso,
          changedBy: { name: actorName, role: actorRole },
          reason: 'Bulk status update performed.',
          source: 'ADMIN_PORTAL',
        };
        return {
          ...booking,
          status: newStatus,
          statusHistory: [...(booking.statusHistory || []), historyEntry],
        };
      });
      try {
        localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. Background Sync: Sync all in parallel
    setIsSyncing(true);
    try {
      await Promise.allSettled(
        ids.map(id =>
          apiClient.bookings.updateStatus(id, newStatus, {
            reason: 'Bulk status update performed.',
            actor: { name: actorName, role: actorRole }
          })
        )
      );
    } catch (err: any) {
      console.warn('[Bulk Status Update] Sync warning:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // OPTIMISTIC DELETE BOOKING
  // ---------------------------------------------------------------------------
  const deleteBooking = async (id: number): Promise<void> => {
    // 1. Optimistic Update: Immediately remove booking from state and localStorage
    setBookings(prev => {
      const next = prev.filter(b => b.id !== id);
      try {
        localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. Background Sync: Delete on server/database
    setIsSyncing(true);
    try {
      await apiClient.bookings.delete(id);
    } catch (err: any) {
      console.warn(`[BookingContext] Delete warning for booking #${id}:`, err);
    } finally {
      setIsSyncing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // OPTIMISTIC BULK DELETE BOOKINGS
  // ---------------------------------------------------------------------------
  const bulkDeleteBookings = async (ids: number[]): Promise<void> => {
    if (!ids || ids.length === 0) return;

    // 1. Optimistic Update: Immediately remove all selected items
    setBookings(prev => {
      const next = prev.filter(b => !ids.includes(b.id));
      try {
        localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. Background Sync: Execute deletes on server
    setIsSyncing(true);
    try {
      await Promise.allSettled(ids.map(id => apiClient.bookings.delete(id)));
    } catch (err: any) {
      console.warn('[Bulk Delete] Server warning:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const getBookingById = (id: number) => {
    return bookings.find(b => b.id === id);
  };

  return (
    <BookingContext.Provider
      value={{
        bookings,
        isLoading,
        isSyncing,
        error,
        addBooking,
        updateBooking,
        changeBookingStatus,
        bulkUpdateStatus,
        deleteBooking,
        bulkDeleteBookings,
        getBookingById,
        setAllBookings,
        refreshBookings,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBookings() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBookings must be used within a BookingProvider');
  }
  return context;
}

