'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SendProgress {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  status: 'pending' | 'sending' | 'success' | 'error' | 'waiting' | 'skipped';
  message: string;
  timestamp: Date;
  nextAction?: Date;
  intervalMinutes?: number;
}

interface StatusBarContextType {
  isVisible: boolean;
  progress: SendProgress[];
  showStatusBar: (progress: SendProgress[]) => void;
  hideStatusBar: () => void;
  updateProgress: (id: string, updates: Partial<SendProgress>) => void;
  addProgress: (progress: SendProgress) => void;
  cancelSending: (leadId: string) => void;
  removeProgress: (id: string) => void;
  cancelAllSending: () => void;
  clearQueue: () => void;
  pendingCancellations: Set<string>;
}

const StatusBarContext = createContext<StatusBarContextType | undefined>(undefined);

export function StatusBarProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState<SendProgress[]>([]);
  const [pendingCancellations, setPendingCancellations] = useState<Set<string>>(new Set());

  useEffect(() => {
    const savedProgress = localStorage.getItem('statusBarProgress');
    const savedVisibility = localStorage.getItem('statusBarVisible');
    
    if (savedProgress) {
      try {
        const parsedProgress = JSON.parse(savedProgress).map((p: any) => ({
          ...p,
          timestamp: new Date(p.timestamp),
          nextAction: p.nextAction ? new Date(p.nextAction) : undefined,
        }));
        setProgress(parsedProgress);
      } catch (error) {
        console.error('Ошибка при загрузке сохраненного прогресса:', error);
      }
    }
    
    if (savedVisibility === 'true') {
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('statusBarProgress', JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    localStorage.setItem('statusBarVisible', isVisible.toString());
  }, [isVisible]);

  useEffect(() => {
    const syncWithServer = async () => {
      try {
        const response = await fetch('/api/queue');
        if (response.ok) {
          const serverQueue = await response.json();
          
          const newProgress = serverQueue.map((serverItem: any) => ({
            id: `progress-${serverItem.id}`,
            leadId: serverItem.id,
            leadName: serverItem.name,
            leadEmail: serverItem.email,
            status: serverItem.status,
            message: serverItem.message,
            timestamp: new Date(serverItem.timestamp),
            nextAction: serverItem.nextAction ? new Date(serverItem.nextAction) : undefined,
          }));
          
          setProgress(newProgress);
          
          if (newProgress.length > 0) {
            setIsVisible(true);
          } else {
            setIsVisible(false);
          }
        }
      } catch (error) {
        console.error('Ошибка синхронизации с сервером:', error);
      }
    };

    const interval = setInterval(syncWithServer, 1000);
    syncWithServer();

    return () => clearInterval(interval);
  }, []);

  const showStatusBar = (initialProgress: SendProgress[]) => {
    setProgress(prev => {
      const existingIds = new Set(prev.map(p => p.leadId));
      const newProgress = initialProgress.filter(p => !existingIds.has(p.leadId));
      return [...prev, ...newProgress];
    });
    setIsVisible(true);
  };

  const hideStatusBar = () => {
    setIsVisible(false);
    setProgress([]);
  };

  const updateProgress = (id: string, updates: Partial<SendProgress>) => {
    setProgress(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const addProgress = (newProgress: SendProgress) => {
    setProgress(prev => [...prev, newProgress]);
  };

  const cancelSending = async (leadId: string) => {
    try {
      await fetch('/api/cancel-sending', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadId }),
      });
    } catch (error) {
      console.error('Ошибка при отмене отправки:', error);
    }
  };

  const removeProgress = async (id: string) => {
    const item = progress.find(p => p.id === id);
    if (item && (item.status === 'success' || item.status === 'error' || item.status === 'skipped')) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/v1/leads/remove-completed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || '',
          },
          body: JSON.stringify({ leadId: item.leadId }),
        });
      } catch (error) {
        console.error('Ошибка при удалении завершенного лида:', error);
      }
    }
    setProgress(prev => prev.filter(p => p.id !== id));
  };

  const cancelAllSending = async () => {
    if (!window.confirm('Вы действительно хотите отменить отправку всех лидов?')) {
      return;
    }

    try {
      const waitingLeads = progress.filter(p => p.status === 'waiting' || p.status === 'sending');
      
      for (const lead of waitingLeads) {
        await fetch('/api/cancel-sending', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ leadId: lead.leadId }),
        });
      }
    } catch (error) {
      console.error('Ошибка при отмене всех отправок:', error);
    }
  };

  const clearQueue = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/v1/leads/clear-queue`, {
        method: 'POST',
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || '',
        },
      });
      setProgress([]);
      setIsVisible(false);
    } catch (error) {
      console.error('Ошибка при очистке очереди:', error);
    }
  };

  return (
    <StatusBarContext.Provider value={{
      isVisible,
      progress,
      showStatusBar,
      hideStatusBar,
      updateProgress,
      addProgress,
      cancelSending,
      removeProgress,
      cancelAllSending,
      clearQueue,
      pendingCancellations,
    }}>
      {children}
    </StatusBarContext.Provider>
  );
}

export function useStatusBar() {
  const context = useContext(StatusBarContext);
  if (context === undefined) {
    throw new Error('useStatusBar must be used within a StatusBarProvider');
  }
  return context;
}
