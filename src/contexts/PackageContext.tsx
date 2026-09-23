import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Package } from '../types';
import { apiClient, DB_KEYS } from '../api/apiClient';

interface PackageContextType {
  packages: Package[];
  isLoading: boolean;
  error: string | null;
  refreshPackages: () => Promise<void>;
  addPackage: (pkg: Omit<Package, 'id'>) => Promise<Package>;
  updatePackage: (id: number, updates: Partial<Package>) => Promise<Package>;
  deletePackage: (id: number) => Promise<void>;
  getPackageById: (id: number) => Package | undefined;
}

const PackageContext = createContext<PackageContextType | undefined>(undefined);

export function PackageProvider({ children }: { children: ReactNode }) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshPackages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.packages.list();
      setPackages(data);
    } catch (err: any) {
      console.error('Failed to load packages:', err);
      setError(err?.message || 'Failed to fetch packages from database');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPackages();
  }, [refreshPackages]);

  const addPackage = async (pkg: Omit<Package, 'id'>): Promise<Package> => {
    try {
      const created = await apiClient.packages.create(pkg);
      setPackages(prev => [created, ...prev]);
      return created;
    } catch (err: any) {
      setError(err?.message || 'Failed to create package');
      throw err;
    }
  };

  const updatePackage = async (id: number, updates: Partial<Package>): Promise<Package> => {
    try {
      const updated = await apiClient.packages.update(id, updates);
      setPackages(prev => prev.map(p => p.id === id ? updated : p));
      return updated;
    } catch (err: any) {
      setError(err?.message || 'Failed to update package');
      throw err;
    }
  };

  const deletePackage = async (id: number): Promise<void> => {
    try {
      await apiClient.packages.delete(id);
      setPackages(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete package');
      throw err;
    }
  };

  const getPackageById = (id: number) => {
    return packages.find(p => p.id === id);
  };

  return (
    <PackageContext.Provider
      value={{
        packages,
        isLoading,
        error,
        refreshPackages,
        addPackage,
        updatePackage,
        deletePackage,
        getPackageById
      }}
    >
      {children}
    </PackageContext.Provider>
  );
}

export function usePackages() {
  const context = useContext(PackageContext);
  if (!context) {
    throw new Error('usePackages must be used within a PackageProvider');
  }
  return context;
}
