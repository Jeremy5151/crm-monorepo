"use client";

import { useEffect, useState, useMemo } from "react";
import { apiGet } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

type LogEntry = {
  type: string;
  message: string;
  timestamp?: string;
};

type LogCategory = 'all' | 'incoming' | 'outgoing' | 'status' | 'auth' | 'system';

export default function LogsPage() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<LogCategory>('all');

  async function loadLogs() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet("/v1/logs");
      if (Array.isArray(data)) {
        setLogs(data);
      } else if (Array.isArray(data?.logs)) {
        setLogs(data.logs);
      } else {
        setLogs([]);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 5000); // Auto-refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = useMemo(() => {
    if (activeCategory === 'all') return logs;
    
    return logs.filter(log => {
      const logType = (log.type || 'SYSTEM').toUpperCase();
      const msgLower = String(log.message ?? '').toLowerCase();
      
      switch (activeCategory) {
        case 'incoming':
          return logType === 'INCOMING_LEAD' || msgLower.includes('[incoming_lead]') || msgLower.includes('lead created') || msgLower.includes('incoming lead');
        case 'outgoing':
          return logType === 'OUTGOING_REQUEST' || msgLower.includes('[outgoing_request]') || msgLower.includes('outgoing request') || msgLower.includes('📤') || msgLower.includes('sending to broker');
        case 'status':
          return logType === 'STATUS_PULL' || msgLower.includes('[status_pull]') || msgLower.includes('pulling status') || msgLower.includes('status pull') || msgLower.includes('response from');
        case 'auth':
          return logType === 'AUTH' || msgLower.includes('[auth]') || msgLower.includes('login') || msgLower.includes('authentication') || msgLower.includes('logged in');
        case 'system':
          return logType === 'SYSTEM' || (!msgLower.includes('incoming') && !msgLower.includes('outgoing') && !msgLower.includes('status_pull') && !msgLower.includes('pulling') && !msgLower.includes('login') && !msgLower.includes('auth') && !msgLower.includes('📤'));
        default:
          return true;
      }
    });
  }, [logs, activeCategory]);

  const categories: { id: LogCategory; label: string }[] = [
    { id: 'all', label: t('logs.all') || 'Все' },
    { id: 'incoming', label: t('logs.incoming_leads') || 'Входящие лиды' },
    { id: 'outgoing', label: t('logs.outgoing_requests') || 'Отправка лидов' },
    { id: 'status', label: t('logs.status_pulls') || 'Получение статусов' },
    { id: 'auth', label: t('logs.auth_logs') || 'Вход в систему' },
    { id: 'system', label: t('logs.system') || 'Система' },
  ];

  return (
    <div className="page-container">
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t('logs.title') || 'Логи'}</h1>
          <button className="btn-primary" onClick={loadLogs} disabled={loading}>
            {loading ? t('logs.loading') || "Загрузка..." : t('logs.refresh') || "Обновить"}
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        {filteredLogs.length === 0 && !loading ? (
          <div className="text-gray-600 text-center py-8">
            {t('logs.no_logs') || 'Логи не найдены'}
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-auto border border-gray-200 rounded-xl bg-white">
            <ul className="divide-y divide-gray-100">
              {filteredLogs.map((log, idx) => (
                <li key={idx} className="px-4 py-3 text-sm text-gray-800 font-mono break-all">
                  {log.timestamp ? (
                    <span className="text-gray-500 mr-2">{log.timestamp}</span>
                  ) : null}
                  <span className={`mr-2 inline-block px-2 py-0.5 text-xs rounded text-white ${
                    (log.type || 'SYSTEM').toUpperCase() === 'INCOMING_LEAD' ? 'bg-green-500' :
                    (log.type || 'SYSTEM').toUpperCase() === 'OUTGOING_REQUEST' ? 'bg-blue-500' :
                    (log.type || 'SYSTEM').toUpperCase() === 'STATUS_PULL' ? 'bg-purple-500' :
                    (log.type || 'SYSTEM').toUpperCase() === 'AUTH' ? 'bg-orange-500' :
                    'bg-gray-500'
                  }`}>
                    {log.type || "SYSTEM"}
                  </span>
                  {log.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}