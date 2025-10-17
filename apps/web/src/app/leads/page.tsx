'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import LeadsFilterBar from '@/components/LeadsFilterBar';
import { useColumnsPref } from '@/hooks/useColumnsPref';
import { useQueryState } from '@/lib/useQueryState';
import {
  ColumnKey,
  StatusBadge,
  formatDateTime,
  getCellValue,
  columnLabel,
} from '@/lib/columns';

type Lead = {
  id: string;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  aff: string | null;
  bx: string | null;
  funnel: string | null;
  status: string | null;
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
        const res = await fetch(`${API_BASE}/v1/leads?${query}`, {
          headers: { 'X-API-Key': API_KEY },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!abort) setItems(Array.isArray(data.items) ? data.items : []);
      } catch (e: any) {
        if (!abort) setError(e?.message ?? String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [query]);

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

  function renderCell(col: ColumnKey, lead: Lead) {
    switch (col) {
      case 'createdAt': return formatDateTime(lead.createdAt);
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
      case 'status': return <StatusBadge value={lead.status} />;
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

              {!loading && !error && sortedItems.map((lead) => (
                <tr key={lead.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  {cols.map((c) => (
                    <td key={c} className="px-4 py-3 text-sm">
                      {renderCell(c as ColumnKey, lead)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm">
                    <Link className="text-[color:var(--primary)] hover:underline" href={`/lead/${lead.id}`}>
                      Открыть
                    </Link>
                  </td>
                </tr>
              ))}

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
    </div>
  );
}
