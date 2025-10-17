'use client';

import Link from 'next/link';
import {
  ColumnKey,
  DEFAULT_COLUMNS,
  columnLabel,
  formatDateTime,
  StatusBadge,
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

type Props = {
  items: Lead[];
  cols?: ColumnKey[];                       // может не прийти — дадим дефолт
  onOpen?: (id: string) => void;            // опционально
};

export default function LeadsTable({ items, cols, onOpen }: Props) {
  const columns: ColumnKey[] =
    (Array.isArray(cols) && cols.length ? cols : DEFAULT_COLUMNS) as ColumnKey[];

  const open = onOpen ?? ((id: string) => {
    if (typeof window !== 'undefined') window.location.href = `/lead/${id}`;
  });

  function renderCell(col: ColumnKey, lead: Lead) {
    switch (col) {
      case 'createdAt': return formatDateTime(lead.createdAt);
      case 'name': {
        const full = [lead.firstName ?? '', lead.lastName ?? ''].join(' ').trim();
        return full || '—';
      }
      case 'email':   return lead.email   || '—';
      case 'phone':   return lead.phone   || '—';
      case 'country': return lead.country || '—';
      case 'aff':     return lead.aff     || '—';
      case 'bx':      return lead.bx      || '—';
      case 'funnel':  return lead.funnel  || '—';
      case 'status':  return <StatusBadge value={lead.status} />;
      default: return '';
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-white">
          <tr className="text-left text-xs text-[color:var(--ink-muted)]">
            {columns.map((c) => (
              <th key={c} className="px-3 py-2">{columnLabel(c)}</th>
            ))}
            <th className="px-3 py-2">Действия</th>
          </tr>
        </thead>
        <tbody>
          {items.map((l) => (
            <tr key={l.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
              {columns.map((c) => (
                <td key={c} className="px-3 py-2 text-sm">{renderCell(c, l)}</td>
              ))}
              <td className="px-3 py-2 text-sm">
                <Link className="text-[color:var(--primary)] hover:underline" href={`/lead/${l.id}`}>
                  Открыть
                </Link>
                {/* или: <button className="text-blue-600 underline ml-3" onClick={() => open(l.id)}>Открыть</button> */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
