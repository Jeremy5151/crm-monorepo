'use client';

import { useState, useEffect, useRef } from 'react';
import { useStatusBar } from '@/contexts/StatusBarContext';
import { useLanguage } from '@/contexts/LanguageContext';

export function StatusBar() {
  const { isVisible, progress, cancelSending, removeProgress, cancelAllSending, clearQueue } = useStatusBar();
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { t } = useLanguage();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Автоматически открываем выпадающее меню при новых отправках
  useEffect(() => {
    if (isVisible && progress.length > 0) {
      const hasActiveSending = progress.some(p => p.status === 'waiting' || p.status === 'sending');
      if (hasActiveSending) {
        setIsExpanded(true);
      }
    }
  }, [isVisible, progress]);

  // Закрываем выпадающее меню при клике вне его
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getStatusIcon = (status: 'pending' | 'sending' | 'success' | 'error' | 'waiting' | 'skipped') => {
    switch (status) {
      case 'success':
        return <div className="w-3 h-3 bg-green-500 rounded-full" />;
      case 'error':
        return <div className="w-3 h-3 bg-red-500 rounded-full" />;
      case 'sending':
        return <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />;
      case 'waiting':
        return <div className="w-3 h-3 bg-yellow-500 rounded-full" />;
      case 'skipped':
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  const getStatusText = (status: 'pending' | 'sending' | 'success' | 'error' | 'waiting' | 'skipped') => {
    switch (status) {
      case 'success':
        return t('statusbar.success');
      case 'error':
        return t('statusbar.error');
      case 'sending':
        return t('statusbar.sending');
      case 'waiting':
        return t('statusbar.waiting');
      case 'skipped':
        return t('statusbar.skipped');
      default:
        return t('statusbar.waiting');
    }
  };

  const translateMessage = (message: string) => {
    const messageMap: Record<string, string> = {
      'Отклонён брокером': t('statusbar.rejected_by_broker'),
      'rejected': t('statusbar.rejected_by_broker'),
      'success': t('statusbar.success'),
      'error': t('statusbar.error'),
      'timeout': t('statusbar.timeout'),
      'network error': t('statusbar.network_error'),
      'invalid response': t('statusbar.invalid_response'),
    };
    
    return messageMap[message] || message;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatNextAction = (date: Date) => {
    const diff = Math.ceil((date.getTime() - currentTime.getTime()) / 1000);
    if (diff <= 0) return 'Сейчас';
    if (diff < 60) return `через ${diff}с`;
    return `через ${Math.ceil(diff / 60)}м`;
  };

  const completedCount = progress.filter(p => p.status === 'success' || p.status === 'error' || p.status === 'skipped').length;
  const totalCount = progress.length;
  const hasActiveSending = progress.some(p => p.status === 'waiting' || p.status === 'sending');
  const hasErrors = progress.some(p => p.status === 'error');
  const allSuccess = progress.every(p => p.status === 'success' || p.status === 'skipped') && !hasErrors;
  const hasCancellableLeads = progress.some(p => p.status === 'waiting' || p.status === 'sending');
  const hasCompletedLeads = progress.some(p => p.status === 'success' || p.status === 'error' || p.status === 'skipped');
  const allCompleted = !hasActiveSending && hasCompletedLeads;
  
  const isComplete = totalCount > 0 && !hasActiveSending && progress.every(p => 
    p.status === 'success' || p.status === 'error' || p.status === 'skipped'
  );
  
  const progressCount = progress.filter(p => p.status === 'success' || p.status === 'error').length;

  // Показываем только если есть активные отправки
  if (!isVisible || progress.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50" ref={dropdownRef}>
      {/* Кнопка для открытия/закрытия */}
      <div 
        className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            hasActiveSending 
              ? 'bg-blue-500 animate-pulse'
              : isComplete && hasErrors
                ? 'bg-red-500' 
                : isComplete && !hasErrors
                ? 'bg-green-500'
                : 'bg-gray-400'
          }`} />
          <span className="text-sm font-medium text-gray-700">
            {progressCount}/{totalCount}
          </span>
          {isComplete && (
            <span className={`text-sm ${hasErrors ? 'text-red-600' : 'text-green-600'}`}>
              {hasErrors ? '✗' : '✓'}
            </span>
          )}
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Развернутый контент */}
      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Очередь отправки</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {progress.length === 0 ? (
              <div className="py-4 text-sm text-gray-500 text-center">
                {t('statusbar.no_active_sends')}
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {progress.map((item) => (
                  <div key={item.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-3 h-3 rounded-full mt-1 ${
                      item.status === 'success' ? 'bg-green-500' :
                      item.status === 'error' ? 'bg-red-500' :
                      item.status === 'sending' ? 'bg-blue-500 animate-pulse' :
                      item.status === 'waiting' ? 'bg-yellow-500' :
                      'bg-gray-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {item.leadEmail || item.leadName || t('statusbar.unknown')}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-xs text-gray-500">
                            {formatTime(item.timestamp)}
                          </div>
                          <button
                            onClick={() => {
                              if (item.status === 'waiting' || item.status === 'sending') {
                                if (window.confirm(t('statusbar.confirm_cancel'))) {
                                  cancelSending(item.leadId);
                                }
                              } else {
                                removeProgress(item.id);
                              }
                            }}
                            className="text-gray-400 hover:text-gray-600"
                            title={item.status === 'waiting' || item.status === 'sending' ? t('statusbar.cancel') : t('statusbar.remove')}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {getStatusText(item.status)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {translateMessage(item.message)}
                      </div>
                      {item.nextAction && (
                        <div className="text-xs text-blue-600 mt-1">
                          {t('statusbar.next_action')}: {formatNextAction(item.nextAction)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {hasCancellableLeads && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <button
                  onClick={cancelAllSending}
                  className="w-full px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  {t('statusbar.cancel_all')}
                </button>
              </div>
            )}
            
            {allCompleted && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <button
                  onClick={clearQueue}
                  className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t('statusbar.clear')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
