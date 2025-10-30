'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useQueryState } from '@/lib/useQueryState';
import ColumnPicker from '@/components/ColumnPicker';
import { CustomSelect } from '@/components/CustomSelect';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ColumnKey } from '@/lib/columns';
import { useToast } from '@/contexts/ToastContext';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE as string;
const ENV_API_KEY = process.env.NEXT_PUBLIC_API_KEY as string;

type Lead = {
  id: string;
  country: string | null;
  aff: string | null;
  bx: string | null;
  funnel: string | null;
};

type Props = {
  columns: ColumnKey[];
  onColumns: (cols: ColumnKey[]) => void;
  leads: Lead[];
};

const TYPES = ['', 'NEW', 'SENT', 'REJECTED'];

// TEXTS moved to LanguageContext

export default function LeadsFilterBar({ columns, onColumns, leads }: Props) {
  const { params, set } = useQueryState();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [showColumns, setShowColumns] = useState(false);
  const [showCreatedDateInputs, setShowCreatedDateInputs] = useState(false);
  const [showSentDateInputs, setShowSentDateInputs] = useState(false);

  const q       = params.get('q')       ?? '';
  const status  = params.get('status')  ?? '';
  const aff     = params.get('aff')     ?? '';
  const bx      = params.get('bx')      ?? '';
  const country = params.get('country') ?? '';
  const funnel  = params.get('funnel')  ?? '';
  const createdDateRange = params.get('createdDateRange') ?? '';
  const sentDateRange = params.get('sentDateRange') ?? '';
  const take    = params.get('take')    ?? '50';

  const uniqueCountries = useMemo(() => {
    const countries = leads.map(lead => lead.country).filter(Boolean) as string[];
    return Array.from(new Set(countries)).sort();
  }, [leads]);

  const uniqueAffs = useMemo(() => {
    const affs = leads.map(lead => lead.aff).filter(Boolean) as string[];
    return Array.from(new Set(affs)).sort();
  }, [leads]);

  const uniqueBoxes = useMemo(() => {
    const boxes = leads.map(lead => lead.bx).filter(Boolean) as string[];
    return Array.from(new Set(boxes)).sort();
  }, [leads]);

  const uniqueFunnels = useMemo(() => {
    const funnels = leads.map(lead => lead.funnel).filter(Boolean) as string[];
    return Array.from(new Set(funnels)).sort();
  }, [leads]);

  const handleCreatedDateRangeChange = (value: string) => {
    set({ createdDateRange: value, cursor: '' });
    setShowCreatedDateInputs(value === 'custom');
  };

  const handleSentDateRangeChange = (value: string) => {
    set({ sentDateRange: value, cursor: '' });
    setShowSentDateInputs(value === 'custom');
  };

  useEffect(() => {
    setShowCreatedDateInputs(createdDateRange === 'custom');
    setShowSentDateInputs(sentDateRange === 'custom');
  }, [createdDateRange, sentDateRange]);

  const [pulling, setPulling] = useState(false);

  async function handlePullStatuses() {
    if (pulling) return;
    setPulling(true);
    try {
      const runtimeKey = (typeof window !== 'undefined' && localStorage.getItem('apiKey')) || ENV_API_KEY || '';
      const res = await fetch(`${API_BASE}/v1/broker/pull-statuses`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'X-API-Key': runtimeKey, 'Content-Type': 'application/json' },
      });
      const text = await res.text();
      let data: any = null;
      try { data = JSON.parse(text); } catch { /* noop */ }
      if (!res.ok) {
        const msg = (data?.error || text || 'Failed to pull statuses');
        showToast({ title: 'Error', description: msg, variant: 'error' });
      } else {
        const msg = (data?.message || 'Statuses updated');
        showToast({ title: 'Success', description: msg, variant: 'success' });
      }
    } catch (e: any) {
      showToast({ title: 'Error', description: String(e?.message || e), variant: 'error' });
    } finally {
      setPulling(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i className="fas fa-search text-gray-400"></i>
          </div>
            <input 
              type="text" 
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-300"
              placeholder={t('leads.search_placeholder')}
              defaultValue={q} 
              onChange={e => set({ q: e.target.value, cursor: '' })}
            />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <button 
              data-columns-button
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${showColumns ? 'bg-gray-200 text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowColumns(!showColumns);
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              {t('leads.columns')}
            </button>
            <ColumnPicker 
              value={columns} 
              onChange={onColumns} 
              isOpen={showColumns}
              onClose={() => setShowColumns(false)}
            />
          </div>
          
          <button className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 flex items-center gap-2 opacity-50 cursor-not-allowed">
            <i className="fas fa-download"></i>
            {t('leads.export')}
          </button>
          
          <button 
            className={`px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition-colors ${pulling ? 'bg-yellow-400 cursor-wait' : 'bg-yellow-500 hover:bg-yellow-600'}`}
            onClick={handlePullStatuses}
            disabled={pulling}
          >
            <i className={`fas fa-sync-alt ${pulling ? 'animate-spin' : ''}`}></i>
            {pulling ? 'Обновление…' : 'Получить статусы'}
          </button>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('leads.filters')}</h3>
            <button 
              className="px-3 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 bg-red-100 text-red-600 hover:bg-red-200"
              onClick={() => set({ q: '', status: '', aff: '', bx: '', country: '', funnel: '', createdDateRange: '', sentDateRange: '', createdDateFrom: '', createdDateTo: '', sentDateFrom: '', sentDateTo: '', cursor: '' })}
              title={t('leads.clear_all_filters')}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {t('leads.reset')}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('leads.created_period')}</label>
              <CustomSelect
                value={createdDateRange}
                options={[
                  { value: '', label: t('leads.all_time') },
                  { value: 'today', label: t('leads.today') },
                  { value: 'week', label: t('leads.this_week') },
                  { value: '7days', label: t('leads.last_7_days') },
                  { value: 'month', label: t('leads.last_month') },
                  { value: 'year', label: t('leads.this_year') },
                  { value: 'custom', label: t('leads.custom') },
                ]}
                onChange={handleCreatedDateRangeChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('leads.sent_period')}</label>
              <CustomSelect
                value={sentDateRange}
                options={[
                  { value: '', label: t('leads.all_time') },
                  { value: 'today', label: t('leads.today') },
                  { value: 'week', label: t('leads.this_week') },
                  { value: '7days', label: t('leads.last_7_days') },
                  { value: 'month', label: t('leads.last_month') },
                  { value: 'year', label: t('leads.this_year') },
                  { value: 'custom', label: t('leads.custom') },
                ]}
                onChange={handleSentDateRangeChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('leads.status')}</label>
              <CustomSelect
                value={status}
                options={TYPES.map(s => ({ value: s, label: s || t('leads.all') }))}
                onChange={value => set({ status: value, cursor: '' })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('leads.aff')}</label>
              <CustomSelect
                value={aff}
                options={[
                  { value: '', label: t('leads.all') },
                  ...uniqueAffs.map((affValue: string) => ({ value: affValue, label: affValue }))
                ]}
                onChange={value => set({ aff: value, cursor: '' })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('leads.box')}</label>
              <CustomSelect
                value={bx}
                options={[
                  { value: '', label: t('leads.all') },
                  ...uniqueBoxes.map((boxValue: string) => ({ value: boxValue, label: boxValue }))
                ]}
                onChange={value => set({ bx: value, cursor: '' })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('leads.country')}</label>
              <CustomSelect
                value={country}
                options={[
                  { value: '', label: t('leads.all') },
                  ...uniqueCountries.map((countryValue: string) => ({ value: countryValue, label: countryValue }))
                ]}
                onChange={value => set({ country: value, cursor: '' })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('leads.funnel')}</label>
              <CustomSelect
                value={funnel}
                options={[
                  { value: '', label: t('leads.all') },
                  ...uniqueFunnels.map((funnelValue: string) => ({ value: funnelValue, label: funnelValue }))
                ]}
                onChange={value => set({ funnel: value, cursor: '' })}
              />
            </div>
          </div>
          
          {(showCreatedDateInputs || showSentDateInputs) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {showCreatedDateInputs && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('leads.created_date_range')}</label>
                    <div className="flex gap-2">
                      <input 
                        type="date" 
                        className="input flex-1" 
                        placeholder={t('leads.from')}
                        onChange={e => set({ createdDateFrom: e.target.value, cursor: '' })}
                      />
                      <input 
                        type="date" 
                        className="input flex-1" 
                        placeholder={t('leads.to')}
                        onChange={e => set({ createdDateTo: e.target.value, cursor: '' })}
                      />
                    </div>
                  </div>
                )}
                
                {showSentDateInputs && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('leads.sent_date_range')}</label>
                    <div className="flex gap-2">
                      <input 
                        type="date" 
                        className="input flex-1" 
                        placeholder={t('leads.from')}
                        onChange={e => set({ sentDateFrom: e.target.value, cursor: '' })}
                      />
                      <input 
                        type="date" 
                        className="input flex-1" 
                        placeholder={t('leads.to')}
                        onChange={e => set({ sentDateTo: e.target.value, cursor: '' })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

    </div>
  );
}
