'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { CustomSelect } from '@/components/CustomSelect';
import { CountryMultiSelect } from '@/components/CountryMultiSelect';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';

type Box = {
  id: string;
  name: string;
  countries: string[];
  isActive: boolean;
  brokers: {
    id: string;
    priority: number;
    deliveryEnabled: boolean;
    deliveryFrom: string | null;
    deliveryTo: string | null;
    leadCap: number | null;
    broker: {
      id: string;
      name: string;
      code: string;
    };
  }[];
  createdAt: string;
};

type Broker = {
  id: string;
  name: string;
  code: string;
};


export default function BoxesPage() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    name: '',
    countries: [] as string[],
    isActive: true,
    brokers: [] as { 
      brokerId: string; 
      priority: number;
      deliveryEnabled: boolean;
      deliveryFrom: string;
      deliveryTo: string;
      leadCap: number | null;
    }[]
  });

  useEffect(() => {
    loadBoxes();
    loadBrokers();
  }, []);

  async function loadBoxes() {
    setLoading(true);
    try {
      const data = await apiGet('/v1/boxes');
      setBoxes(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Ошибка загрузки боксов:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadBrokers() {
    try {
      const data = await apiGet('/v1/templates');
      setBrokers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Ошибка загрузки брокеров:', e);
    }
  }

  async function saveBox() {
    if (!form.name.trim()) {
      showError(t('common.error'), 'Укажите название бокса');
      return;
    }

    if (form.brokers.length === 0) {
      showError(t('common.error'), 'Добавьте хотя бы одного брокера');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        countries: form.countries,
        isActive: form.isActive,
        brokers: form.brokers
      };

      if (editingId) {
        await apiPatch(`/v1/boxes/${editingId}`, payload);
        showSuccess(t('boxes.updated_successfully'));
        await loadBoxes();
        resetForm();
      } else {
        const createdBox = await apiPost('/v1/boxes', payload);
        // После создания показываем ID нового бокса
        if (createdBox?.id) {
          showSuccess(
            t('boxes.created_successfully'), 
            `Box ID: ${createdBox.id} (используйте этот ID в параметре bx)`
          );
          // Загружаем боксы, чтобы обновить список
          await loadBoxes();
          // Устанавливаем editingId, чтобы показать ID в форме
          setEditingId(createdBox.id);
          // Форма остается открытой, ID будет показан в желтом блоке
        } else {
          showSuccess(t('boxes.created_successfully'));
          await loadBoxes();
          resetForm();
        }
      }
    } catch (e: any) {
      console.error('Ошибка сохранения:', e);
      showError(t('boxes.save_error'), e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function deleteBox(id: string) {
    setConfirmDialog({
      isOpen: true,
      title: t('boxes.delete_confirm_title'),
      message: t('boxes.confirm_delete'),
      type: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          await apiDelete(`/v1/boxes/${id}`);
          await loadBoxes();
          showSuccess(t('boxes.deleted_successfully'));
        } catch (e: any) {
          showError(t('boxes.delete_error'), e?.message || String(e));
        } finally {
          setLoading(false);
        }
      }
    });
  }

  function editBox(box: Box) {
    setEditingId(box.id);
    setShowAdd(true);
        setForm({
          name: box.name,
          countries: box.countries || [],
          isActive: box.isActive,
          brokers: box.brokers.map(b => ({
            brokerId: b.broker.id,
            priority: b.priority,
            deliveryEnabled: b.deliveryEnabled || false,
            deliveryFrom: b.deliveryFrom || '09:00',
            deliveryTo: b.deliveryTo || '18:00',
            leadCap: b.leadCap
          }))
        });
  }

  function resetForm() {
    setShowAdd(false);
    setEditingId(null);
    setForm({
      name: '',
      countries: [],
      isActive: true,
      brokers: []
    });
  }

  function addBroker() {
    const availablePriorities = Array.from({ length: 10 }, (_, i) => i + 1)
      .filter(p => !form.brokers.some(b => b.priority === p));
    
    if (availablePriorities.length === 0) {
      showError(t('boxes.max_brokers_error'));
      return;
    }

        setForm(f => ({
          ...f,
          brokers: [...f.brokers, { 
            brokerId: '', 
            priority: availablePriorities[0],
            deliveryEnabled: false,
            deliveryFrom: '09:00',
            deliveryTo: '18:00',
            leadCap: null
          }]
        }));
  }

  function updateBroker(index: number, field: 'brokerId' | 'priority' | 'deliveryEnabled' | 'deliveryFrom' | 'deliveryTo' | 'leadCap', value: string | number | boolean | null) {
    setForm(f => ({
      ...f,
      brokers: f.brokers.map((b, i) => i === index ? { ...b, [field]: value } : b)
    }));
  }

  function removeBroker(index: number) {
    setForm(f => ({
      ...f,
      brokers: f.brokers.filter((_, i) => i !== index)
    }));
  }


  return (
    <div className="space-y-4">
      <div className="page-container">
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{t('boxes.title')}</h1>
            <button
              className="btn-primary"
              onClick={() => setShowAdd(true)}
            >
              {t('boxes.create')}
            </button>
          </div>

        {!showAdd && (
          <div>
            <p className="text-sm text-gray-700">
              {t('boxes.description_text')}
            </p>
          </div>
        )}

        {showAdd && (
          <div className="space-y-4 border-b pb-6">
            <h3 className="text-lg font-medium text-gray-900">
              {editingId ? t('boxes.edit') : t('boxes.new_box')}
            </h3>

            {editingId && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-yellow-800 mb-1">
                      Box ID (используйте этот ID в параметре bx):
                    </label>
                    <code className="text-sm font-mono text-yellow-900 bg-yellow-100 px-3 py-2 rounded-lg">
                      {editingId}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(editingId);
                      showSuccess(t('common.success'), 'ID скопирован в буфер обмена');
                    }}
                    className="px-3 py-2 text-sm bg-yellow-200 text-yellow-800 rounded-xl hover:bg-yellow-300"
                  >
                    📋 Копировать
                  </button>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">{t('boxes.name')}</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={t('boxes.name_placeholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">{t('boxes.countries')}</label>
                <CountryMultiSelect
                  value={form.countries}
                  onChange={countries => setForm(f => ({ ...f, countries }))}
                  placeholder={t('boxes.countries_placeholder')}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-800">
                  {t('boxes.brokers')}
                </label>
                <button
                  type="button"
                  onClick={addBroker}
                  disabled={form.brokers.length >= 10}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 disabled:opacity-50"
                >
                  {t('boxes.add_broker')}
                </button>
              </div>

              {form.brokers.length === 0 && (
                <p className="text-sm text-gray-600 text-center py-4">
                  {t('boxes.brokers_instruction')}
                </p>
              )}

              <div className="space-y-3">
                {form.brokers.map((broker, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex gap-2 items-center mb-2">
                      <div className="flex-1">
                        <CustomSelect
                          value={broker.brokerId}
                          onChange={value => updateBroker(index, 'brokerId', value)}
                          options={[
                            { value: '', label: t('boxes.select_broker') },
                            ...brokers.map(b => ({ value: b.id, label: b.name }))
                          ]}
                        />
                      </div>
                      <div className="w-20">
                        <CustomSelect
                          value={String(broker.priority)}
                          onChange={value => updateBroker(index, 'priority', parseInt(value))}
                          options={Array.from({ length: 10 }, (_, i) => ({
                            value: String(i + 1),
                            label: String(i + 1)
                          }))}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBroker(index)}
                        className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-xl hover:bg-red-200"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={broker.deliveryEnabled}
                          onChange={e => updateBroker(index, 'deliveryEnabled', e.target.checked)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm font-medium text-gray-800">{t('boxes.delivery_time')}</span>
                      </label>
                      
                      {broker.deliveryEnabled && (
                        <>
                          <input
                            type="time"
                            value={broker.deliveryFrom}
                            onChange={e => updateBroker(index, 'deliveryFrom', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-xl text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-800">—</span>
                          <input
                            type="time"
                            value={broker.deliveryTo}
                            onChange={e => updateBroker(index, 'deliveryTo', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-xl text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3">
                      <label className="text-sm font-medium text-gray-800">{t('boxes.lead_cap')}</label>
                      <input
                        type="number"
                        value={broker.leadCap || ''}
                        onChange={e => updateBroker(index, 'leadCap', e.target.value ? parseInt(e.target.value) : null)}
                        className="px-3 py-2 border border-gray-300 rounded-xl text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="∞"
                        min="1"
                      />
                      <span className="text-xs font-medium text-gray-800">{t('boxes.lead_cap_hint')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveBox}
                disabled={loading}
                className="btn-primary disabled:opacity-50"
              >
                {editingId ? t('common.save') : t('common.create')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {boxes.length === 0 && !loading && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">{t('boxes.no_boxes')}</p>
          )}

          {boxes.map(box => (
            <div key={box.id} className="border rounded-xl p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">{box.name}</h3>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(box.id);
                          showSuccess(t('common.success'), 'ID скопирован в буфер обмена');
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700"
                        title="Копировать ID"
                      >
                        📋
                      </button>
                    </div>
                    <div className="mb-1">
                      <code className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        ID: {box.id}
                      </code>
                    </div>
                    <p className="text-sm text-gray-500">
                      {box.countries.length > 0 
                        ? `${t('boxes.countries_label')} ${box.countries.join(', ')}` 
                        : t('boxes.countries_all')
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${box.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {box.isActive ? t('boxes.is_active') : t('users.inactive')}
                  </span>
                  <button
                    onClick={() => editBox(box)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200"
                  >
                    {t('boxes.edit')}
                  </button>
                  <button
                    onClick={() => deleteBox(box.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-xl hover:bg-red-200"
                  >
                    {t('boxes.delete')}
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <p className="text-sm font-medium text-gray-700">{t('boxes.delivery_plan')}</p>
                    {box.brokers.map((b, i) => (
                      <div key={b.id} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                          {b.priority}
                        </span>
                        <span>{b.broker.name}</span>
                        {b.deliveryEnabled && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {b.deliveryFrom}-{b.deliveryTo}
                          </span>
                        )}
                        {b.leadCap && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            капа: {b.leadCap}
                          </span>
                        )}
                      </div>
                    ))}
              </div>
            </div>
          ))}
        </div>
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

