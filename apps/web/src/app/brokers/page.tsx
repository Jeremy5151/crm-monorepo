'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import CustomSelect from '@/components/CustomSelect';

type Template = {
  id: string;
  code: string;
  name: string;
  templateName?: string;
  isActive: boolean;
  method: string;
  url: string;
  headers: any;
  body: string;
  createdAt: string;
};

type ExternalTemplate = {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  icon: string;
  tags: string[];
};

export default function BrokersPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<ExternalTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [form, setForm] = useState({
    code: '',
    name: '',
    templateName: '',
    isActive: true,
    method: 'POST',
    url: '',
    headers: JSON.stringify({}, null, 2),
    body: JSON.stringify({}, null, 2),
    // Pull API fields
    pullEnabled: false,
    pullUrl: '',
    pullMethod: 'POST',
    pullHeaders: JSON.stringify({}, null, 2),
    pullBody: JSON.stringify({}, null, 2),
    pullInterval: 15
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

  async function loadAvailableTemplates() {
    setLoading(true);
    try {
      const data = await apiGet('/v1/templates/sync/available');
      setAvailableTemplates(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Ошибка загрузки доступных шаблонов:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplateConfig(templateId: string) {
    try {
      const config = await apiGet(`/v1/templates/sync/config/${templateId}`);
      return config;
    } catch (e: any) {
      console.error('Ошибка загрузки конфигурации шаблона:', e);
      return null;
    }
  }

  // Автозагрузка при открытии страницы
  useEffect(() => {
    loadTemplates();
    loadAvailableTemplates();
  }, []);

  async function addTemplate() {
    setLoading(true);
    try {
      const code = form.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const payload = {
        code,
        name: form.name,
        templateName: form.templateName,
        isActive: form.isActive,
        method: form.method,
        url: form.url,
        headers: JSON.parse(form.headers),
        body: form.body,
        // Pull API fields
        pullEnabled: form.pullEnabled,
        pullUrl: form.pullUrl || null,
        pullMethod: form.pullMethod || 'POST',
        pullHeaders: form.pullHeaders ? JSON.parse(form.pullHeaders) : null,
        pullBody: form.pullBody || null,
        pullInterval: form.pullInterval || 15
      };
      console.log('Отправляем:', payload);
      const result = await apiPost('/v1/templates', payload);
      console.log('Результат:', result);
      await loadTemplates();
      alert('Интеграция добавлена!');
      resetForm();
    } catch (e: any) {
      console.error('Ошибка добавления:', e);
      alert('Ошибка: ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  async function updateTemplate() {
    if (!editingId) return;
    setLoading(true);
    try {
      const code = form.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const payload = {
        code,
        name: form.name,
        templateName: form.templateName,
        isActive: form.isActive,
        method: form.method,
        url: form.url,
        headers: JSON.parse(form.headers),
        body: form.body,
        // Pull API fields
        pullEnabled: form.pullEnabled,
        pullUrl: form.pullUrl || null,
        pullMethod: form.pullMethod || 'POST',
        pullHeaders: form.pullHeaders ? JSON.parse(form.pullHeaders) : null,
        pullBody: form.pullBody || null,
        pullInterval: form.pullInterval || 15
      };
      console.log('Обновление интеграции:', editingId, payload);
      const result = await apiPatch(`/v1/templates/${editingId}`, payload);
      console.log('Результат обновления:', result);
      await loadTemplates();
      alert('Интеграция обновлена!');
      resetForm();
    } catch (e: any) {
      console.error('Ошибка обновления:', e);
      alert('Ошибка: ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Удалить интеграцию?')) return;
    setLoading(true);
    try {
      await apiDelete(`/v1/templates/${id}`);
      await loadTemplates();
    } catch (e: any) {
      alert('Ошибка: ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  function editTemplate(template: any) {
    setEditingId(template.id);
    setShowAdd(true);
    setStep(2);
    
    let parsedHeaders: any = {};
    try {
      parsedHeaders = typeof template.headers === 'string' ? JSON.parse(template.headers) : template.headers;
    } catch (e) {
      parsedHeaders = template.headers;
    }

    let parsedPullHeaders: any = {};
    try {
      parsedPullHeaders = typeof template.pullHeaders === 'string' ? JSON.parse(template.pullHeaders) : template.pullHeaders || {};
    } catch (e) {
      parsedPullHeaders = template.pullHeaders || {};
    }

    setForm({
      code: template.code,
      name: template.name,
      templateName: template.templateName || '',
      isActive: template.isActive,
      method: template.method,
      url: template.url,
      headers: JSON.stringify(parsedHeaders, null, 2),
      body: template.body,
      // Pull fields
      pullEnabled: template.pullEnabled || false,
      pullUrl: template.pullUrl || '',
      pullMethod: template.pullMethod || 'POST',
      pullHeaders: JSON.stringify(parsedPullHeaders, null, 2),
      pullBody: template.pullBody || '',
      pullInterval: template.pullInterval || 15
    });

    setSelectedTemplate(template.code.toLowerCase());
  }

  function handleManualIntegration() {
    alert('Ручная интеграция будет реализована позже');
  }

  function handleNext() {
    if (form.name.trim() && selectedTemplate) {
      setStep(2);
    }
  }

  function handleBack() {
    setStep(1);
  }

  function resetForm() {
    setShowAdd(false);
    setEditingId(null);
    setStep(1);
    setSelectedTemplate('');
    setForm({
      code: '',
      name: '',
      templateName: '',
      isActive: true,
      method: 'POST',
      url: '',
      headers: JSON.stringify({}, null, 2),
      body: JSON.stringify({}, null, 2),
      pullEnabled: false,
      pullUrl: '',
      pullMethod: 'POST',
      pullHeaders: JSON.stringify({}, null, 2),
      pullBody: JSON.stringify({}, null, 2),
      pullInterval: 15
    });
  }

  async function selectTemplate(templateId: string) {
    setSelectedTemplate(templateId);
    const config = await loadTemplateConfig(templateId);
    if (config) {
      // Извлекаем домен из URL для Pull URL
      const urlWithDomain = config.urlTemplate || '';
      
      setForm(f => ({
        ...f,
        code: config.id.toUpperCase(),
        name: config.name,
        templateName: config.name,
        url: urlWithDomain,
        method: config.method,
        headers: JSON.stringify(config.headers, null, 2),
        body: JSON.stringify(config.bodyTemplate, null, 2),
        // Pull API configuration from template
        pullEnabled: config.pull?.enabled || false,
        pullUrl: config.pull?.url || '',
        pullMethod: config.pull?.method || 'POST',
        pullHeaders: config.pull?.headers ? JSON.stringify(config.pull.headers, null, 2) : JSON.stringify({}, null, 2),
        pullBody: config.pull?.bodyTemplate ? JSON.stringify(config.pull.bodyTemplate, null, 2) : JSON.stringify({}, null, 2),
        pullInterval: config.pull?.interval || 15
      }));
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Интеграции</h1>

      <div className="card p-6 space-y-4">
        {!showAdd && (
          <div className="flex items-center justify-between">
            <div></div>
            <button
              className="px-3 py-2 text-sm rounded-xl bg-yellow-500 text-white hover:bg-yellow-600"
              onClick={() => setShowAdd(true)}
            >
              Добавить
            </button>
          </div>
        )}

        {showAdd && (
          <div className="space-y-4">
            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Например: Trackbox NIK"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Шаблон</label>
                  <CustomSelect
                    value={selectedTemplate}
                    options={availableTemplates.map(t => ({ value: t.id, label: `${t.icon} ${t.name}` }))}
                    onChange={selectTemplate}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleNext}
                    disabled={!form.name.trim() || !selectedTemplate}
                    className="px-4 py-2 rounded-xl bg-yellow-500 text-white font-medium hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                  >
                    Далее
                  </button>
                  <button
                    type="button"
                    onClick={handleManualIntegration}
                    className="px-4 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
                  >
                    Ручная интеграция
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Отмена
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  {!editingId && (
                    <button
                      onClick={handleBack}
                      className="p-2 text-gray-500 hover:text-gray-700"
                    >
                      <i className="fas fa-arrow-left"></i>
                    </button>
                  )}
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingId ? `Редактирование интеграции "${form.name}"` : `Настройка параметров для "${form.name}"`}
                  </h3>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Название интеграции</label>
                      <input
                        className="input"
                        value={form.name || ''}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Например: Trackbox NIK"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Метод запроса</label>
                      <CustomSelect
                        value={form.method}
                        onChange={(value) => setForm(f => ({ 
                          ...f, 
                          method: value,
                          // Для GET очищаем body
                          body: value === 'GET' ? '' : f.body
                        }))}
                        options={[
                          { value: 'GET', label: 'GET' },
                          { value: 'POST', label: 'POST (form-urlencoded)' },
                          { value: 'POST_JSON', label: 'POST (JSON)' }
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                      <input
                        className="input"
                        value={form.url || ''}
                        onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                        placeholder="https://example.com/api/endpoint"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {form.method === 'GET' ? 'Для GET все параметры указываются прямо в URL' : 'URL для отправки запроса'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Headers (JSON)</label>
                      <textarea
                        className="input font-mono text-sm"
                        rows={6}
                        value={form.headers}
                        onChange={e => setForm(f => ({ ...f, headers: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {form.method !== 'GET' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Body {form.method === 'POST_JSON' ? '(JSON)' : '(form-urlencoded)'}
                        </label>
                        <textarea
                          className="input font-mono text-sm"
                          rows={12}
                          value={form.body || ''}
                          onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                          placeholder={form.method === 'POST_JSON' ? '{\n  "key": "value"\n}' : 'key1=value1&key2=value2'}
                        />
                      </div>
                    )}

                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Доступные макросы:</h4>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div><code className="bg-white px-1 rounded">${'{firstName}'}</code> - Имя</div>
                        <div><code className="bg-white px-1 rounded">${'{lastName}'}</code> - Фамилия</div>
                        <div><code className="bg-white px-1 rounded">${'{email}'}</code> - Email</div>
                        <div><code className="bg-white px-1 rounded">${'{phone}'}</code> - Телефон (полный)</div>
                        <div><code className="bg-white px-1 rounded">${'{phonePrefix}'}</code> - Код страны (автоопределение)</div>
                        <div><code className="bg-white px-1 rounded">${'{phoneNumber}'}</code> - Номер без кода страны</div>
                        <div><code className="bg-white px-1 rounded">${'{password}'}</code> - Пароль (автогенерация Aa12345!)</div>
                        <div><code className="bg-white px-1 rounded">${'{country}'}</code> - Страна</div>
                        <div><code className="bg-white px-1 rounded">${'{aff}'}</code> - Affiliate</div>
                        <div><code className="bg-white px-1 rounded">${'{bx}'}</code> - Box</div>
                        <div><code className="bg-white px-1 rounded">${'{funnel}'}</code> - Funnel</div>
                        <div><code className="bg-white px-1 rounded">${'{ip}'}</code> - IP адрес</div>
                        <div><code className="bg-white px-1 rounded">${'{lang}'}</code> - Язык</div>
                        <div><code className="bg-white px-1 rounded">${'{url}'}</code> - URL</div>
                        <div><code className="bg-white px-1 rounded">${'{clickid}'}</code> - Click ID</div>
                        <div><code className="bg-white px-1 rounded">${'{utmSource}'}</code> - UTM Source</div>
                        <div><code className="bg-white px-1 rounded">${'{utmTerm}'}</code> - UTM Term</div>
                        <div><code className="bg-white px-1 rounded">${'{utmCampaign}'}</code> - UTM Campaign</div>
                        <div><code className="bg-white px-1 rounded">${'{utmMedium}'}</code> - UTM Medium</div>
                        <div><code className="bg-white px-1 rounded">${'{sub1}'}</code> - Sub1-Sub20</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pull API Settings */}
                <div className="border-t pt-6 mt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      checked={form.pullEnabled}
                      onChange={e => setForm(f => ({ ...f, pullEnabled: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Включить Pull API (получение статусов от брокера)
                    </label>
                  </div>

                  {form.pullEnabled && (
                    <div className="grid md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pull URL</label>
                          <input
                            className="input"
                            value={form.pullUrl || ''}
                            onChange={e => setForm(f => ({ ...f, pullUrl: e.target.value }))}
                            placeholder="https://example.com/api/pull/customers"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Интервал опроса (минут)</label>
                          <input
                            type="number"
                            className="input"
                            value={form.pullInterval || 15}
                            onChange={e => setForm(f => ({ ...f, pullInterval: parseInt(e.target.value) || 15 }))}
                            min="5"
                            max="1440"
                          />
                          <p className="text-xs text-gray-500 mt-1">Как часто запрашивать обновления (5-1440 мин)</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pull Headers (JSON)</label>
                          <textarea
                            className="input font-mono text-sm"
                            rows={6}
                            value={form.pullHeaders}
                            onChange={e => setForm(f => ({ ...f, pullHeaders: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pull Body (JSON)</label>
                          <textarea
                            className="input font-mono text-sm"
                            rows={8}
                            value={form.pullBody}
                            onChange={e => setForm(f => ({ ...f, pullBody: e.target.value }))}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Доступные макросы: <code>${'{from}'}</code> и <code>${'{to}'}</code> для дат
                          </p>
                        </div>

                        <div className="bg-blue-50 p-3 rounded-lg">
                          <h4 className="text-sm font-medium text-blue-900 mb-2">ℹ️ Pull API</h4>
                          <p className="text-xs text-blue-700">
                            Система будет автоматически запрашивать обновления статусов лидов у брокера 
                            с указанным интервалом. Полученные статусы (DEPOSITOR, FTD, и т.д.) 
                            будут обновляться в CRM автоматически.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={editingId ? updateTemplate : addTemplate}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-yellow-500 text-white font-medium hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                  >
                    {loading ? (editingId ? 'Обновление...' : 'Добавление...') : (editingId ? 'Обновить интеграцию' : 'Сохранить интеграцию')}
                  </button>
                  <button
                    type="button"
                    onClick={editingId ? resetForm : handleBack}
                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    {editingId ? 'Отмена' : 'Назад'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {templates.length === 0 ? (
          <p className="text-gray-500">Нет созданных интеграций</p>
        ) : (
          <div className="space-y-2">
            {templates.map(t => {
              const getTemplateName = (code: string) => {
                if (code.startsWith('TRACKBOX')) return 'Trackbox';
                if (code.startsWith('CLICKFUNNELS')) return 'ClickFunnels';
                if (code.startsWith('MAILCHIMP')) return 'MailChimp';
                return 'Неизвестный шаблон';
              };
              
              return (
              <div key={t.id} className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{t.name}</div>
                  <div className="text-sm text-gray-500 truncate">{t.templateName || getTemplateName(t.code)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                    onClick={() => editTemplate(t)}
                  >
                    Редактировать
                  </button>
                  <button
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    onClick={() => deleteTemplate(t.id)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
