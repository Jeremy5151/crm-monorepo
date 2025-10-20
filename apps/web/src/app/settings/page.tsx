'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import { TimezoneSelector } from '@/components/TimezoneSelector';
import { useTimezone } from '@/contexts/TimezoneContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { CustomSelect } from '@/components/CustomSelect';

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const [settings, setSettings] = useState({ 
    timezone: 'UTC', 
    theme: 'light', 
    language: language 
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const { forceRefresh } = useTimezone();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    loadSettings();
  }, [language]);

  // Update settings.language when language context changes
  useEffect(() => {
    setSettings(prev => ({ ...prev, language }));
  }, [language]);

  async function loadSettings() {
    try {
      const data = await apiGet('/v1/settings');
      setSettings({ ...data, language }); // Use current language from context
    } catch (e: any) {
      console.error('Ошибка загрузки настроек:', e);
      alert('Ошибка загрузки настроек: ' + (e?.message || String(e)));
    }
  }

  async function saveSettings() {
    setLoading(true);
    try {
      await apiPatch('/v1/settings', { 
        timezone: settings.timezone,
        theme: settings.theme,
        language: settings.language
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      
      // Обновляем локальные контексты
      setTheme(settings.theme as any);
      setLanguage(settings.language as any);
      
      // Принудительно обновляем часовой пояс во всех компонентах
      await forceRefresh();
    } catch (e: any) {
      console.error('Ошибка сохранения настроек:', e);
      alert('Ошибка сохранения настроек: ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="page-container">
        <h1 className="text-2xl font-semibold text-gray-900">{t('settings.title')}</h1>

      <div className="card p-6 space-y-6">
        {/* Часовой пояс */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('settings.timezone')}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('settings.timezone.description')}
          </p>
          
          <div className="max-w-md">
            <TimezoneSelector
              value={settings.timezone}
              onChange={timezone => setSettings(s => ({ ...s, timezone }))}
            />
          </div>
        </div>

        {/* Цветовая схема */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('settings.theme')}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('settings.theme.description')}
          </p>
          
          <div className="max-w-md">
            <CustomSelect
              value={settings.theme}
              onChange={(value) => setSettings(s => ({ ...s, theme: value }))}
              options={[
                { value: 'light', label: t('theme.light') },
                { value: 'dark', label: t('theme.dark') },
                { value: 'auto', label: t('theme.auto') }
              ]}
              placeholder={t('settings.theme')}
            />
          </div>
        </div>

        {/* Язык интерфейса */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('settings.language')}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('settings.language.description')}
          </p>
          
          <div className="max-w-md">
            <CustomSelect
              value={settings.language}
              onChange={(value) => setSettings(s => ({ ...s, language: value }))}
              options={[
                { value: 'ru', label: 'Русский' },
                { value: 'en', label: 'English' }
              ]}
              placeholder={t('settings.language')}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={saveSettings}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-yellow-500 text-white font-medium hover:bg-yellow-600 disabled:opacity-50 transition-colors"
          >
            {loading ? t('settings.saving') : t('settings.save')}
          </button>
          
          {saved && (
            <div className="flex items-center gap-2 text-green-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm">{t('settings.saved')}</span>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
