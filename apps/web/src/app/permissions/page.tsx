'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { CustomSelect } from '@/components/CustomSelect';

type AffSettings = {
  aff: string;
  nameVisibility: 'SHOW' | 'MASK' | 'HIDE';
  emailVisibility: 'SHOW' | 'MASK' | 'HIDE';
  phoneVisibility: 'SHOW' | 'MASK' | 'HIDE';
};

export default function PermissionsPage() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [affiliates, setAffiliates] = useState<string[]>([]);
  const [selectedAff, setSelectedAff] = useState<string>('');
  const [settings, setSettings] = useState<AffSettings>({
    aff: '',
    nameVisibility: 'SHOW',
    emailVisibility: 'SHOW',
    phoneVisibility: 'SHOW',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAffiliates();
  }, []);

  useEffect(() => {
    if (selectedAff) {
      loadSettings(selectedAff);
    }
  }, [selectedAff]);

  async function loadAffiliates() {
    try {
      // Получаем список уникальных аффилиатов из лидов
      const leads = await apiGet('/v1/leads?take=1000');
      const affSet = new Set(leads.items.map((l: any) => l.aff).filter(Boolean));
      setAffiliates(Array.from(affSet));
    } catch (e: any) {
      console.error('Ошибка загрузки аффилиатов:', e);
    }
  }

  async function loadSettings(aff: string) {
    setLoading(true);
    try {
      const data = await apiGet(`/v1/permissions/${aff}`);
      setSettings(data || {
        aff,
        nameVisibility: 'SHOW',
        emailVisibility: 'SHOW',
        phoneVisibility: 'SHOW',
      });
    } catch (e: any) {
      setSettings({
        aff,
        nameVisibility: 'SHOW',
        emailVisibility: 'SHOW',
        phoneVisibility: 'SHOW',
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!selectedAff) {
      showError(t('common.error'), 'Выберите аффилиата');
      return;
    }

    setLoading(true);
    try {
      await apiPatch(`/v1/permissions/${selectedAff}`, settings);
      showSuccess('Настройки сохранены');
    } catch (e: any) {
      showError(t('common.error'), e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const visibilityOptions = [
    { value: 'SHOW', label: 'Показывать полностью' },
    { value: 'MASK', label: 'Маскировать (****)' },
    { value: 'HIDE', label: 'Скрывать полностью' },
  ];

  return (
    <div className="space-y-4">
      <div className="page-container">
        <div className="card p-6 space-y-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Настройки доступов</h1>
            <p className="text-sm text-gray-600 mt-2">
              Управление видимостью полей для аффилиатов
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">Выберите аффилиата</label>
            <CustomSelect
              value={selectedAff}
              onChange={setSelectedAff}
              options={[
                { value: '', label: 'Выберите аффилиата' },
                ...affiliates.map(aff => ({ value: aff, label: aff }))
              ]}
            />
          </div>

          {selectedAff && (
            <>
              <div className="border-t pt-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Настройки видимости для {selectedAff}</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">Имя (Name)</label>
                    <CustomSelect
                      value={settings.nameVisibility}
                      onChange={(value) => setSettings({ ...settings, nameVisibility: value as any })}
                      options={visibilityOptions}
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      MASK: отображается как "J*** D***"
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">Email</label>
                    <CustomSelect
                      value={settings.emailVisibility}
                      onChange={(value) => setSettings({ ...settings, emailVisibility: value as any })}
                      options={visibilityOptions}
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      MASK: отображается как "jo***@example.com"
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">Телефон (Phone)</label>
                    <CustomSelect
                      value={settings.phoneVisibility}
                      onChange={(value) => setSettings({ ...settings, phoneVisibility: value as any })}
                      options={visibilityOptions}
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      MASK: отображается как "***45"
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveSettings}
                  disabled={loading}
                  className="btn-primary disabled:opacity-50"
                >
                  {loading ? 'Сохранение...' : 'Сохранить настройки'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

