import { createContext, useContext, useState, ReactNode } from 'react';
import { bookings as initialBookings } from '../data/mockData';
import { Booking } from '../types';
import { useActivities } from './ActivityContext';

interface BookingContextType {
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, 'id' | 'bookingCode'>) => void;
  updateBooking: (id: number, updates: Partial<Booking>) => void;
  deleteBooking: (id: number) => void;
  getBookingById: (id: number) => Booking | undefined;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const { logActivity } = useActivities();

  const generateBookingCode = () => {
    const year = new Date().getFullYear();
    const count = bookings.length + 1;
    return `PNH-${year}-${String(count).padStart(3, '0')}`;
  };

  const addBooking = (booking: Omit<Booking, 'id' | 'bookingCode'>) => {
    const newCode = generateBookingCode();
    const newId = Math.max(...bookings.map(b => b.id), 0) + 1;
    const newBooking: Booking = {
      ...booking,
      id: newId,
      bookingCode: newCode,
    };
    setBookings(prev => [newBooking, ...prev]);

    logActivity({
      type: 'BOOKING_CREATED',
      category: 'BOOKING',
      title: `New Booking Created: ${newBooking.clientName}`,
      description: `Created booking ${newCode} for ${newBooking.packageName || 'Custom Package'} (${newBooking.paxCount} pax).`,
      actor: {
        name: newBooking.createdByName || 'Staff Member',
        role: 'SALES',
      },
      metadata: {
        bookingId: newId,
        bookingCode: newCode,
        clientName: newBooking.clientName,
        amount: newBooking.totalAgreedAmount,
        currency: 'NPR',
      },
    });
  };

  const updateBooking = (id: number, updates: Partial<Booking>) => {
    const existing = bookings.find(b => b.id === id);
    setBookings(prev =>
      prev.map(booking =>
        booking.id === id ? { ...booking, ...updates } : booking
      )
    );

    if (existing && updates.status && updates.status !== existing.status) {
      logActivity({
        type: 'BOOKING_STATUS_CHANGE',
        category: 'BOOKING',
        title: `Booking Status Changed: ${existing.bookingCode}`,
        description: `Status changed from ${existing.status.replace('_', ' ')} to ${updates.status.replace('_', ' ')} for ${existing.clientName}.`,
        actor: {
          name: 'Operations Team',
          role: 'OPERATIONS',
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
  };

  const deleteBooking = (id: number) => {
    setBookings(prev => prev.filter(booking => booking.id !== id));
  };

  const getBookingById = (id: number) => {
    return bookings.find(booking => booking.id === id);
  };

  return (
    <BookingContext.Provider
      value={{
        bookings,
        addBooking,
        updateBooking,
        deleteBooking,
        getBookingById,
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
