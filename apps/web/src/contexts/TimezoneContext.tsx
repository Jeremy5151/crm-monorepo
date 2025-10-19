'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiGet } from '@/lib/api';

interface TimezoneContextType {
  timezone: string;
  isLoading: boolean;
  refreshTimezone: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezone] = useState('UTC');
  const [isLoading, setIsLoading] = useState(true);

  const refreshTimezone = async () => {
    try {
      const settings = await apiGet('/v1/settings');
      setTimezone(settings.timezone || 'UTC');
    } catch (error) {
      console.error('Ошибка загрузки часового пояса:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const forceRefresh = async () => {
    setIsLoading(true);
    await refreshTimezone();
  };

  useEffect(() => {
    refreshTimezone();
    
    // Обновляем настройки каждые 30 секунд
    const interval = setInterval(refreshTimezone, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <TimezoneContext.Provider value={{ timezone, isLoading, refreshTimezone, forceRefresh }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
}
