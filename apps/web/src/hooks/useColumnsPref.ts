'use client';

import { useEffect, useState, useCallback } from 'react';
import { DEFAULT_COLUMNS, type ColumnKey } from '@/lib/columns';

const LS_KEY = 'lead_cols';

function migrate(keys: string[]): ColumnKey[] {
  return keys.map(k => (k === 'status' ? 'type' : k)) as ColumnKey[];
}

export function useColumnsPref() {
  const [cols, setCols] = useState<ColumnKey[]>(DEFAULT_COLUMNS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = migrate(JSON.parse(raw));
        setCols(parsed.length ? parsed : [...DEFAULT_COLUMNS]);
      }
    } catch {}
  }, []);

  const save = useCallback((next: ColumnKey[]) => {
    const normalized = next.length ? next : [...DEFAULT_COLUMNS];
    setCols(normalized);
    try { localStorage.setItem(LS_KEY, JSON.stringify(normalized)); } catch {}
    try { window.dispatchEvent(new CustomEvent('lead_cols_changed', { detail: normalized })); } catch {}
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === LS_KEY && e.newValue) {
        try { setCols(migrate(JSON.parse(e.newValue))); } catch {}
      }
    }
    function onManual(e: Event) {
      const detail = (e as CustomEvent).detail as ColumnKey[];
      if (Array.isArray(detail)) setCols(detail);
    }
    window.addEventListener('storage', onStorage);
    window.addEventListener('lead_cols_changed', onManual as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('lead_cols_changed', onManual as EventListener);
    };
  }, []);

  return { cols, setCols: save };
}
