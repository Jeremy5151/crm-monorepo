'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { TypeBadge, BrokerStatusBadge, formatDateTime } from '@/lib/columns';
import { useTimezone } from '@/contexts/TimezoneContext';
import { useLanguage } from '@/contexts/LanguageContext';

type Attempt = {
  id: string;
  broker: string;
  attemptNo: number;
  status: string;
  responseCode: number | null;
  responseBody: string | null;
  durationMs: number | null;
  createdAt: string;
};

type Lead = {
  id: string;
  createdAt: string;
  sentAt: string | null;
  status: string | null;        // это “тип” (NEW/SENT/…)
  brokerStatus: string | null;  // статус от брокера
  broker: string | null;

  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  ip: string | null;
  country: string | null;
  aff: string | null;
  bx: string | null;
  funnel: string | null;

  externalId: string | null;
  autologinUrl?: string | null;
  comment: string | null;
  brokerResp?: any;

  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;

  attrs?: Record<string, string>;
};

export default function LeadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: lead, mutate, isLoading, error } = useSWR<Lead>(`/v1/leads/${id}`, apiGet, {
    refreshInterval: 3000,
  });
  const { data: attempts } = useSWR<Attempt[]>(`/v1/leads/${id}/attempts`, apiGet, {
    refreshInterval: 3000,
  });

  const [form, setForm] = useState<{ bx?: string; funnel?: string; comment?: string }>({});
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const { timezone: crmTimezone } = useTimezone();
  const { t } = useLanguage();


  if (error) return <div className="p-6 text-red-600">{t('common.error')}: {String(error)}</div>;
  if (isLoading || !lead) return <div className="p-6">{t('common.loading')}</div>;

  const readOnly = ['SENT'].includes((lead.status ?? '').toUpperCase());

  async function onSave() {
    await apiPatch(`/v1/leads/${lead!.id}`, form);
    setForm({});
    await mutate();
  }

  async function onClone() {
    if (!window.confirm('Клонировать этот лид?')) return;
    const res = await apiPost(`/v1/leads/${lead!.id}/clone`, {});
    const newId = res?.id as string | undefined;
    if (newId) router.push(`/lead/${newId}`);
    else await mutate();
  }

  const fullName =
    [lead.firstName, lead.lastName].filter(Boolean).join(' ').trim() || '—';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <button className="btn" onClick={() => router.push('/')}>
          ← {t('common.back')}
        </button>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          {t('leads.all_leads')}
        </Link>
      </div>

      <h1 className="text-2xl font-semibold">{t('leads.lead_id')} {lead.id}</h1>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border p-4 space-y-2">
          <div><b>{t('leads.created')}</b> {formatDateTime(lead.createdAt, crmTimezone)}</div>
          <div><b>{t('leads.sent_to_broker')}</b> {formatDateTime(lead.sentAt, crmTimezone)}</div>
          <div><b>{t('leads.type')}</b> <TypeBadge value={lead.status} /></div>
          <div><b>{t('leads.broker_status')}</b> <BrokerStatusBadge value={lead.brokerStatus} /></div>
          <div><b>{t('leads.broker')}</b> {lead.broker || t('leads.not_sent')}</div>

          <div><b>{t('leads.name')}</b> {fullName}</div>
          <div><b>{t('leads.email')}</b> {lead.email || t('leads.not_sent')}</div>
          <div><b>{t('leads.phone')}</b> {lead.phone || t('leads.not_sent')}</div>
          <div><b>{t('leads.ip')}</b> {lead.ip || t('leads.not_sent')}</div>
          <div><b>{t('leads.country')}</b> {lead.country || t('leads.not_sent')}</div>
          <div><b>{t('leads.aff')}</b> {lead.aff || t('leads.not_sent')}</div>
          <div><b>{t('leads.box')}</b> {lead.bx || t('leads.not_sent')}</div>
          <div><b>{t('leads.funnel')}</b> {lead.funnel || t('leads.not_sent')}</div>
          <div><b>{t('leads.external_id')}</b> {lead?.externalId || t('leads.not_sent')}</div>
          <div><b>{t('leads.autologin')}</b> {lead.autologinUrl ? <a className="text-blue-600 underline" href={lead.autologinUrl} target="_blank" rel="noreferrer">ссылка</a> : t('leads.not_sent')}</div>
          {lead.brokerResp && (
            <div>
              <b>{t('leads.broker_response')}</b>
              <div className="mt-1 p-2 bg-gray-100 rounded text-sm font-mono">
                {typeof lead.brokerResp === 'string' ? lead.brokerResp : JSON.stringify(lead.brokerResp, null, 2)}
              </div>
            </div>
          )}
          <div><b>{t('leads.utm')}</b> {[lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(' / ') || t('leads.not_sent')}</div>
          <div><b>{t('leads.attrs')}</b> {lead.attrs ? JSON.stringify(lead.attrs) : t('leads.not_sent')}</div>
        </div>

        <div className="rounded-xl border p-4 space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={onClone} className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200">
              {t('leads.clone')}
            </button>
            {readOnly && <span className="text-sm text-neutral-500">Лид отправлен: редактирование недоступно</span>}
          </div>

          <div>
            <label className="block text-sm mb-1">{t('leads.box')}</label>
            <input
              className="border rounded-lg p-2 w-full"
              defaultValue={lead.bx ?? ''}
              onChange={e => setForm(f => ({ ...f, bx: e.target.value }))}
              placeholder="box_hu_1"
              disabled={readOnly}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">{t('leads.funnel')}</label>
            <input
              className="border rounded-lg p-2 w-full"
              defaultValue={lead.funnel ?? ''}
              onChange={e => setForm(f => ({ ...f, funnel: e.target.value }))}
              disabled={readOnly}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">{t('leads.comment')}</label>
            <textarea
              className="border rounded-lg p-2 w-full"
              defaultValue={lead.comment ?? ''}
              onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
              rows={4}
              disabled={readOnly}
            />
          </div>

          <button onClick={onSave} disabled={readOnly} className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50">
            {t('leads.save')}
          </button>
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="text-lg font-medium mb-2">{t('leads.send_attempts')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">{t('leads.when')}</th>
                <th className="p-2 text-left">{t('leads.broker_name')}</th>
                <th className="p-2 text-left">{t('leads.attempt_number')}</th>
                <th className="p-2 text-left">{t('leads.status')}</th>
                <th className="p-2 text-left">{t('leads.code')}</th>
                <th className="p-2 text-left">{t('leads.time_ms')}</th>
                <th className="p-2 text-left">{t('leads.raw')}</th>
              </tr>
            </thead>
            <tbody>
              {(attempts ?? []).map(a => (
                <tr key={a.id} className="border-t">
                  <td className="p-2">
                    <button 
                      onClick={() => setSelectedAttempt(a)}
                      className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      {formatDateTime(a.createdAt, crmTimezone)}
                    </button>
                  </td>
                  <td className="p-2">{a.broker}</td>
                  <td className="p-2">{a.attemptNo}</td>
                  <td className="p-2">{a.status}</td>
                  <td className="p-2">{a.responseCode ?? '—'}</td>
                  <td className="p-2">{a.durationMs ?? '—'}</td>
                  <td className="p-2">{a.responseBody ?? '—'}</td>
                </tr>
              ))}
              {(!attempts || attempts.length === 0) && (
                <tr><td className="p-2 text-neutral-500" colSpan={7}>{t('leads.no_attempts')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAttempt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{t('leads.full_server_response')}</h3>
              <button 
                onClick={() => setSelectedAttempt(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <strong>{t('leads.date')}:</strong> {formatDateTime(selectedAttempt.createdAt, crmTimezone)}
              </div>
              <div>
                <strong>{t('leads.broker')}:</strong> {selectedAttempt.broker}
              </div>
              <div>
                <strong>{t('leads.attempt')}:</strong> #{selectedAttempt.attemptNo}
              </div>
              <div>
                <strong>{t('leads.status')}:</strong> {selectedAttempt.status}
              </div>
              <div>
                <strong>{t('leads.response_code')}:</strong> {selectedAttempt.responseCode ?? t('leads.not_sent')}
              </div>
              <div>
                <strong>{t('leads.execution_time')}:</strong> {selectedAttempt.durationMs ?? t('leads.not_sent')} {t('leads.ms')}
              </div>
              
              <div>
                <strong>{t('leads.full_server_response')}:</strong>
                <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-sm overflow-auto max-h-96">
                  {(() => {
                    if (!selectedAttempt.responseBody) return t('leads.no_data');
                    try {
                      const parsed = JSON.parse(selectedAttempt.responseBody);
                      return JSON.stringify(parsed, null, 2);
                    } catch {
                      return selectedAttempt.responseBody;
                    }
                  })()}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
