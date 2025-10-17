'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import LeadsFilterBar from '@/components/LeadsFilterBar';
import { useColumnsPref } from '@/hooks/useColumnsPref';
import { useQueryState } from '@/lib/useQueryState';
import { apiGet, apiPost } from '@/lib/api';
import { CompactBrokerSelector } from '@/components/CompactBrokerSelector';
import { SimpleIntervalInput } from '@/components/SimpleIntervalInput';
import { useStatusBar } from '@/contexts/StatusBarContext';
import {
  ColumnKey,
  TypeBadge,
  BrokerStatusBadge,
  formatDateTime,
  getCellValue,
  columnLabel,
} from '@/lib/columns';

type Lead = {
  id: string;
  createdAt: string;
  sentAt: string | null;
  status: string | null;
  brokerStatus: string | null;
  broker: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  aff: string | null;
  bx: string | null;
  funnel: string | null;
};

type Dir = 'asc' | 'desc';
type Order = { key: ColumnKey; dir: Dir } | null;

const FIRST_DIR: Record<ColumnKey, Dir> = {
  createdAt: 'desc',
  sentAt: 'desc',
  name: 'asc',
  email: 'asc',
  phone: 'asc',
  country: 'asc',
  aff: 'asc',
  bx: 'asc',
  funnel: 'asc',
  type: 'asc',
  brokerStatus: 'asc',
  broker: 'asc',
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
  const createdDateRange = params.get('createdDateRange') ?? '';
  const sentDateRange = params.get('sentDateRange') ?? '';
  const createdDateFrom = params.get('createdDateFrom') ?? '';
  const createdDateTo = params.get('createdDateTo') ?? '';
  const sentDateFrom = params.get('sentDateFrom') ?? '';
  const sentDateTo = params.get('sentDateTo') ?? '';
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
        // Для дат делаем циклическую сортировку asc -> desc -> asc
        if (col === 'createdAt' || col === 'sentAt') {
          return { key: col, dir: 'asc' };
        }
        return null;
      }
      return null;
    });
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Lead[]>([]);
  const [allItems, setAllItems] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBrokerSelector, setShowBrokerSelector] = useState(false);
  const [showIntervalSelector, setShowIntervalSelector] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<string>('');
  const { showStatusBar, updateProgress } = useStatusBar();

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (status) p.set('status', status);
    if (aff) p.set('aff', aff);
    if (bx) p.set('bx', bx);
    if (country) p.set('country', country);
    if (funnel) p.set('funnel', funnel);
    if (createdDateRange) p.set('createdDateRange', createdDateRange);
    if (sentDateRange) p.set('sentDateRange', sentDateRange);
    if (createdDateFrom) p.set('createdDateFrom', createdDateFrom);
    if (createdDateTo) p.set('createdDateTo', createdDateTo);
    if (sentDateFrom) p.set('sentDateFrom', sentDateFrom);
    if (sentDateTo) p.set('sentDateTo', sentDateTo);
    if (take) p.set('take', take);
    return p.toString();
  }, [q, status, aff, bx, country, funnel, createdDateRange, sentDateRange, createdDateFrom, createdDateTo, sentDateFrom, sentDateTo, take]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet(`/v1/leads?${query}`);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadAllItems() {
    try {
      const data = await apiGet('/v1/leads?take=200');
      setAllItems(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      console.error('Failed to load all items for filters:', e);
    }
  }

  useEffect(() => {
    load();
    setSelected(new Set());
  }, [query]);

  useEffect(() => {
    loadAllItems();
  }, []);

  const sortedItems = useMemo(() => {
    if (!order) return items;
    const copy = items.slice();
    copy.sort((a, b) => {
      const av = getCellValue(a, order.key);
      const bv = getCellValue(b, order.key);
      const aNum = typeof av === 'number' ? av : Number.NaN;
      const bNum = typeof bv === 'number' ? bv : Number.NaN;
      let cmp: number;
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) cmp = aNum - bNum;
      else cmp = String(av ?? '').localeCompare(String(bv ?? ''), 'ru', { numeric: true });
      return order.dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [items, order]);

  function renderCellPlain(col: ColumnKey, lead: Lead) {
    switch (col) {
      case 'createdAt':
        return <span>{formatDateTime(lead.createdAt)}</span>;
      case 'sentAt':
        return <span>{formatDateTime(lead.sentAt)}</span>;
      case 'type':
        return <TypeBadge value={lead.status} />;
      case 'brokerStatus':
        return <BrokerStatusBadge value={lead.brokerStatus} />;
      case 'name': {
        const full = [lead.firstName ?? '', lead.lastName ?? ''].join(' ').trim() || '—';
        return <span>{full}</span>;
      }
      case 'email':
        return <span>{lead.email || '—'}</span>;
      case 'phone':
        return <span>{lead.phone || '—'}</span>;
      case 'country':
        return <span>{lead.country || '—'}</span>;
      case 'aff':
        return <span>{lead.aff || '—'}</span>;
      case 'bx':
        return <span>{lead.bx || '—'}</span>;
      case 'funnel':
        return <span>{lead.funnel || '—'}</span>;
      case 'broker':
        return <span>{lead.broker || '—'}</span>;
      default:
        return <span />;
    }
  }

  const selectedIds = Array.from(selected);
  const selectedLeads = items.filter(i => selected.has(i.id));
  const canSend = selectedLeads.every(l => {
    const s = (l.status ?? '').toUpperCase();
    // Можно отправлять NEW и FAILED (не SENT)
    return s === 'NEW' || s === 'FAILED';
    });

  async function onBulkDelete() {
    if (!selectedIds.length) return;
    if (!window.confirm(`Удалить ${selectedIds.length} лид(ов)?`)) return;
    await apiPost('/v1/leads/bulk-delete', { ids: selectedIds });
    setSelected(new Set());
    await load();
  }

  function onBulkSend() {
    if (!selectedIds.length) return;
    setShowBrokerSelector(true);
  }

  const handleBrokerSelected = (brokerCode: string) => {
    setSelectedBroker(brokerCode);
    setShowBrokerSelector(false);
    
    if (selectedIds.length > 1) {
      setShowIntervalSelector(true);
    } else {
      // Отправляем сразу, если один лид
      sendLeads(brokerCode, 0);
    }
  };

  const handleIntervalSelected = (intervalMinutes: number) => {
    setShowIntervalSelector(false);
    sendLeads(selectedBroker, intervalMinutes);
  };

  const sendLeads = async (brokerCode: string, intervalMinutes: number) => {
    const initialProgress = selectedIds.map((id, index) => {
      const lead = items.find(l => l.id === id);
      const nextAction = index > 0 && intervalMinutes > 0 
        ? new Date(Date.now() + (index * intervalMinutes * 60 * 1000))
        : undefined;
      
      return {
        id: `progress-${id}`,
        leadId: id,
        leadName: lead?.firstName || lead?.lastName || 'Неизвестно',
        leadEmail: lead?.email || '',
        status: index === 0 ? 'sending' as const : 'waiting' as const,
        message: index === 0 
          ? `Отправляется на ${brokerCode}...`
          : intervalMinutes > 0 
            ? `Ожидание отправки (через ${index * intervalMinutes} мин)`
            : 'Ожидает отправки',
        timestamp: new Date(),
        nextAction,
      };
    });

    showStatusBar(initialProgress);

    load();
    setSelected(new Set());

    try {
      apiPost('/v1/leads/bulk-send', { 
        ids: selectedIds, 
        broker: brokerCode,
        intervalMinutes: intervalMinutes
      }).catch((e: any) => {
        setError(e?.message ?? String(e));
      });
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  };

  async function onBulkClone() {
    if (!selectedIds.length) return;
    if (!window.confirm(`Клонировать ${selectedIds.length} лид(ов)?`)) return;
    await apiPost('/v1/leads/bulk-clone', { ids: selectedIds });
    setSelected(new Set());
    await load();
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(prev => {
      if (prev.size === sortedItems.length) return new Set();
      return new Set(sortedItems.map(i => i.id));
    });
  }

  const linkable = new Set<ColumnKey>(['createdAt', 'name', 'email', 'phone']);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-gray-900">Лиды</h1>

      <LeadsFilterBar columns={cols} onColumns={setCols} leads={allItems} />

      <div className="relative">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="leads-table min-w-full">
            <thead>
              <tr>
                <th className="w-8">
                  <label className="cb">
                    <input
                      type="checkbox"
                      checked={selected.size === sortedItems.length && sortedItems.length > 0}
                      onChange={toggleAll}
                    />
                    <span className="mark" />
                  </label>
                </th>
                {cols.map(c => (
                  <th
                    key={c}
                    className="cursor-pointer select-none"
                    onClick={() => toggleSort(c as ColumnKey)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{columnLabel(c)}</span>
                      <div className="flex flex-col -space-y-2">
                        <svg viewBox="0 0 12 12" className={`w-3 h-3 ${order?.key === c && order?.dir === 'asc' ? 'text-gray-900' : 'text-gray-400'}`} style={{ fill: order?.key === c && order?.dir === 'asc' ? '#111827' : '#9CA3AF' }}>
                          <path d="M6 3 L3 6 H9 Z" />
                        </svg>
                        <svg viewBox="0 0 12 12" className={`w-3 h-3 ${order?.key === c && order?.dir === 'desc' ? 'text-gray-900' : 'text-gray-400'}`} style={{ fill: order?.key === c && order?.dir === 'desc' ? '#111827' : '#9CA3AF' }}>
                          <path d="M6 9 L3 6 H9 Z" />
                        </svg>
                      </div>
                    </div>
                  </th>
                ))}
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

              {!loading && !error && sortedItems.map((lead, rowIdx) => {
                const isSelected = selected.has(lead.id);
                return (
                  <tr
                    key={lead.id}
                    className={isSelected ? 'is-selected' : ''}
                  >
                    <td>
                      <label className="cb">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleOne(lead.id)} />
                        <span className="mark" />
                      </label>
                    </td>
                    {cols.map(c => {
                      const content = renderCellPlain(c as ColumnKey, lead);
                      const wrap = linkable.has(c as ColumnKey);
                      return (
                        <td key={c}>
                          {wrap ? <Link className="link" href={`/lead/${lead.id}`}>{content}</Link> : content}
                        </td>
                      );
                    })}
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
        
        {selected.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
            <div className="mx-auto max-w-7xl px-3 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">
                    Выбрано: {selected.size}
                  </span>
                  <button
                    onClick={() => setSelected(new Set())}
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 border border-gray-200 transition-colors"
                  >
                    <i className="fas fa-times text-sm"></i>
                    Сбросить
                  </button>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={onBulkDelete}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200 border border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-trash text-sm"></i>
                    Удалить
                  </button>
                  
                  <button
                    onClick={onBulkClone}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-gray-800 bg-yellow-100 rounded-lg hover:bg-yellow-200 border border-yellow-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-copy text-sm"></i>
                    Клонировать
                  </button>
                  
                  <button
                    onClick={onBulkSend}
                    disabled={loading || !canSend}
                    className="flex items-center gap-2 px-4 py-2 text-white bg-yellow-500 rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed border border-yellow-500 transition-colors"
                    title={!canSend ? "Некоторые лиды уже отправлены. Используйте 'Клонировать' для повторной отправки." : ""}
                  >
                    <i className="fas fa-paper-plane text-sm"></i>
                    Отправить на брокера
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Модальные окна */}
      {showBrokerSelector && (
        <CompactBrokerSelector
          onSelect={handleBrokerSelected}
          onCancel={() => setShowBrokerSelector(false)}
        />
      )}

      {showIntervalSelector && (
        <SimpleIntervalInput
          leadCount={selectedIds.length}
          onConfirm={handleIntervalSelected}
          onCancel={() => setShowIntervalSelector(false)}
        />
      )}
    </div>
  );
}
