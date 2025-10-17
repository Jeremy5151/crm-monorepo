'use client';

import { useMemo, useRef } from 'react';
import { BASE_COLUMNS, EXTRA_KEYS, type ColumnKey, columnLabel } from '@/lib/columns';

type Props = {
  value: ColumnKey[];
  onChange: (cols: ColumnKey[]) => void;
};

const ALL = [...BASE_COLUMNS, ...EXTRA_KEYS] as ColumnKey[];

export default function ColumnPicker({ value, onChange }: Props) {
  const visible = (Array.isArray(value) && value.length ? value : (BASE_COLUMNS as ColumnKey[])) as ColumnKey[];
  const visibleSet = useMemo(() => new Set<ColumnKey>(visible), [visible.join('|')]);
  const hidden = useMemo(() => ALL.filter(k => !visibleSet.has(k)), [visibleSet, visible.join('|')]);

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
    <div className="rounded-xl border p-3 bg-white/90 shadow">
      <div className="font-medium mb-2">Отображение колонок</div>

      <ul className="divide-y mb-3">
        {visible.map((k, i) => (
          <li
            key={`v-${k}`}
            className="flex items-center gap-3 py-2 select-none"
            draggable
            onDragStart={(e) => onDragStart(i, e)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(i)}
            title="Перетащи для изменения порядка"
          >
            <span className="cursor-grab text-gray-400">⋮⋮</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input className="cb-input" type="checkbox" checked onChange={() => toggle(k)} />
              <span>{columnLabel(k)}</span>
            </label>
            <span className="ml-auto text-xs text-gray-400">{k}</span>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="py-2 text-sm text-neutral-500">Ничего не выбрано</li>
        )}
      </ul>

      <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Скрытые</div>
      <ul className="divide-y">
        {hidden.map(k => (
          <li key={`h-${k}`} className="flex items-center gap-3 py-2 select-none">
            <span className="opacity-0">⋮⋮</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input className="cb-input" type="checkbox" checked={false} onChange={() => toggle(k)} />
              <span>{columnLabel(k)}</span>
            </label>
            <span className="ml-auto text-xs text-gray-400">{k}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
