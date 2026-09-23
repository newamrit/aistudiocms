import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { OperationAllocation, VendorPayment } from '../types';
import { apiClient } from '../api/apiClient';

interface OperationsContextType {
  allocations: OperationAllocation[];
  vendorPayments: VendorPayment[];
  isLoading: boolean;
  error: string | null;
  refreshOperations: () => Promise<void>;
  addAllocation: (allocation: Omit<OperationAllocation, 'id' | 'amountPaid' | 'paymentStatus'>) => Promise<OperationAllocation>;
  updateAllocation: (id: number, updates: Partial<OperationAllocation>) => Promise<OperationAllocation>;
  deleteAllocation: (id: number) => Promise<void>;
  recordVendorPayment: (payment: Omit<VendorPayment, 'id' | 'paidAt'>) => Promise<{ payment: VendorPayment; allocation: OperationAllocation }>;
  getAllocationsByBookingId: (bookingId: number) => OperationAllocation[];
}

const OperationsContext = createContext<OperationsContextType | undefined>(undefined);

export function OperationsProvider({ children }: { children: ReactNode }) {
  const [allocations, setAllocations] = useState<OperationAllocation[]>([]);
  const [vendorPayments, setVendorPayments] = useState<VendorPayment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshOperations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [allocData, paymentData] = await Promise.all([
        apiClient.operations.listAllocations(),
        apiClient.operations.listPayments()
      ]);
      setAllocations(allocData);
      setVendorPayments(paymentData);
    } catch (err: any) {
      console.error('Failed to load operational allocations and payments:', err);
      setError(err?.message || 'Failed to load operations data from database');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshOperations();
  }, [refreshOperations]);

  const addAllocation = async (allocation: Omit<OperationAllocation, 'id' | 'amountPaid' | 'paymentStatus'>): Promise<OperationAllocation> => {
    try {
      const created = await apiClient.operations.createAllocation(allocation);
      setAllocations(prev => [created, ...prev]);
      return created;
    } catch (err: any) {
      setError(err?.message || 'Failed to create allocation');
      throw err;
    }
  };

  const updateAllocation = async (id: number, updates: Partial<OperationAllocation>): Promise<OperationAllocation> => {
    try {
      const updated = await apiClient.operations.updateAllocation(id, updates);
      setAllocations(prev => prev.map(a => a.id === id ? updated : a));
      return updated;
    } catch (err: any) {
      setError(err?.message || 'Failed to update allocation');
      throw err;
    }
  };

  const deleteAllocation = async (id: number): Promise<void> => {
    try {
      await apiClient.operations.deleteAllocation(id);
      setAllocations(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete allocation');
      throw err;
    }
  };

  const recordVendorPayment = async (payment: Omit<VendorPayment, 'id' | 'paidAt'>): Promise<{ payment: VendorPayment; allocation: OperationAllocation }> => {
    try {
      const res = await apiClient.operations.recordPayment(payment);
      setVendorPayments(prev => [res.payment, ...prev]);
      setAllocations(prev => prev.map(a => a.id === res.allocation.id ? res.allocation : a));
      return res;
    } catch (err: any) {
      setError(err?.message || 'Failed to record vendor payment');
      throw err;
    }
  };

  const getAllocationsByBookingId = (bookingId: number) => {
    return allocations.filter(a => a.bookingId === bookingId);
  };

  return (
    <OperationsContext.Provider
      value={{
        allocations,
        vendorPayments,
        isLoading,
        error,
        refreshOperations,
        addAllocation,
        updateAllocation,
        deleteAllocation,
        recordVendorPayment,
        getAllocationsByBookingId
      }}
    >
      {children}
    </OperationsContext.Provider>
  );
}

export function useOperations() {
  const context = useContext(OperationsContext);
  if (!context) {
    throw new Error('useOperations must be used within an OperationsProvider');
  }
  return context;
}
