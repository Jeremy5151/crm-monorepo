'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import LeadsFilterBar from '@/components/LeadsFilterBar';
import { useColumnsPref } from '@/hooks/useColumnsPref';
import { useQueryState } from '@/lib/useQueryState';
import {
  ColumnKey,
  StatusBadge,
  BrokerStatusBadge,
  formatDateTime,
  getCellValue,
  columnLabel,
} from '@/lib/columns';
import { apiGet } from '@/lib/api';
import { useTimezone } from '@/contexts/TimezoneContext';

type StatusEvent = {
  id: string;
  kind: string;
  from: string | null;
  to: string | null;
  createdAt: string;
};

type Lead = {
  id: string;
  createdAt: string;
  sentAt?: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  aff: string | null;
  bx: string | null;
  funnel: string | null;
  status: string | null;
  brokerStatus?: string | null;
  broker?: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY!;

type Dir = 'asc' | 'desc';
type Order = { key: ColumnKey; dir: Dir } | null;

const FIRST_DIR: Record<ColumnKey, Dir> = {
  createdAt: 'desc',
  // для дат отправки тоже используем сортировку по убыванию по умолчанию
  sentAt: 'desc',
  name: 'asc',
  email: 'asc',
  phone: 'asc',
  country: 'asc',
  aff: 'asc',
  bx: 'asc',
  funnel: 'asc',
  status: 'asc',
} as const;

export default function LeadsPage() {
  const { cols, setCols } = useColumnsPref(); 
  const { params } = useQueryState();
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const aff = params.get('aff') ?? '';
  const bx = params.get('bx') ?? '';
  const country = params.get('country') ?? '';
  const funnel = params.get('funnel') ?? '';
  const take = params.get('take') ?? '50';

  const [order, setOrder] = useState<Order>(null);
  function toggleSort(col: ColumnKey) {
    setOrder(prev => {
      if (!prev || prev.key !== col) {
        return { key: col, dir: FIRST_DIR[col] ?? 'asc' };
      }
      if (prev.dir === 'asc') {
        return { key: col, dir: 'desc' };
      }
      if (prev.dir === 'desc') {
        return { key: col, dir: 'asc' };
      }
      return null;
    });
  }
  function headerLabelWithSort(col: ColumnKey) {
    const base = columnLabel(col);
    if (!order || order.key !== col) return base;
    return `${base} ${order.dir === 'asc' ? '▲' : '▼'}`;
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Lead[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusHistoryPopover, setStatusHistoryPopover] = useState<{
    leadId: string;
    x: number;
    y: number;
  } | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { timezone: crmTimezone } = useTimezone();

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (status) p.set('status', status);
    if (aff) p.set('aff', aff);
    if (bx) p.set('bx', bx);
    if (country) p.set('country', country);
    if (funnel) p.set('funnel', funnel);
    if (take) p.set('take', take);
    return p.toString();
  }, [q, status, aff, bx, country, funnel, take]);

  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const runtimeKey = (typeof window !== 'undefined' && localStorage.getItem('apiKey')) || API_KEY || '';
        const res = await fetch(`${API_BASE}/v1/leads?${query}`, {
          headers: { 'X-API-Key': runtimeKey },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const leads = Array.isArray(data.items) ? data.items : [];
        // Логируем для отладки
        if (leads.length > 0) {
          console.log('Sample lead data:', leads[0]);
          console.log('Has brokerStatus:', 'brokerStatus' in leads[0], leads[0]?.brokerStatus);
        }
        if (!abort) setItems(leads);
      } catch (e: any) {
        if (!abort) setError(e?.message ?? String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [query, refreshKey]);

  // Слушаем событие обновления статусов
  useEffect(() => {
    const handler = () => {
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener('leads:refresh', handler);
    return () => window.removeEventListener('leads:refresh', handler);
  }, []);

  const sortedItems = useMemo(() => {
    if (!order) return items;
    const copy = items.slice();
    copy.sort((a, b) => {
      const av = getCellValue(a, order.key);
      const bv = getCellValue(b, order.key);
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av ?? '').localeCompare(String(bv ?? ''), 'ru', { numeric: true });
      return order.dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [items, order]);

  async function handleBrokerStatusClick(e: React.MouseEvent | React.SyntheticEvent, leadId: string) {
    e.preventDefault();
    e.stopPropagation();
    console.log('Broker status clicked for lead:', leadId);
    
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setStatusHistoryPopover({
      leadId,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
    
    setLoadingHistory(true);
    try {
      const history = await apiGet<StatusEvent[]>(`/v1/leads/${leadId}/status-history`);
      setStatusHistory(history || []);
    } catch (err) {
      console.error('Error loading status history:', err);
      setStatusHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  function renderCell(col: ColumnKey, lead: Lead) {
    // Логируем все вызовы renderCell для brokerStatus
    if (col === 'brokerStatus') {
      console.log('renderCell called for brokerStatus:', {
        col,
        leadId: lead.id,
        hasBrokerStatus: 'brokerStatus' in lead,
        brokerStatus: lead.brokerStatus,
        allLeadKeys: Object.keys(lead)
      });
    }
    
    switch (col) {
      case 'createdAt': return formatDateTime(lead.createdAt);
      case 'sentAt': return formatDateTime(lead.sentAt);
      case 'name': {
        const full = [lead.firstName ?? '', lead.lastName ?? ''].join(' ').trim();
        return full || '—';
      }
      case 'email': return lead.email || '—';
      case 'phone': return lead.phone || '—';
      case 'country': return lead.country || '—';
      case 'aff': return lead.aff || '—';
      case 'bx': return lead.bx || '—';
      case 'funnel': return lead.funnel || '—';
      case 'type': return <StatusBadge value={lead.status} />;
      case 'status': return <StatusBadge value={lead.status} />;
      case 'brokerStatus': 
        console.log('Rendering brokerStatus for lead:', lead.id, 'value:', lead.brokerStatus);
        const statusValue = lead.brokerStatus;
        if (!statusValue) {
          return <BrokerStatusBadge value={null} />;
        }
        return (
          <span
            onClick={(e) => {
              console.log('BrokerStatus CLICKED! Lead:', lead.id, 'status:', statusValue);
              e.preventDefault();
              e.stopPropagation();
              handleBrokerStatusClick(e, lead.id);
            }}
            onMouseDown={(e) => {
              console.log('BrokerStatus mousedown');
              e.preventDefault();
              e.stopPropagation();
            }}
            className="cursor-pointer hover:opacity-80 transition-opacity inline-block"
            style={{ display: 'inline-block', userSelect: 'none' }}
            title="Кликните, чтобы увидеть историю изменений статуса"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                handleBrokerStatusClick(e, lead.id);
              }
            }}
          >
            <BrokerStatusBadge value={statusValue} clickable />
          </span>
        );
      case 'broker': return lead.broker || '—';
      default: return '';
    }
  }

  return (
    <div className="space-y-4">
      <LeadsFilterBar columns={cols} onColumns={setCols} />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full" key={cols.join('|')}>

            <thead className="bg-white">
              <tr className="text-left text-xs text-[color:var(--ink-muted)]">
                {cols.map((c) => (
                  <th
                    key={c}
                    className="px-4 py-3 cursor-pointer select-none"
                    onClick={() => toggleSort(c as ColumnKey)}
                    title="Кликни, чтобы сортировать"
                  >
                    {headerLabelWithSort(c as ColumnKey)}
                  </th>
                ))}
                <th className="px-4 py-3">Действия</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={cols.length + 1} className="px-4 py-8 text-center text-sm text-[color:var(--ink-muted)]">
                    Загрузка…
                  </td>
                </tr>
              )}

              {error && !loading && (
                <tr>
                  <td colSpan={cols.length + 1} className="px-4 py-4 text-center text-sm text-red-600">
                    Ошибка: {error}
                  </td>
                </tr>
              )}

              {!loading && !error && sortedItems.map((lead) => {
                // Логируем для отладки
                if (cols.includes('brokerStatus' as ColumnKey)) {
                  console.log('Rendering row for lead:', lead.id, 'cols:', cols, 'has brokerStatus in lead:', 'brokerStatus' in lead);
                }
                return (
                <tr key={lead.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  {cols.map((c) => {
                    const cellContent = renderCell(c as ColumnKey, lead);
                    return (
                    <td 
                      key={c} 
                      className="px-4 py-3 text-sm"
                      onClick={(e) => {
                        // Если клик по brokerStatus - не перехватываем
                        if (c === 'brokerStatus') {
                          e.stopPropagation();
                        }
                      }}
                    >
                      {cellContent}
                    </td>
                    );
                  })}
                  <td className="px-4 py-3 text-sm">
                    <Link className="text-[color:var(--primary)] hover:underline" href={`/lead/${lead.id}`}>
                      Открыть
                    </Link>
                  </td>
                </tr>
                );
              })}

              {!loading && !error && sortedItems.length === 0 && (
                <tr>
                  <td colSpan={cols.length + 1} className="px-4 py-8 text-center text-sm text-[color:var(--ink-muted)]">
                    Ничего не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Popover для истории статусов */}
      {statusHistoryPopover && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setStatusHistoryPopover(null)}
          />
          <div
            className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-md max-h-96 overflow-auto"
            style={{
              left: `${statusHistoryPopover.x}px`,
              top: `${statusHistoryPopover.y + 20}px`,
              transform: 'translateX(-50%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-900">История статусов брокера</h3>
              <button
                onClick={() => setStatusHistoryPopover(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            {loadingHistory ? (
              <div className="text-center text-gray-500 py-4">Загрузка...</div>
            ) : statusHistory.length > 0 ? (
              <div className="space-y-2">
                {statusHistory.map((event) => (
                  <div key={event.id} className="border-b pb-2 last:border-b-0">
                    <div className="flex items-center gap-2">
                      {event.from ? (
                        <>
                          <BrokerStatusBadge value={event.from} />
                          <span className="text-gray-400">→</span>
                        </>
                      ) : null}
                      <BrokerStatusBadge value={event.to} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDateTime(event.createdAt, crmTimezone)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4 text-sm">
                История изменений статусов отсутствует
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
