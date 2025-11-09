'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import LeadsFilterBar from '@/components/LeadsFilterBar';
import { useColumnsPref } from '@/hooks/useColumnsPref';
import { useQueryState } from '@/lib/useQueryState';
import { apiGet, apiPost } from '@/lib/api';
import { CompactBrokerSelector } from '@/components/CompactBrokerSelector';
import { SimpleIntervalInput } from '@/components/SimpleIntervalInput';
import { useStatusBar } from '@/contexts/StatusBarContext';
import { useTimezone } from '@/contexts/TimezoneContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  ColumnKey,
  TypeBadge,
  BrokerStatusBadge,
  formatDateTime,
  getCellValue,
  columnLabel,
} from '@/lib/columns';
import { formatDateInCrmTimezone } from '@/lib/date-utils';

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
  ip: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  clickid: string | null;
  comment: string | null;
  lang: string | null;
  useragent: string | null;
  url: string | null;
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
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading dashboard…</div>}>
      <LeadsPageContent />
    </Suspense>
  );
}

function LeadsPageContent() {
  const { cols, setCols } = useColumnsPref();
  const { params } = useQueryState();
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();

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
  const { timezone: crmTimezone } = useTimezone();
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
  const [total, setTotal] = useState(0);
  const [allItems, setAllItems] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBrokerSelector, setShowBrokerSelector] = useState(false);
  const [showIntervalSelector, setShowIntervalSelector] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<string>('');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
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
      setTotal(data.total || data.items?.length || 0);
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
        return <span>{formatDateTime(lead.createdAt, crmTimezone)}</span>;
      case 'sentAt':
        return <span>{formatDateTime(lead.sentAt, crmTimezone)}</span>;
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
      case 'ip':
        return <span>{lead.ip || '—'}</span>;
      case 'utmSource':
        return <span>{lead.utmSource || '—'}</span>;
      case 'utmMedium':
        return <span>{lead.utmMedium || '—'}</span>;
      case 'utmCampaign':
        return <span>{lead.utmCampaign || '—'}</span>;
      case 'utmTerm':
        return <span>{lead.utmTerm || '—'}</span>;
      case 'utmContent':
        return <span>{lead.utmContent || '—'}</span>;
      case 'clickid':
        return <span>{lead.clickid || '—'}</span>;
      case 'comment':
        return <span>{lead.comment || '—'}</span>;
      case 'lang':
        return <span>{lead.lang || '—'}</span>;
      case 'useragent':
        return <span>{lead.useragent || '—'}</span>;
      case 'url':
        return <span>{lead.url || '—'}</span>;
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
    const count = selectedIds.length;
    setConfirmDialog({
      isOpen: true,
      title: t('leads.delete_confirm_title'),
      message: `${t('leads.delete_confirm')} (${count})`,
      type: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await apiPost('/v1/leads/bulk-delete', { ids: selectedIds });
          setSelected(new Set());
          await load();
          showSuccess(t('leads.delete_success'), `${count} ${count === 1 ? 'lead' : 'leads'}`);
        } catch (error: any) {
          showError(t('leads.delete_error'), error?.message || String(error));
        }
      }
    });
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
    setSelected(new Set());

    try {
      const response = await apiPost('/v1/leads/bulk-send', { 
        ids: selectedIds, 
        broker: brokerCode,
        intervalMinutes: intervalMinutes
      });
      
      // Обновляем прогресс для первого лида
      if (selectedIds.length > 0) {
        const firstId = selectedIds[0];
        updateProgress(`progress-${firstId}`, {
          status: 'success',
          message: 'Успешно отправлено'
        });
      }
      
      await load();
    } catch (e: any) {
      // Обновляем прогресс для первого лида в случае ошибки
      if (selectedIds.length > 0) {
        const firstId = selectedIds[0];
        updateProgress(`progress-${firstId}`, {
          status: 'error',
          message: e?.message || 'Ошибка отправки'
        });
      }
      setError(e?.message ?? String(e));
    }
  };

  async function onBulkClone() {
    if (!selectedIds.length) return;
    const count = selectedIds.length;
    setConfirmDialog({
      isOpen: true,
      title: t('leads.clone_confirm_title'),
      message: `${t('leads.clone_confirm')} (${count})`,
      type: 'warning',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await apiPost('/v1/leads/bulk-clone', { ids: selectedIds });
          setSelected(new Set());
          await load();
          const suffix = count === 1 ? 'lead' : 'leads';
          showSuccess(t('leads.clone_success'), `${count} ${suffix}`);
        } catch (error: any) {
          showError(t('leads.clone_error'), error?.message || String(error));
        }
      }
    });
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

  function getColumnLabel(key: string): string {
    const labels: Record<string, string> = {
      createdAt: t('leads.date'),
      sentAt: t('leads.sent'),
      name: t('leads.name'),
      email: t('leads.email'),
      phone: t('leads.phone'),
      country: t('leads.country'),
      aff: t('leads.aff'),
      bx: t('leads.box'),
      funnel: t('leads.funnel'),
      type: t('leads.type'),
      brokerStatus: t('leads.status'),
      broker: t('leads.broker'),
      ip: t('leads.ip'),
      utmSource: 'utm_source',
      utmMedium: 'utm_medium',
      utmCampaign: 'utm_campaign',
      utmTerm: 'utm_term',
      utmContent: 'utm_content',
      clickid: 'clickid',
      comment: t('leads.comment'),
      lang: 'lang',
      useragent: 'useragent',
      url: t('leads.url'),
    };
    return labels[key] || key;
  }

  return (
    <div className="leads-page">
      <div className="page-container">

      <LeadsFilterBar columns={cols} onColumns={setCols} leads={allItems} />

      <div className="table-container">
        <div className="card">
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
                      <span>{getColumnLabel(c)}</span>
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

        {/* Pagination and stats */}
        <div className="mt-4 flex items-center justify-between px-4">
          <div className="text-sm text-gray-600">
            {t('leads.showing')} <span className="font-semibold text-gray-900">{items.length}</span> {t('leads.of')} <span className="font-semibold text-gray-900">{total}</span> {t('leads.total')}
          </div>
          <div className="flex gap-2">
            {items.length < total && (
              <button 
                className="btn-secondary text-sm"
                onClick={() => {
                  const newTake = parseInt(take) + 50;
                  const url = new URL(window.location.href);
                  url.searchParams.set('take', String(newTake));
                  window.history.pushState({}, '', url);
                  load();
                }}
              >
                {t('common.load_more')}
              </button>
            )}
          </div>
        </div>
        
        {selected.size > 0 && (
          <div className="selection-panel">
            <div className="selection-content">
              <div className="selection-left">
                <div className="selection-count">
                  <span className="count-number">{selected.size}</span>
                </div>
                <span className="selection-text">
                  {t('leads.selected')}
                </span>
                <button
                  onClick={() => setSelected(new Set())}
                  className="selection-clear"
                >
                  ✕
                </button>
              </div>
              
              <div className="selection-actions">
                <button
                  onClick={onBulkDelete}
                  disabled={loading}
                  className="action-btn action-btn-danger"
                >
                  {t('common.delete')}
                </button>
                
                <button
                  onClick={onBulkClone}
                  disabled={loading}
                  className="action-btn action-btn-secondary"
                >
                  {t('leads.clone')}
                </button>
                
                <button
                  onClick={onBulkSend}
                  disabled={loading || !canSend}
                  className="action-btn action-btn-primary"
                  title={!canSend ? t('leads.send_tooltip') : ""}
                >
                  {t('leads.send')}
                </button>
              </div>
            </div>
          </div>
        )}


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
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        type={confirmDialog.type}
      />
      </div>
      </div>
    </div>
  );
}
