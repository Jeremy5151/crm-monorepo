'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useQueryState } from '@/lib/useQueryState';
import ColumnPicker from '@/components/ColumnPicker';
import CustomSelect from '@/components/CustomSelect';
import type { ColumnKey } from '@/lib/columns';

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

const TEXTS = {
  search: 'Search',
  filters: 'Фильтры',
  columns: 'Колонки',
  export: 'Export',
  reset: 'Сбросить',
  status: 'Тип',
  aff: 'Aff',
  box: 'Box',
  country: 'Country',
  funnel: 'Funnel',
  createdPeriod: 'Период создания',
  sentPeriod: 'Период отправки',
  allTime: 'Все время',
  today: 'Сегодня',
  thisWeek: 'Текущая неделя',
  last7Days: 'Последние 7 дней',
  lastMonth: 'Последний месяц',
  thisYear: 'Текущий год',
  custom: 'Ручной выбор',
  all: 'Все',
  createdDateRange: 'Диапазон дат создания',
  sentDateRange: 'Диапазон дат отправки',
  from: 'От',
  to: 'До',
  displayedColumns: 'Отображаемые колонки',
  clearAllFilters: 'Очистить все фильтры'
};

export default function LeadsFilterBar({ columns, onColumns, leads }: Props) {
  const { params, set } = useQueryState();

  const [showFilters, setShowFilters] = useState(false);
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
              placeholder={TEXTS.search}
              defaultValue={q} 
              onChange={e => set({ q: e.target.value, cursor: '' })}
            />
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${showFilters ? 'bg-gray-200 text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {TEXTS.filters}
          </button>
          
          <button 
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${showColumns ? 'bg-gray-200 text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setShowColumns(!showColumns)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            {TEXTS.columns}
          </button>
          
          <button className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 flex items-center gap-2 opacity-50 cursor-not-allowed">
            <i className="fas fa-download"></i>
            {TEXTS.export}
          </button>
        </div>
      </div>
      
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">{TEXTS.filters}</h3>
            <button 
              className="px-3 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 bg-red-100 text-red-600 hover:bg-red-200"
              onClick={() => set({ q: '', status: '', aff: '', bx: '', country: '', funnel: '', createdDateRange: '', sentDateRange: '', createdDateFrom: '', createdDateTo: '', sentDateFrom: '', sentDateTo: '', cursor: '' })}
              title={TEXTS.clearAllFilters}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {TEXTS.reset}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{TEXTS.createdPeriod}</label>
              <CustomSelect
                value={createdDateRange}
                options={[
                  { value: '', label: TEXTS.allTime },
                  { value: 'today', label: TEXTS.today },
                  { value: 'week', label: TEXTS.thisWeek },
                  { value: '7days', label: TEXTS.last7Days },
                  { value: 'month', label: TEXTS.lastMonth },
                  { value: 'year', label: TEXTS.thisYear },
                  { value: 'custom', label: TEXTS.custom },
                ]}
                onChange={handleCreatedDateRangeChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{TEXTS.sentPeriod}</label>
              <CustomSelect
                value={sentDateRange}
                options={[
                  { value: '', label: TEXTS.allTime },
                  { value: 'today', label: TEXTS.today },
                  { value: 'week', label: TEXTS.thisWeek },
                  { value: '7days', label: TEXTS.last7Days },
                  { value: 'month', label: TEXTS.lastMonth },
                  { value: 'year', label: TEXTS.thisYear },
                  { value: 'custom', label: TEXTS.custom },
                ]}
                onChange={handleSentDateRangeChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{TEXTS.status}</label>
              <CustomSelect
                value={status}
                options={TYPES.map(s => ({ value: s, label: s || TEXTS.all }))}
                onChange={value => set({ status: value, cursor: '' })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{TEXTS.aff}</label>
              <CustomSelect
                value={aff}
                options={[
                  { value: '', label: TEXTS.all },
                  ...uniqueAffs.map((affValue: string) => ({ value: affValue, label: affValue }))
                ]}
                onChange={value => set({ aff: value, cursor: '' })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{TEXTS.box}</label>
              <CustomSelect
                value={bx}
                options={[
                  { value: '', label: TEXTS.all },
                  ...uniqueBoxes.map((boxValue: string) => ({ value: boxValue, label: boxValue }))
                ]}
                onChange={value => set({ bx: value, cursor: '' })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{TEXTS.country}</label>
              <CustomSelect
                value={country}
                options={[
                  { value: '', label: TEXTS.all },
                  ...uniqueCountries.map((countryValue: string) => ({ value: countryValue, label: countryValue }))
                ]}
                onChange={value => set({ country: value, cursor: '' })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{TEXTS.funnel}</label>
              <CustomSelect
                value={funnel}
                options={[
                  { value: '', label: TEXTS.all },
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">{TEXTS.createdDateRange}</label>
                    <div className="flex gap-2">
                      <input 
                        type="date" 
                        className="input flex-1" 
                        placeholder={TEXTS.from}
                        onChange={e => set({ createdDateFrom: e.target.value, cursor: '' })}
                      />
                      <input 
                        type="date" 
                        className="input flex-1" 
                        placeholder={TEXTS.to}
                        onChange={e => set({ createdDateTo: e.target.value, cursor: '' })}
                      />
                    </div>
                  </div>
                )}
                
                {showSentDateInputs && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{TEXTS.sentDateRange}</label>
                    <div className="flex gap-2">
                      <input 
                        type="date" 
                        className="input flex-1" 
                        placeholder={TEXTS.from}
                        onChange={e => set({ sentDateFrom: e.target.value, cursor: '' })}
                      />
                      <input 
                        type="date" 
                        className="input flex-1" 
                        placeholder={TEXTS.to}
                        onChange={e => set({ sentDateTo: e.target.value, cursor: '' })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {showColumns && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="block text-sm font-medium text-gray-700 mb-2">{TEXTS.displayedColumns}</div>
          <ColumnPicker value={columns} onChange={onColumns} />
        </div>
      )}
    </div>
  );
}
