import React from 'react';

export const BASE_COLUMNS = [
  'createdAt',
  'sentAt',
  'name',
  'email',
  'phone',
  'country',
  'aff',
  'bx',
  'funnel',
  'type',
  'brokerStatus',
  'broker',
] as const;

export const EXTRA_KEYS = [
  'ip',
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'utmTerm',
  'utmContent',
  'clickid',
  'comment',
  'lang',
  'useragent',
  'url',
  ...Array.from({ length: 20 }, (_, i) => `sub${i + 1}`),
] as const;

export type ColumnKey = typeof BASE_COLUMNS[number] | typeof EXTRA_KEYS[number];

export const DEFAULT_COLUMNS: ColumnKey[] = [...BASE_COLUMNS];

export function columnLabel(key: string): string {
  const map: Record<string, string> = {
    createdAt: 'DATE',
    sentAt: 'SENT',
    name: 'NAME',
    email: 'EMAIL',
    phone: 'PHONE',
    country: 'COUNTRY',
    aff: 'AFF',
    bx: 'BOX',
    funnel: 'FUNNEL',
    type: 'TYPE',
    brokerStatus: 'STATUS',
    broker: 'BROKER',
    ip: 'IP',
    utmSource: 'utm_source',
    utmMedium: 'utm_medium',
    utmCampaign: 'utm_campaign',
    utmTerm: 'utm_term',
    utmContent: 'utm_content',
    clickid: 'clickid',
    comment: 'Комментарий',
    lang: 'Язык',
    useragent: 'User-Agent',
    url: 'URL',
  };
  if (map[key]) return map[key];
  if (/^sub\d+$/i.test(key)) return key.toUpperCase();
  return key;
}

export function formatDateTime(value?: string | Date | null, timezone: string = 'UTC'): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d
    .toLocaleString('ru-RU', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replace(',', '');
}

export function TypeBadge({ value }: { value?: string | null }) {
  const v = (value ?? '').toUpperCase();
  const statusClass = 
    v === 'SENT' || v === 'ACCEPTED' ? 'status-sent' :
    v === 'REJECTED' || v === 'FAILED' || v === 'UNSENT' ? 'status-failed' :
    'status-new';
  
  return (
    <div className={`status-indicator ${statusClass}`}>
      <div className="status-dot"></div>
      <span>{v || '—'}</span>
    </div>
  );
}

export function BrokerStatusBadge({ value, clickable }: { value?: string | null; clickable?: boolean }) {
  const v = (value ?? '').toUpperCase();
  const cls =
    v === 'APPROVED'
      ? 'badge badge-sent'
      : v === 'REJECTED' || v === 'FAILED'
      ? 'badge badge-failed'
      : 'badge';
  const style = clickable ? { textDecoration: 'underline' as const, textDecorationStyle: 'dotted' as const } : undefined;
  return <span className={cls} style={style}>{v || '—'}</span>;
}

export function getCellValue(row: any, key: ColumnKey): string | number {
  if (!row) return '';
  switch (key) {
    case 'createdAt':
      return row.createdAt ? new Date(row.createdAt).getTime() : 0;
    case 'sentAt':
      return row.sentAt ? new Date(row.sentAt).getTime() : -1;
    case 'name': {
      const name = [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
      return name.toLowerCase();
    }
    case 'email':
      return (row.email ?? '').toLowerCase();
    case 'phone':
      return (row.phone ?? '').toString().replace(/\D+/g, '');
    case 'country':
      return (row.country ?? '').toUpperCase();
    case 'type':
      return (row.status ?? '').toString();
    case 'brokerStatus':
      return (row.brokerStatus ?? '').toString();
    case 'broker':
      return (row.broker ?? '').toString();
    case 'aff':
    case 'bx':
    case 'funnel':
      return (row[key] ?? '').toString();
    default:
      return (row[key] ?? '').toString();
  }
}
