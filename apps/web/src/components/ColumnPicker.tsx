'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { BASE_COLUMNS, EXTRA_KEYS, type ColumnKey, columnLabel } from '@/lib/columns';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  value: ColumnKey[];
  onChange: (cols: ColumnKey[]) => void;
  isOpen: boolean;
  onClose: () => void;
};

const ALL = [...BASE_COLUMNS, ...EXTRA_KEYS] as ColumnKey[];

export default function ColumnPicker({ value, onChange, isOpen, onClose }: Props) {
  const { t } = useLanguage();
  const [availableSearch, setAvailableSearch] = useState('');
  const [inUseSearch, setInUseSearch] = useState('');
  const [selectedAvailable, setSelectedAvailable] = useState<Set<ColumnKey>>(new Set());
  const [selectedInUse, setSelectedInUse] = useState<Set<ColumnKey>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const visible = (Array.isArray(value) && value.length ? value : [...BASE_COLUMNS]) as ColumnKey[];
  const visibleSet = useMemo(() => new Set<ColumnKey>(visible), [visible.join('|')]);
  const hidden = useMemo(() => ALL.filter(k => !visibleSet.has(k)), [visibleSet, visible.join('|')]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        // Check if click is on the columns button
        const columnsButton = document.querySelector('[data-columns-button]');
        if (columnsButton && columnsButton.contains(target)) {
          return; // Don't close if clicking on the columns button
        }
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

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
    const label = labels[key] || key;
    // Remove trailing colon if present
    return label.endsWith(':') ? label.slice(0, -1) : label;
  }

  // Filtered lists based on search
  const filteredHidden = useMemo(() => {
    if (!availableSearch) return hidden;
    return hidden.filter(k => 
      getColumnLabel(k).toLowerCase().includes(availableSearch.toLowerCase()) ||
      k.toLowerCase().includes(availableSearch.toLowerCase())
    );
  }, [hidden, availableSearch]);

  const filteredVisible = useMemo(() => {
    if (!inUseSearch) return visible;
    return visible.filter(k => 
      getColumnLabel(k).toLowerCase().includes(inUseSearch.toLowerCase()) ||
      k.toLowerCase().includes(inUseSearch.toLowerCase())
    );
  }, [visible, inUseSearch]);

  function addColumn(k: ColumnKey) {
    onChange([...visible, k]);
  }

  function removeColumn(k: ColumnKey) {
    onChange(visible.filter(x => x !== k));
  }

  function toggleAvailableSelection(k: ColumnKey) {
    setSelectedAvailable(prev => {
      const next = new Set(prev);
      if (next.has(k)) {
        next.delete(k);
      } else {
        next.add(k);
      }
      return next;
    });
  }

  function toggleInUseSelection(k: ColumnKey) {
    setSelectedInUse(prev => {
      const next = new Set(prev);
      if (next.has(k)) {
        next.delete(k);
      } else {
        next.add(k);
      }
      return next;
    });
  }

  function moveSelectedToInUse() {
    if (selectedAvailable.size === 0) return;
    const newVisible = [...visible, ...Array.from(selectedAvailable)];
    onChange(newVisible);
    setSelectedAvailable(new Set());
  }

  function moveSelectedToAvailable() {
    if (selectedInUse.size === 0) return;
    const newVisible = visible.filter(x => !selectedInUse.has(x));
    onChange(newVisible);
    setSelectedInUse(new Set());
  }

  const dragFrom = useRef<number | null>(null);
  function onDragStart(i: number, e: React.DragEvent) {
    dragFrom.current = i;
    try {
      e.dataTransfer.setData('text/plain', String(i));
      e.dataTransfer.effectAllowed = 'move';
    } catch {}
  }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); }
  function onDrop(i: number) {
    const from = dragFrom.current;
    dragFrom.current = null;
    if (from === null || from === i) return;
    const next = visible.slice();
    const [it] = next.splice(from, 1);
    next.splice(i, 0, it);
    onChange(next);
  }

  if (!isOpen) return null;

  return (
    <div ref={dropdownRef} className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-6 w-[500px] max-h-[500px] overflow-hidden z-50">
      <div className="flex gap-4 h-80">
        {/* Available Fields Panel */}
        <div className="flex-1 flex flex-col">
          <div className="text-sm font-medium text-gray-700 mb-2">{t('leads.available_fields')}</div>
          <input
            type="text"
            placeholder={t('leads.search_by_field')}
            value={availableSearch}
            onChange={(e) => setAvailableSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex-1 overflow-y-auto border border-gray-200 rounded">
            {filteredHidden.map(k => (
              <div
                key={`available-${k}`}
                className={`flex items-center justify-between p-3 border-b border-gray-100 cursor-pointer ${
                  selectedAvailable.has(k) 
                    ? 'bg-yellow-100 hover:bg-yellow-200' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => toggleAvailableSelection(k)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 cursor-grab">⋮⋮</span>
                  <span className="text-gray-900">{getColumnLabel(k)}</span>
                </div>
                <button 
                  className="text-blue-600 hover:text-blue-800 text-lg font-bold"
                  onClick={(e) => {
                    e.stopPropagation();
                    addColumn(k);
                  }}
                >
                  +
                </button>
              </div>
            ))}
            {filteredHidden.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">No available fields</div>
            )}
          </div>
        </div>

        {/* Middle Action Buttons */}
        <div className="flex flex-col justify-center gap-4">
          <button
            onClick={moveSelectedToInUse}
            disabled={selectedAvailable.size === 0}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
            title="Move selected to In Use"
          >
            <span className="text-lg">»</span>
          </button>
          <button
            onClick={moveSelectedToAvailable}
            disabled={selectedInUse.size === 0}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
            title="Move selected to Available"
          >
            <span className="text-lg">«</span>
          </button>
        </div>

        {/* In Use Panel */}
        <div className="flex-1 flex flex-col">
          <div className="text-sm font-medium text-gray-700 mb-2">{t('leads.in_use')}</div>
          <input
            type="text"
            placeholder={t('leads.search_by_field')}
            value={inUseSearch}
            onChange={(e) => setInUseSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex-1 overflow-y-auto border border-gray-200 rounded">
            {filteredVisible.map((k, i) => (
              <div
                key={`inuse-${k}`}
                className={`flex items-center justify-between p-3 border-b border-gray-100 ${
                  selectedInUse.has(k) 
                    ? 'bg-yellow-100 hover:bg-yellow-200' 
                    : 'hover:bg-gray-50'
                }`}
                draggable
                onDragStart={(e) => onDragStart(i, e)}
                onDragOver={onDragOver}
                onDrop={() => onDrop(i)}
                onClick={() => toggleInUseSelection(k)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 cursor-grab">⋮⋮</span>
                  <span className="text-gray-900">{getColumnLabel(k)}</span>
                </div>
                <button 
                  className="text-red-600 hover:text-red-800 text-lg font-bold"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeColumn(k);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            {filteredVisible.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">No fields in use</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}