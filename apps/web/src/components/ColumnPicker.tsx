'use client';

import { useMemo, useRef } from 'react';
import { BASE_COLUMNS, EXTRA_KEYS, type ColumnKey, columnLabel } from '@/lib/columns';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  value: ColumnKey[];
  onChange: (cols: ColumnKey[]) => void;
};

const ALL = [...BASE_COLUMNS, ...EXTRA_KEYS] as ColumnKey[];

export default function ColumnPicker({ value, onChange }: Props) {
  const { t } = useLanguage();
  const visible = (Array.isArray(value) && value.length ? value : (BASE_COLUMNS as ColumnKey[])) as ColumnKey[];
  const visibleSet = useMemo(() => new Set<ColumnKey>(visible), [visible.join('|')]);
  const hidden = useMemo(() => ALL.filter(k => !visibleSet.has(k)), [visibleSet, visible.join('|')]);

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

  function toggle(k: ColumnKey) {
    if (visibleSet.has(k)) onChange(visible.filter(x => x !== k));
    else onChange([...visible, k]);
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

  return (
    <div className="rounded-xl border border-gray-200 p-4 bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm">
      <div className="font-medium mb-3 text-gray-900 dark:text-white">{t('leads.displayed_columns')}</div>

      <ul className="divide-y divide-gray-200 dark:divide-gray-700 mb-4">
        {visible.map((k, i) => (
          <li
            key={`v-${k}`}
            className="flex items-center gap-3 py-3 select-none hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 transition-colors"
            draggable
            onDragStart={(e) => onDragStart(i, e)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(i)}
            title="Перетащи для изменения порядка"
          >
            <span className="cursor-grab text-gray-400">⋮⋮</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input className="cb-input" type="checkbox" checked onChange={() => toggle(k)} />
              <span className="text-gray-900 dark:text-white">{getColumnLabel(k)}</span>
            </label>
            <span className="ml-auto text-xs text-gray-400">{k}</span>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="py-2 text-sm text-neutral-500">Ничего не выбрано</li>
        )}
      </ul>

      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">{t('leads.hidden_columns')}</div>
      <ul className="divide-y">
        {hidden.map(k => (
          <li key={`h-${k}`} className="flex items-center gap-3 py-3 select-none hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 transition-colors">
            <span className="opacity-0">⋮⋮</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input className="cb-input" type="checkbox" checked={false} onChange={() => toggle(k)} />
              <span className="text-gray-900 dark:text-white">{getColumnLabel(k)}</span>
            </label>
            <span className="ml-auto text-xs text-gray-400">{k}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
