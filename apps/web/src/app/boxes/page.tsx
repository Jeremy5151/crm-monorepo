'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import CustomSelect from '@/components/CustomSelect';

type Box = {
  id: string;
  name: string;
  country: string | null;
  isActive: boolean;
  brokers: {
    id: string;
    priority: number;
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

const COUNTRIES = [
  { value: '', label: 'Любая страна' },
  { value: 'US', label: '🇺🇸 США' },
  { value: 'GB', label: '🇬🇧 Великобритания' },
  { value: 'DE', label: '🇩🇪 Германия' },
  { value: 'FR', label: '🇫🇷 Франция' },
  { value: 'ES', label: '🇪🇸 Испания' },
  { value: 'IT', label: '🇮🇹 Италия' },
  { value: 'NL', label: '🇳🇱 Нидерланды' },
  { value: 'PL', label: '🇵🇱 Польша' },
  { value: 'CZ', label: '🇨🇿 Чехия' },
  { value: 'AT', label: '🇦🇹 Австрия' },
];

export default function BoxesPage() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    name: '',
    country: '',
    isActive: true,
    brokers: [] as { brokerId: string; priority: number }[]
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
      alert('Укажите название бокса');
      return;
    }

    if (form.brokers.length === 0) {
      alert('Добавьте хотя бы одного брокера');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        country: form.country || null,
        isActive: form.isActive,
        brokers: form.brokers
      };

      if (editingId) {
        await apiPatch(`/v1/boxes/${editingId}`, payload);
        alert('Бокс обновлен!');
      } else {
        await apiPost('/v1/boxes', payload);
        alert('Бокс создан!');
      }

      await loadBoxes();
      resetForm();
    } catch (e: any) {
      console.error('Ошибка сохранения:', e);
      alert('Ошибка: ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  async function deleteBox(id: string) {
    if (!confirm('Удалить бокс?')) return;
    setLoading(true);
    try {
      await apiDelete(`/v1/boxes/${id}`);
      await loadBoxes();
    } catch (e: any) {
      alert('Ошибка: ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  function editBox(box: Box) {
    setEditingId(box.id);
    setShowAdd(true);
    setForm({
      name: box.name,
      country: box.country || '',
      isActive: box.isActive,
      brokers: box.brokers.map(b => ({
        brokerId: b.broker.id,
        priority: b.priority
      }))
    });
  }

  function resetForm() {
    setShowAdd(false);
    setEditingId(null);
    setForm({
      name: '',
      country: '',
      isActive: true,
      brokers: []
    });
  }

  function addBroker() {
    const availablePriorities = Array.from({ length: 10 }, (_, i) => i + 1)
      .filter(p => !form.brokers.some(b => b.priority === p));
    
    if (availablePriorities.length === 0) {
      alert('Максимум 10 брокеров в боксе');
      return;
    }

    setForm(f => ({
      ...f,
      brokers: [...f.brokers, { brokerId: '', priority: availablePriorities[0] }]
    }));
  }

  function updateBroker(index: number, field: 'brokerId' | 'priority', value: string | number) {
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

  function getCountryFlag(code: string | null) {
    if (!code) return '🌍';
    const country = COUNTRIES.find(c => c.value === code);
    return country?.label.split(' ')[0] || code;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Боксы (планы отправки)</h1>

      <div className="card p-6 space-y-4">
        {!showAdd && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Боксы определяют приоритетность отправки лидов на брокеров
            </p>
            <button
              className="px-3 py-2 text-sm rounded-xl bg-yellow-500 text-white hover:bg-yellow-600"
              onClick={() => setShowAdd(true)}
            >
              Добавить бокс
            </button>
          </div>
        )}

        {showAdd && (
          <div className="space-y-4 border-b pb-6">
            <h3 className="text-lg font-medium text-gray-900">
              {editingId ? 'Редактирование бокса' : 'Новый бокс'}
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Например: EU Premium"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Страна</label>
                <CustomSelect
                  value={form.country}
                  onChange={value => setForm(f => ({ ...f, country: value }))}
                  options={COUNTRIES}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Брокеры (приоритет 1 = самый высокий)
                </label>
                <button
                  type="button"
                  onClick={addBroker}
                  disabled={form.brokers.length >= 10}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 disabled:opacity-50"
                >
                  + Добавить брокера
                </button>
              </div>

              {form.brokers.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Добавьте брокеров с приоритетами
                </p>
              )}

              <div className="space-y-2">
                {form.brokers.map((broker, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <CustomSelect
                        value={broker.brokerId}
                        onChange={value => updateBroker(index, 'brokerId', value)}
                        options={[
                          { value: '', label: 'Выберите брокера' },
                          ...brokers.map(b => ({ value: b.id, label: `${b.name} (${b.code})` }))
                        ]}
                      />
                    </div>
                    <div className="w-32">
                      <CustomSelect
                        value={String(broker.priority)}
                        onChange={value => updateBroker(index, 'priority', parseInt(value))}
                        options={Array.from({ length: 10 }, (_, i) => ({
                          value: String(i + 1),
                          label: `Приоритет ${i + 1}`
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
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={saveBox}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-yellow-500 text-white font-medium hover:bg-yellow-600 disabled:opacity-50"
              >
                {editingId ? 'Сохранить' : 'Создать'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {boxes.length === 0 && !loading && (
            <p className="text-center text-gray-500 py-8">Боксов пока нет</p>
          )}

          {boxes.map(box => (
            <div key={box.id} className="border rounded-xl p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getCountryFlag(box.country)}</span>
                  <div>
                    <h3 className="font-medium text-gray-900">{box.name}</h3>
                    <p className="text-sm text-gray-500">
                      {box.country ? COUNTRIES.find(c => c.value === box.country)?.label || box.country : 'Любая страна'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${box.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {box.isActive ? 'Активен' : 'Неактивен'}
                  </span>
                  <button
                    onClick={() => editBox(box)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => deleteBox(box.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-xl hover:bg-red-200"
                  >
                    Удалить
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <p className="text-sm font-medium text-gray-700">План отправки:</p>
                {box.brokers.map((b, i) => (
                  <div key={b.id} className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                      {b.priority}
                    </span>
                    <span>{b.broker.name}</span>
                    <span className="text-gray-400">({b.broker.code})</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

