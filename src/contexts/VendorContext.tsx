import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Vendor } from '../types';
import { apiClient } from '../api/apiClient';

interface VendorContextType {
  vendors: Vendor[];
  isLoading: boolean;
  error: string | null;
  refreshVendors: () => Promise<void>;
  addVendor: (vendor: Omit<Vendor, 'id'>) => Promise<Vendor>;
  updateVendor: (id: number, updates: Partial<Vendor>) => Promise<Vendor>;
  deleteVendor: (id: number) => Promise<void>;
  getVendorById: (id: number) => Vendor | undefined;
}

const VendorContext = createContext<VendorContextType | undefined>(undefined);

export function VendorProvider({ children }: { children: ReactNode }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshVendors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.vendors.list();
      setVendors(data);
    } catch (err: any) {
      console.error('Failed to load vendors:', err);
      setError(err?.message || 'Failed to fetch vendors from database');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshVendors();
  }, [refreshVendors]);

  const addVendor = async (vendor: Omit<Vendor, 'id'>): Promise<Vendor> => {
    try {
      const created = await apiClient.vendors.create(vendor);
      setVendors(prev => [created, ...prev]);
      return created;
    } catch (err: any) {
      setError(err?.message || 'Failed to create vendor');
      throw err;
    }
  };

  const updateVendor = async (id: number, updates: Partial<Vendor>): Promise<Vendor> => {
    try {
      const updated = await apiClient.vendors.update(id, updates);
      setVendors(prev => prev.map(v => v.id === id ? updated : v));
      return updated;
    } catch (err: any) {
      setError(err?.message || 'Failed to update vendor');
      throw err;
    }
  };

  const deleteVendor = async (id: number): Promise<void> => {
    try {
      await apiClient.vendors.delete(id);
      setVendors(prev => prev.filter(v => v.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete vendor');
      throw err;
    }
  };

  const getVendorById = (id: number) => {
    return vendors.find(v => v.id === id);
  };

  return (
    <VendorContext.Provider
      value={{
        vendors,
        isLoading,
        error,
        refreshVendors,
        addVendor,
        updateVendor,
        deleteVendor,
        getVendorById
      }}
    >
      {children}
    </VendorContext.Provider>
  );
}

export function useVendors() {
  const context = useContext(VendorContext);
  if (!context) {
    throw new Error('useVendors must be used within a VendorProvider');
  }
  return context;
}
