import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CompanySettings } from '../types';
import { apiClient } from '../api/apiClient';

export const defaultCompanySettings: CompanySettings = {
  companyName: 'Paila Nepal Holidays Pvt. Ltd.',
  address: 'Thamel, Ward 26, Kathmandu, Nepal',
  phone: '+977-1-4123456',
  domain: 'pailanepal.com',
  panNumber: '601234567',
  vatNumber: '301234567',
  email: 'info@pailanepal.com',
  tagline: 'Trekking • Mountaineering • Institutional Excursions',
  emergencyPhone: '+977-9801234567',
  registrationNumber: '129481/070/071',
};

interface CompanySettingsContextType {
  settings: CompanySettings;
  updateSettings: (newSettings: Partial<CompanySettings>) => void;
  resetSettings: () => void;
  getCleanDomain: () => string;
}

const SETTINGS_STORAGE_KEY = 'paila_cms_company_settings';

const CompanySettingsContext = createContext<CompanySettingsContextType | undefined>(undefined);

export function CompanySettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...defaultCompanySettings,
          ...parsed,
        };
      }
    } catch {
      // Fallback
    }
    return defaultCompanySettings;
  });

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore
    }
  }, [settings]);

  // Sync settings with MySQL database via API
  useEffect(() => {
    apiClient.settings.get().then(dbSettings => {
      if (dbSettings && dbSettings.companyName) {
        setSettings(prev => ({
          ...prev,
          ...dbSettings,
          companyName: dbSettings.companyName || prev.companyName || defaultCompanySettings.companyName,
        }));
      }
    }).catch(err => {
      console.warn('Failed to load company settings from DB:', err);
    });
  }, []);

  const updateSettings = (newSettings: Partial<CompanySettings>) => {
    setSettings(prev => {
      const merged = { ...prev, ...newSettings };
      apiClient.settings.update(merged).catch(err => {
        console.warn('Failed to persist settings to MySQL:', err);
      });
      return merged;
    });
  };

  const resetSettings = () => {
    setSettings(defaultCompanySettings);
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const getCleanDomain = () => {
    return (settings?.domain || 'pailanepal.com').replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  };

  return (
    <CompanySettingsContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
        getCleanDomain,
      }}
    >
      {children}
    </CompanySettingsContext.Provider>
  );
}

export function useCompanySettings() {
  const context = useContext(CompanySettingsContext);
  if (!context) {
    throw new Error('useCompanySettings must be used within a CompanySettingsProvider');
  }
  return context;
}
