'use client';

import { useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

type Template = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  method: string;
  url: string;
  headers: any;
  body: string;
  createdAt: string;
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: 'TRACKBOX_NIK',
    name: 'Trackbox NIK',
    isActive: true,
    method: 'POST',
    url: 'https://sn.selection.website/api/signup/procform',
    headers: JSON.stringify({
      "x-trackbox-username": "NIK",
      "x-trackbox-password": "!+99Luj)ZB",
      "x-api-key": "2643889w34df345676ssdas323tgc738",
      "Content-Type": "application/json"
    }, null, 2),
    body: JSON.stringify({
      "ai": "2958345",
      "ci": "1", 
      "gi": "320",
      "userip": "${ip}",
      "firstname": "${firstName}",
      "lastname": "${lastName}",
      "email": "${email}",
      "password": "${password}",
      "phone": "${phone}",
      "so": "${funnel}",
      "sub": "${aff}",
      "MPC_1": "${sub1}",
      "MPC_2": "${sub2}",
      "MPC_3": "${sub3}",
      "MPC_4": "${sub4}",
      "MPC_5": "${sub5}",
      "MPC_6": "${sub6}",
      "MPC_7": "${sub7}",
      "MPC_8": "${sub8}",
      "MPC_9": "${sub9}",
      "MPC_10": "${sub10}",
      "MPC_11": "${sub11}",
      "MPC_12": "${sub12}",
      "ad": "${utmSource}",
      "term": "${utmTerm}",
      "campaign": "${utmCampaign}",
      "medium": "${utmMedium}",
      "lg": "${lang}"
    }, null, 2)
  });

  async function loadTemplates() {
    setLoading(true);
    try {
      const data = await apiGet('/v1/templates');
      setTemplates(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Ошибка загрузки:', e);
    } finally {
      setLoading(false);
    }
  }

  async function addTemplate() {
    setLoading(true);
    try {
      const payload = {
        ...form,
        headers: JSON.parse(form.headers),
        body: form.body
      };
      await apiPost('/v1/templates', payload);
      await loadTemplates();
      alert('Шаблон добавлен!');
    } catch (e: any) {
      alert('Ошибка: ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Шаблоны брокеров</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Добавить шаблон Trackbox</h2>
          
          <div>
            <label className="block text-sm mb-1">Код брокера</label>
            <input
              className="border rounded-lg p-2 w-full"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Название</label>
            <input
              className="border rounded-lg p-2 w-full"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">URL</label>
            <input
              className="border rounded-lg p-2 w-full"
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Headers (JSON)</label>
            <textarea
              className="border rounded-lg p-2 w-full font-mono text-sm"
              rows={6}
              value={form.headers}
              onChange={e => setForm(f => ({ ...f, headers: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Body (JSON)</label>
            <textarea
              className="border rounded-lg p-2 w-full font-mono text-sm"
              rows={12}
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            />
          </div>

          <button
            onClick={addTemplate}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
          >
            {loading ? 'Добавление...' : 'Добавить шаблон'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium">Существующие шаблоны</h2>
            <button
              onClick={loadTemplates}
              disabled={loading}
              className="px-3 py-1 text-sm bg-gray-100 rounded"
            >
              Обновить
            </button>
          </div>

          {templates.length === 0 ? (
            <p className="text-gray-500">Нет шаблонов</p>
          ) : (
            <div className="space-y-2">
              {templates.map(t => (
                <div key={t.id} className="border rounded-lg p-3">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-sm text-gray-600">Код: {t.code}</div>
                  <div className="text-sm text-gray-600">URL: {t.url}</div>
                  <div className="text-sm">
                    Статус: <span className={t.isActive ? 'text-green-600' : 'text-red-600'}>
                      {t.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
