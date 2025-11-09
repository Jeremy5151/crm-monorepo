'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiGet } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'AFFILIATE' | 'AFFILIATE_MASTER' | 'ADMIN' | 'SUPERADMIN';
  isActive: boolean;
  apiKey: string;
  timezone: string;
  language: string;
  // Права доступа
  canViewBrokers: boolean;
  canViewBoxes: boolean;
  canViewUsers: boolean;
  canViewFullEmail: boolean;
  canViewFullPhone: boolean;
  canResendLeads: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Получаем информацию о текущем пользователе через API ключ
      const userData = await apiGet('/v1/auth/me');
      setUser(userData);
    } catch (err: any) {
      if (typeof window !== 'undefined' && err && err.status === 401) {
        // API ключ невалиден: очищаем локальное состояние и токены
        localStorage.removeItem('apiToken');
        localStorage.removeItem('user');
        setUser(null);
        setError(null);
      } else {
        console.error('Ошибка загрузки пользователя:', err);
        setError(err?.message || 'Ошибка загрузки пользователя');
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
    
    // Also reload when localStorage changes (login/logout)
    const handleStorageChange = () => {
      refreshUser();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, error, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
