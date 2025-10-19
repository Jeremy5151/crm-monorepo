'use client';

import { useState, useEffect } from 'react';
import { useTimezone } from '@/contexts/TimezoneContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface CurrentTimeProps {
  timezone: string;
}

export function CurrentTime({ timezone }: CurrentTimeProps) {
  const [currentTime, setCurrentTime] = useState('');
  const { isLoading } = useTimezone();
  const { t } = useLanguage();

  useEffect(() => {
    function updateTime() {
      try {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ru-RU', {
          timeZone: timezone,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        setCurrentTime(timeString);
      } catch (e) {
        setCurrentTime('--:--:--');
      }
    }

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border">
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          <span className="text-xs">{t('common.updating')}</span>
        </div>
      ) : (
        <span className="font-mono font-medium">{currentTime}</span>
      )}
    </div>
  );
}
