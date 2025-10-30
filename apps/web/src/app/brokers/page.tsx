'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { CustomSelect } from '@/components/CustomSelect';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';

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
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [form, setForm] = useState({
    code: '',
    name: '',
    templateName: '',
    isActive: true,
    method: 'POST',
    url: '',
    headers: JSON.stringify({}, null, 2),
    body: JSON.stringify({}, null, 2),
    params: {} as Record<string, any>, // Параметры интеграции (partnerId, auth и т.д.)
    // Password generation settings
    passwordLength: 8,
    passwordUseUpper: true,
    passwordUseLower: true,
    passwordUseDigits: true,
    passwordUseSpecial: true,
    passwordSpecialChars: '!@#$%',
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
      // Fallback: локальные шаблоны если API не отвечает
      setAvailableTemplates([
        {
          id: 'easyai-market',
          name: 'EasyAI Market',
          icon: '',
          description: 'EasyAI Market integration',
          tags: ['affiliate', 'leads']
        }
      ]);
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
      
      // Fallback: локальный конфиг для EasyAI Market
      if (templateId === 'easyai-market') {
        return {
          id: 'easyai-market',
          name: '🤖 EasyAI Market',
          version: '1.0.0',
          description: 'EasyAI Market affiliate integration',
          urlTemplate: 'https://api.stahptdp.com/api/affiliate/leads',
          method: 'POST',
          headers: {
            'Authorization': 'Bearer {TOKEN}',
            'Content-Type': 'application/json'
          },
          bodyTemplate: {
            firstName: '${firstName}',
            lastName: '${lastName}',
            email: '${email}',
            phone: '${phone}',
            country: '${country}',
            password: '${password}',
            ip: '${ip}',
            funnel: '${funnel}',
            aff: '${aff}'
          },
          formFields: [
            {
              name: 'TOKEN',
              label: 'API Bearer Token',
              type: 'text',
              required: true,
              placeholder: 'Enter your EasyAI Market API token'
            }
          ],
          pull: {
            enabled: true,
            url: 'https://api.stahptdp.com/api/affiliate/leads',
            method: 'GET',
            headers: {
              'Authorization': 'Bearer {TOKEN}'
            },
            interval: 15
          }
        };
      }
      
      return null;
    }
  }

  function toLinesFromAny(method: string, bodyTemplate: any): string {
    if (!bodyTemplate) return '';
    if (typeof bodyTemplate === 'string') {
      const s = bodyTemplate.trim();
      try {
        const obj = JSON.parse(s);
        return toLinesFromAny(method, obj);
      } catch {}
      // Treat as form-url-encoded regardless of presence of macros like ${...}
      if (s.includes('=') && s.includes('&')) {
        const pairs = s.split('&');
        const lines = pairs.map(p => {
          const [k, ...rest] = p.split('=');
          const v = rest.join('=');
          return `${decodeURIComponent(k)}: ${decodeURIComponent(v)};`;
        });
        return lines.join('\n');
      }
      return s;
    }
    if (typeof bodyTemplate === 'object') {
      const lines = Object.entries(bodyTemplate).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)};`);
      return lines.join('\n');
    }
    return String(bodyTemplate);
  }

  function serializeForMethod(method: string, linesBody: string): string {
    const map: Record<string, string> = {};
    const lines = (linesBody || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (line.startsWith('#') || line.startsWith('//')) continue;
      const clean = line.endsWith(';') ? line.slice(0, -1) : line;
      if (!clean.includes(':')) continue;
      const [kRaw, ...rest] = clean.split(':');
      const key = kRaw.trim();
      const val = rest.join(':').trim();
      if (!key) continue;
      map[key] = val;
    }
    if (method === 'POST_JSON') {
      return JSON.stringify(map);
    }
    return Object.entries(map)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
  }

  function validateAndNormalizeBody(method: string, rawBody: string): { ok: boolean; body: string; error?: string } {
    const trimmed = (rawBody || '').trim();
    // Allow empty body
    if (!trimmed) return { ok: true, body: '' };

    if (method === 'POST_JSON') {
      try {
        const obj = JSON.parse(trimmed);
        return { ok: true, body: JSON.stringify(obj, null, 2) };
      } catch (e: any) {
        return { ok: false, body: trimmed, error: 'Body must be valid JSON for POST_JSON' };
      }
    }

    // For GET/POST (form), expect lines like: key: value;
    const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const normalized: string[] = [];
    for (const line of lines) {
      // allow comments starting with # or //
      if (line.startsWith('#') || line.startsWith('//')) continue;
      if (!line.includes(':')) {
        return { ok: false, body: trimmed, error: `Missing ':' in line: "${line}"` };
      }
      if (!line.endsWith(';')) {
        return { ok: false, body: trimmed, error: `Line must end with ';': "${line}"` };
      }
      const [keyRaw, ...rest] = line.slice(0, -1).split(':');
      const key = keyRaw.trim();
      if (!key || /[^A-Za-z0-9_]/.test(key)) {
        return { ok: false, body: trimmed, error: `Invalid parameter name: "${key}"` };
      }
      const value = rest.join(':').trim();
      if (value.length === 0) {
        return { ok: false, body: trimmed, error: `Empty value for parameter: "${key}"` };
      }
      normalized.push(`${key}: ${value};`);
    }
    return { ok: true, body: normalized.join('\n') };
  }

  // Автозагрузка при открытии страницы
  useEffect(() => {
    loadTemplates();
    loadAvailableTemplates();
  }, []);

  // Загружаем свежие шаблоны при открытии формы создания интеграции
  useEffect(() => {
    if (showAdd && step === 1) {
      loadAvailableTemplates();
    }
  }, [showAdd, step]);

  // Единообразно нормализуем Body при входе на шаг 2 или смене метода
  useEffect(() => {
    if (!showAdd || step !== 2) return;
    const current = form.body || '';
    const looksEncoded = current.includes('&') && current.includes('=');
    const looksJson = current.trim().startsWith('{') || current.trim().startsWith('[');
    if (looksEncoded || looksJson) {
      const normalized = toLinesFromAny(form.method, current);
      if (normalized !== current) {
        setForm(f => ({ ...f, body: normalized }));
      }
    }
  }, [showAdd, step, form.method]);

  async function addTemplate() {
    setLoading(true);
    try {
      // Validate body before saving
      const bodyCheck = validateAndNormalizeBody(form.method, form.body || '');
      if (!bodyCheck.ok) {
        showError(t('brokers.create_error'), bodyCheck.error || 'Invalid body');
        setLoading(false);
        return;
      }

      const code = form.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      // Validate PULL body before saving (works same way as main body)
      const pullBodyCheck = validateAndNormalizeBody(form.pullMethod, form.pullBody || '');
      if (!pullBodyCheck.ok) {
        showError(t('brokers.create_error'), pullBodyCheck.error || 'Invalid pull body');
        setLoading(false);
        return;
      }

      

      const payload = {
        code,
        name: form.name,
        templateName: form.templateName,
        isActive: form.isActive,
        method: form.method,
        url: form.url,
        headers: JSON.parse(form.headers),
        body: serializeForMethod(form.method, bodyCheck.body),
        params: form.params,
        // Password generation settings
        passwordLength: form.passwordLength,
        passwordUseUpper: form.passwordUseUpper,
        passwordUseLower: form.passwordUseLower,
        passwordUseDigits: form.passwordUseDigits,
        passwordUseSpecial: form.passwordUseSpecial,
        passwordSpecialChars: form.passwordSpecialChars,
        // Pull API fields
        pullEnabled: form.pullEnabled,
        pullUrl: form.pullUrl || null,
        pullMethod: form.pullMethod || 'POST',
        pullHeaders: form.pullHeaders ? JSON.parse(form.pullHeaders) : null,
        pullBody: form.pullMethod === 'GET' ? null : serializeForMethod(form.pullMethod, pullBodyCheck.body),
        pullInterval: form.pullInterval || 15
      };
      console.log('Отправляем:', payload);
      const result = await apiPost('/v1/templates', payload);
      console.log('Результат:', result);
      await loadTemplates();
      showSuccess(t('brokers.created_successfully'));
      resetForm();
    } catch (e: any) {
      console.error('Ошибка добавления:', e);
      showError(t('brokers.create_error'), e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function updateTemplate() {
    if (!editingId) return;
    setLoading(true);
    try {
      // Validate body before saving
      const bodyCheck = validateAndNormalizeBody(form.method, form.body || '');
      if (!bodyCheck.ok) {
        showError(t('brokers.create_error'), bodyCheck.error || 'Invalid body');
        setLoading(false);
        return;
      }

      const code = form.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      
      // Validate PULL body before saving (works same way as main body)
      const pullBodyCheck = validateAndNormalizeBody(form.pullMethod, form.pullBody || '');
      if (!pullBodyCheck.ok) {
        showError(t('brokers.update_error'), pullBodyCheck.error || 'Invalid pull body');
        setLoading(false);
        return;
      }
      
      const payload = {
        code,
        name: form.name,
        templateName: form.templateName,
        isActive: form.isActive,
        method: form.method,
        url: form.url,
        headers: JSON.parse(form.headers),
        body: serializeForMethod(form.method, bodyCheck.body),
        params: form.params,
        // Password generation settings
        passwordLength: form.passwordLength,
        passwordUseUpper: form.passwordUseUpper,
        passwordUseLower: form.passwordUseLower,
        passwordUseDigits: form.passwordUseDigits,
        passwordUseSpecial: form.passwordUseSpecial,
        passwordSpecialChars: form.passwordSpecialChars,
        // Pull API fields
        pullEnabled: form.pullEnabled,
        pullUrl: form.pullUrl || null,
        pullMethod: form.pullMethod || 'POST',
        pullHeaders: form.pullHeaders ? JSON.parse(form.pullHeaders) : null,
        pullBody: form.pullMethod === 'GET' ? null : serializeForMethod(form.pullMethod, pullBodyCheck.body),
        pullInterval: form.pullInterval || 15
      };
      console.log('Обновление интеграции:', editingId, payload);
      const result = await apiPatch(`/v1/templates/${editingId}`, payload);
      console.log('Результат обновления:', result);
      await loadTemplates();
      showSuccess(t('brokers.updated_successfully'));
      resetForm();
    } catch (e: any) {
      console.error('Ошибка обновления:', e);
      showError(t('brokers.update_error'), e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function deleteTemplate(id: string) {
    setConfirmDialog({
      isOpen: true,
      title: t('brokers.delete_confirm_title'),
      message: t('brokers.delete_confirm'),
      type: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          await apiDelete(`/v1/templates/${id}`);
          await loadTemplates();
          showSuccess(t('brokers.deleted_successfully'));
        } catch (e: any) {
          showError(t('brokers.delete_error'), e?.message || String(e));
        } finally {
          setLoading(false);
        }
      }
    });
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
      body: toLinesFromAny(template.method, template.body),
      params: template.params || {},
      // Password generation settings
      passwordLength: template.passwordLength || 8,
      passwordUseUpper: template.passwordUseUpper !== false,
      passwordUseLower: template.passwordUseLower !== false,
      passwordUseDigits: template.passwordUseDigits !== false,
      passwordUseSpecial: template.passwordUseSpecial !== false,
      passwordSpecialChars: template.passwordSpecialChars || '!@#$%',
      // Pull fields
      pullEnabled: template.pullEnabled || false,
      pullUrl: template.pullUrl || '',
      pullMethod: template.pullMethod || 'POST',
      pullHeaders: JSON.stringify(parsedPullHeaders, null, 2),
      pullBody: toLinesFromAny(template.pullMethod || 'POST', template.pullBody || ''),
      pullInterval: template.pullInterval || 15
    });

    setSelectedTemplate(template.code.toLowerCase());
  }

  function handleManualIntegration() {
    showError(t('brokers.manual_integration_not_implemented'));
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
      params: {},
      // Password generation settings
      passwordLength: 8,
      passwordUseUpper: true,
      passwordUseLower: true,
      passwordUseDigits: true,
      passwordUseSpecial: true,
      passwordSpecialChars: '!@#$%',
      pullEnabled: false,
      pullUrl: '',
      pullMethod: 'POST',
      pullHeaders: JSON.stringify({}, null, 2),
      pullBody: '',
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
        body: toLinesFromAny(config.method, config.bodyTemplate),
        params: config.params || {},
        // Password generation defaults from template
        passwordLength: config.passwordSettings?.length || 8,
        passwordUseUpper: config.passwordSettings?.useUpper !== false,
        passwordUseLower: config.passwordSettings?.useLower !== false,
        passwordUseDigits: config.passwordSettings?.useDigits !== false,
        passwordUseSpecial: config.passwordSettings?.useSpecial !== false,
        passwordSpecialChars: config.passwordSettings?.specialChars || '!@#$%',
        // Pull API configuration from template
        pullEnabled: config.pull?.enabled || false,
        pullUrl: config.pull?.url || '',
        pullMethod: config.pull?.method || 'POST',
        pullHeaders: config.pull?.headers ? JSON.stringify(config.pull.headers, null, 2) : JSON.stringify({}, null, 2),
        pullBody: toLinesFromAny(config.pull?.method || 'POST', config.pull?.bodyTemplate || ''),
        pullInterval: config.pull?.interval || 15
      }));
    }
  }

  return (
    <div className="space-y-4">
      <div className="page-container">
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{t('brokers.title')}</h1>
            <button
              className="btn-primary"
              onClick={() => setShowAdd(true)}
            >
              {t('brokers.create')}
            </button>
          </div>

        {showAdd && (
          <div className="space-y-4">
            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">{t('brokers.name')}</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={t('brokers.name_example')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">{t('brokers.template')}</label>
                  <CustomSelect
                    value={selectedTemplate}
                    options={availableTemplates.map(t => ({ value: t.id, label: t.name }))}
                    onChange={selectTemplate}
                    placeholder={t('common.select')}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleNext}
                    disabled={!form.name.trim() || !selectedTemplate}
                    className="btn-primary disabled:opacity-50"
                  >
                    {t('common.next')}
                  </button>
                  <button
                    type="button"
                    onClick={handleManualIntegration}
                    className="btn-secondary"
                  >
                    {t('brokers.manual_integration')}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn-secondary"
                  >
                    {t('common.cancel')}
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
                    {editingId ? `${t('brokers.edit')} "${form.name}"` : `Настройка параметров для "${form.name}"`}
                  </h3>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-2">{t('brokers.name')}</label>
                      <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={form.name || ''}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder={t('brokers.name_placeholder')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-2">{t('brokers.method')}</label>
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
                      <label className="block text-sm font-medium text-gray-800 mb-2">{t('brokers.url')}</label>
                      <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={form.url || ''}
                        onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                        placeholder={t('brokers.url_placeholder')}
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        {form.method === 'GET' ? t('brokers.url_hint_get') : t('brokers.url_hint_post')}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-2">{t('brokers.headers')}</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={6}
                        value={form.headers}
                        onChange={e => setForm(f => ({ ...f, headers: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-2">
                        {t('brokers.body')} {form.method === 'POST_JSON' ? '(JSON)' : '(params: key: value; per line)'}
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={12}
                        value={form.body || ''}
                        onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                        placeholder={form.method === 'POST_JSON' ? '{\n  "key": "value"\n}' : 'key1: value1;\nkey2: value2;'}
                      />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-800 mb-3">{t('brokers.available_macros')}</h4>
                      <div className="text-xs text-gray-700 space-y-1">
                        <div><code className="bg-white px-1 rounded">${'{firstName}'}</code> - {t('brokers.macro.firstName')}</div>
                        <div><code className="bg-white px-1 rounded">${'{lastName}'}</code> - {t('brokers.macro.lastName')}</div>
                        <div><code className="bg-white px-1 rounded">${'{email}'}</code> - {t('brokers.macro.email')}</div>
                        <div><code className="bg-white px-1 rounded">${'{phone}'}</code> - {t('brokers.macro.phone')}</div>
                        <div><code className="bg-white px-1 rounded">${'{phonePrefix}'}</code> - {t('brokers.macro.phonePrefix')}</div>
                        <div><code className="bg-white px-1 rounded">${'{phoneNumber}'}</code> - {t('brokers.macro.phoneNumber')}</div>
                        <div><code className="bg-white px-1 rounded">${'{password}'}</code> - {t('brokers.macro.password')}</div>
                        <div><code className="bg-white px-1 rounded">${'{country}'}</code> - {t('brokers.macro.country')}</div>
                        <div><code className="bg-white px-1 rounded">${'{aff}'}</code> - {t('brokers.macro.aff')}</div>
                        <div><code className="bg-white px-1 rounded">${'{bx}'}</code> - {t('brokers.macro.bx')}</div>
                        <div><code className="bg-white px-1 rounded">${'{funnel}'}</code> - {t('brokers.macro.funnel')}</div>
                        <div><code className="bg-white px-1 rounded">${'{ip}'}</code> - {t('brokers.macro.ip')}</div>
                        <div><code className="bg-white px-1 rounded">${'{lang}'}</code> - {t('brokers.macro.lang')}</div>
                        <div><code className="bg-white px-1 rounded">${'{url}'}</code> - {t('brokers.macro.url')}</div>
                        <div><code className="bg-white px-1 rounded">${'{clickid}'}</code> - {t('brokers.macro.clickid')}</div>
                        <div><code className="bg-white px-1 rounded">${'{utmSource}'}</code> - UTM Source</div>
                        <div><code className="bg-white px-1 rounded">${'{utmTerm}'}</code> - UTM Term</div>
                        <div><code className="bg-white px-1 rounded">${'{utmCampaign}'}</code> - UTM Campaign</div>
                        <div><code className="bg-white px-1 rounded">${'{utmMedium}'}</code> - UTM Medium</div>
                        <div><code className="bg-white px-1 rounded">${'{sub1}'}</code> - Sub1-Sub20</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Integration Parameters */}
                <div className="border-t pt-6 mt-6">
                  <h4 className="text-sm font-medium text-gray-800 mb-3">{t('brokers.integration_parameters')}</h4>
                  <p className="text-xs text-gray-700 mb-4">
                    {t('brokers.parameters_description')}
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(form.params).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-800 mb-2">{key}</label>
                        <div className="flex gap-2">
                          <input
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={String(value)}
                            onChange={e => setForm(f => ({
                              ...f,
                              params: { ...f.params, [key]: e.target.value }
                            }))}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newParams = { ...form.params };
                              delete newParams[key];
                              setForm(f => ({ ...f, params: newParams }));
                            }}
                            className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-xl hover:bg-red-200"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const key = prompt('Название параметра:');
                      if (key && !form.params[key]) {
                        setForm(f => ({ ...f, params: { ...f.params, [key]: '' } }));
                      }
                    }}
                    className="mt-3 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200"
                  >
                    {t('brokers.add_parameter')}
                  </button>
                </div>

                {/* Password Generation Settings */}
                <div className="border-t pt-6 mt-6">
                  <h4 className="text-sm font-medium text-gray-800 mb-3">{t('brokers.password_generation_settings')}</h4>
                  <p className="text-xs text-gray-700 mb-4">
                    {t('brokers.password_settings_description')}
                  </p>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-2">{t('brokers.password_length')}</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={form.passwordLength}
                        onChange={e => setForm(f => ({ ...f, passwordLength: parseInt(e.target.value) || 8 }))}
                        min="4"
                        max="32"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.passwordUseUpper}
                          onChange={e => setForm(f => ({ ...f, passwordUseUpper: e.target.checked }))}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm font-medium text-gray-800">{t('brokers.uppercase_letters')}</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.passwordUseLower}
                          onChange={e => setForm(f => ({ ...f, passwordUseLower: e.target.checked }))}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm font-medium text-gray-800">{t('brokers.lowercase_letters')}</span>
                      </label>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.passwordUseDigits}
                          onChange={e => setForm(f => ({ ...f, passwordUseDigits: e.target.checked }))}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm font-medium text-gray-800">{t('brokers.digits')}</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.passwordUseSpecial}
                          onChange={e => setForm(f => ({ ...f, passwordUseSpecial: e.target.checked }))}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm font-medium text-gray-800">{t('brokers.special_chars')}</span>
                      </label>
                    </div>
                  </div>
                  {form.passwordUseSpecial && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-800 mb-2">{t('brokers.which_special_chars')}</label>
                      <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={form.passwordSpecialChars}
                        onChange={e => setForm(f => ({ ...f, passwordSpecialChars: e.target.value }))}
                        placeholder="!@#$%"
                      />
                    </div>
                  )}
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
                    <label className="text-sm font-medium text-gray-800">
                      {t('brokers.enable_pull_api')}
                    </label>
                  </div>

                  {form.pullEnabled && (
                    <div className="grid md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-2">{t('brokers.method')}</label>
                          <CustomSelect
                            value={form.pullMethod}
                            onChange={(value) => setForm(f => ({ 
                              ...f, 
                              pullMethod: value,
                              pullBody: value === 'GET' ? '' : f.pullBody
                            }))}
                            options={[
                              { value: 'GET', label: 'GET' },
                              { value: 'POST', label: 'POST (form-urlencoded)' },
                              { value: 'POST_JSON', label: 'POST (JSON)' }
                            ]}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-2">{t('brokers.pull_url')}</label>
                          <input
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={form.pullUrl || ''}
                            onChange={e => setForm(f => ({ ...f, pullUrl: e.target.value }))}
                            placeholder="https://example.com/api/pull/customers"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-2">{t('brokers.pull_interval')}</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={form.pullInterval || 15}
                            onChange={e => setForm(f => ({ ...f, pullInterval: parseInt(e.target.value) || 15 }))}
                            min="5"
                            max="1440"
                          />
                          <p className="text-xs text-gray-700 mt-1">{t('brokers.pull_interval_description')}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-2">{t('brokers.pull_headers')}</label>
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={6}
                            value={form.pullHeaders}
                            onChange={e => setForm(f => ({ ...f, pullHeaders: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-2">
                            {t('brokers.pull_body')} {form.pullMethod === 'POST_JSON' ? '(JSON)' : '(params: key: value; per line)'}
                          </label>
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={8}
                            value={form.pullBody}
                            onChange={e => setForm(f => ({ ...f, pullBody: e.target.value }))}
                            placeholder={form.pullMethod === 'POST_JSON' ? '{\n  "ids": ["1","2"]\n}' : 'ids: ${leadIds};'}
                          />
                          <p className="text-xs text-gray-700 mt-1">
                            {t('brokers.pull_macros')}
                          </p>
                        </div>

                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <h4 className="text-sm font-medium text-blue-900 mb-2">ℹ️ {t('brokers.pull_info')}</h4>
                          <p className="text-xs text-blue-800">
                            {t('brokers.pull_info_description')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={editingId ? updateTemplate : addTemplate}
                    disabled={loading}
                    className="btn-primary disabled:opacity-50"
                  >
                    {loading ? (editingId ? t('common.updating') : t('common.adding')) : (editingId ? t('brokers.update_integration') : t('brokers.save_integration'))}
                  </button>
                  <button
                    type="button"
                    onClick={editingId ? resetForm : handleBack}
                    className="btn-secondary"
                  >
                    {editingId ? t('common.cancel') : t('common.back')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {templates.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">{t('brokers.no_integrations')}</p>
        ) : (
          <div className="space-y-2">
            {templates.map(template => {
              const getTemplateName = (code: string) => {
                if (code.startsWith('TRACKBOX')) return 'Trackbox';
                if (code.startsWith('CLICKFUNNELS')) return 'ClickFunnels';
                if (code.startsWith('MAILCHIMP')) return 'MailChimp';
                return t('brokers.unknown_template');
              };
              
              return (
              <div key={template.id} className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{template.name}</div>
                  <div className="text-sm text-gray-500 truncate">{template.templateName || getTemplateName(template.code)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                    onClick={() => editTemplate(template)}
                  >
                    {t('brokers.edit')}
                  </button>
                  <button
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    onClick={() => deleteTemplate(template.id)}
                  >
                    {t('brokers.delete')}
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        type={confirmDialog.type}
      />
      </div>
    </div>
  );
}
