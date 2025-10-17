'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { BASE_COLUMNS, EXTRA_KEYS, type ColumnKey } from '@/lib/columns';

type Ctx = { cols: ColumnKey[]; setCols: (c: ColumnKey[]) => void };
const ColumnsContext = createContext<Ctx>({ cols: [...BASE_COLUMNS], setCols: () => {} });

const ALL: ColumnKey[] = [...BASE_COLUMNS, ...EXTRA_KEYS] as ColumnKey[];
const LS_KEY = 'lead_cols';

function normalize(arr: unknown): ColumnKey[] {
  if (!Array.isArray(arr)) return [...BASE_COLUMNS] as ColumnKey[];
  const seen = new Set<string>();
  const out: ColumnKey[] = [];
  for (const k of arr) {
    const key = String(k) as ColumnKey;
    if (!ALL.includes(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out.length ? out : ([...BASE_COLUMNS] as ColumnKey[]);
}

export function ColumnsProvider({ children }: { children: React.ReactNode }) {
  const [cols, setColsState] = useState<ColumnKey[]>([...BASE_COLUMNS] as ColumnKey[]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setColsState(normalize(JSON.parse(raw)));
    } catch {}
  }, []);

  const setCols = useCallback((next: ColumnKey[]) => {
    setColsState(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
  }, []);

  return (
    <ColumnsContext.Provider value={{ cols, setCols }}>
      {children}
    </ColumnsContext.Provider>
  );
}

export function useColumns() {
  return useContext(ColumnsContext);
}
