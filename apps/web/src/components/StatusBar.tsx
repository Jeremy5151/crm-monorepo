'use client';

import { useState, useEffect } from 'react';
import { useStatusBar } from '@/contexts/StatusBarContext';
import { useLanguage } from '@/contexts/LanguageContext';

export function StatusBar() {
  const { isVisible, progress, cancelSending, removeProgress, cancelAllSending, clearQueue } = useStatusBar();
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { t } = useLanguage();

  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible]);

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
    <div className="statusbar">
      <div className="statusbar-content">
        {/* Компактный заголовок */}
        <div 
          className="statusbar-header"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <div className={`statusbar-indicator ${
              hasActiveSending 
                ? 'active'
                : isComplete && hasErrors
                  ? 'error' 
                  : isComplete && !hasErrors
                  ? 'success'
                  : 'inactive'
            }`} />
            <span className="text-xs font-medium">
              {progressCount}/{totalCount}
            </span>
            {isComplete && (
              <span className={`text-xs ${hasErrors ? 'text-red-600' : 'text-green-600'}`}>
                {hasErrors ? '✗' : '✓'}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <svg 
              className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
          <div className="statusbar-expanded">
            <div className="statusbar-list">
            {progress.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                {t('statusbar.no_active_sends')}
              </div>
            ) : (
              <div className="p-3 space-y-3">
                {progress.map((item) => (
                  <div key={item.id} className="statusbar-item">
                    <div className={`statusbar-item-icon ${item.status}`} />
                    <div className="statusbar-item-content">
                      <div className="statusbar-item-header">
                        <div className="statusbar-item-name">
                          {item.leadEmail || item.leadName || t('statusbar.unknown')}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="statusbar-item-time">
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
                            className="statusbar-close"
                            title={item.status === 'waiting' || item.status === 'sending' ? t('statusbar.cancel') : t('statusbar.remove')}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="statusbar-item-status">
                        {getStatusText(item.status)}
                      </div>
                      <div className="statusbar-item-message">
                        {translateMessage(item.message)}
                      </div>
                      {item.nextAction && (
                        <div className="statusbar-item-next">
                          {t('statusbar.next_action')}: {formatNextAction(item.nextAction)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
            
            {hasCancellableLeads && (
              <div className="statusbar-actions">
                <button
                  onClick={cancelAllSending}
                  className="statusbar-button cancel"
                >
                  {t('statusbar.cancel_all')}
                </button>
              </div>
            )}
            
            {allCompleted && (
              <div className="statusbar-actions">
                <button
                  onClick={clearQueue}
                  className="statusbar-button clear"
                >
                  {t('statusbar.clear')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
