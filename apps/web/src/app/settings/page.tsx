'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import { useTimezone } from '@/contexts/TimezoneContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { CustomSelect } from '@/components/CustomSelect';

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const { showSuccess, showError } = useToast();
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
      showError(t('common.error'), e?.message || String(e));
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
      showSuccess(t('settings.saved'));
      
      // Обновляем локальные контексты
      setTheme(settings.theme as any);
      setLanguage(settings.language as any);
      
      // Принудительно обновляем часовой пояс во всех компонентах
      await forceRefresh();
    } catch (e: any) {
      console.error('Ошибка сохранения настроек:', e);
      showError(t('common.error'), e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="page-container">
        <div className="card p-6 space-y-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
          </div>
        {/* Часовой пояс */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('settings.timezone')}</h2>
          <p className="text-sm text-gray-700 mb-4">
            {t('settings.timezone.description')}
          </p>
          
          <div className="max-w-md">
            <CustomSelect
              value={settings.timezone}
              onChange={timezone => setSettings(s => ({ ...s, timezone }))}
              options={[
                { value: 'UTC', label: 'UTC (GMT+0)' },
                { value: 'Europe/London', label: '🇬🇧 London (GMT+0/+1)' },
                { value: 'Europe/Paris', label: '🇫🇷 Paris (GMT+1/+2)' },
                { value: 'Europe/Berlin', label: '🇩🇪 Berlin (GMT+1/+2)' },
                { value: 'Europe/Rome', label: '🇮🇹 Rome (GMT+1/+2)' },
                { value: 'Europe/Madrid', label: '🇪🇸 Madrid (GMT+1/+2)' },
                { value: 'Europe/Amsterdam', label: '🇳🇱 Amsterdam (GMT+1/+2)' },
                { value: 'Europe/Brussels', label: '🇧🇪 Brussels (GMT+1/+2)' },
                { value: 'Europe/Vienna', label: '🇦🇹 Vienna (GMT+1/+2)' },
                { value: 'Europe/Zurich', label: '🇨🇭 Zurich (GMT+1/+2)' },
                { value: 'Europe/Stockholm', label: '🇸🇪 Stockholm (GMT+1/+2)' },
                { value: 'Europe/Oslo', label: '🇳🇴 Oslo (GMT+1/+2)' },
                { value: 'Europe/Copenhagen', label: '🇩🇰 Copenhagen (GMT+1/+2)' },
                { value: 'Europe/Helsinki', label: '🇫🇮 Helsinki (GMT+2/+3)' },
                { value: 'Europe/Warsaw', label: '🇵🇱 Warsaw (GMT+1/+2)' },
                { value: 'Europe/Prague', label: '🇨🇿 Prague (GMT+1/+2)' },
                { value: 'Europe/Budapest', label: '🇭🇺 Budapest (GMT+1/+2)' },
                { value: 'Europe/Bucharest', label: '🇷🇴 Bucharest (GMT+2/+3)' },
                { value: 'Europe/Sofia', label: '🇧🇬 Sofia (GMT+2/+3)' },
                { value: 'Europe/Athens', label: '🇬🇷 Athens (GMT+2/+3)' },
                { value: 'Europe/Istanbul', label: '🇹🇷 Istanbul (GMT+3)' },
                { value: 'Europe/Moscow', label: '🇷🇺 Moscow (GMT+3)' },
                { value: 'Europe/Kiev', label: '🇺🇦 Kiev (GMT+2/+3)' },
                { value: 'America/New_York', label: '🇺🇸 New York (GMT-5/-4)' },
                { value: 'America/Chicago', label: '🇺🇸 Chicago (GMT-6/-5)' },
                { value: 'America/Denver', label: '🇺🇸 Denver (GMT-7/-6)' },
                { value: 'America/Los_Angeles', label: '🇺🇸 Los Angeles (GMT-8/-7)' },
                { value: 'America/Toronto', label: '🇨🇦 Toronto (GMT-5/-4)' },
                { value: 'America/Vancouver', label: '🇨🇦 Vancouver (GMT-8/-7)' },
                { value: 'America/Sao_Paulo', label: '🇧🇷 São Paulo (GMT-3)' },
                { value: 'America/Argentina/Buenos_Aires', label: '🇦🇷 Buenos Aires (GMT-3)' },
                { value: 'America/Mexico_City', label: '🇲🇽 Mexico City (GMT-6/-5)' },
                { value: 'Asia/Tokyo', label: '🇯🇵 Tokyo (GMT+9)' },
                { value: 'Asia/Shanghai', label: '🇨🇳 Shanghai (GMT+8)' },
                { value: 'Asia/Hong_Kong', label: '🇭🇰 Hong Kong (GMT+8)' },
                { value: 'Asia/Singapore', label: '🇸🇬 Singapore (GMT+8)' },
                { value: 'Asia/Seoul', label: '🇰🇷 Seoul (GMT+9)' },
                { value: 'Asia/Bangkok', label: '🇹🇭 Bangkok (GMT+7)' },
                { value: 'Asia/Jakarta', label: '🇮🇩 Jakarta (GMT+7)' },
                { value: 'Asia/Kolkata', label: '🇮🇳 Mumbai (GMT+5:30)' },
                { value: 'Asia/Dubai', label: '🇦🇪 Dubai (GMT+4)' },
                { value: 'Asia/Riyadh', label: '🇸🇦 Riyadh (GMT+3)' },
                { value: 'Asia/Tehran', label: '🇮🇷 Tehran (GMT+3:30/+4:30)' },
                { value: 'Asia/Karachi', label: '🇵🇰 Karachi (GMT+5)' },
                { value: 'Asia/Dhaka', label: '🇧🇩 Dhaka (GMT+6)' },
                { value: 'Australia/Sydney', label: '🇦🇺 Sydney (GMT+10/+11)' },
                { value: 'Australia/Melbourne', label: '🇦🇺 Melbourne (GMT+10/+11)' },
                { value: 'Australia/Perth', label: '🇦🇺 Perth (GMT+8)' },
                { value: 'Pacific/Auckland', label: '🇳🇿 Auckland (GMT+12/+13)' },
              ]}
            />
          </div>
        </div>

        {/* Цветовая схема */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('settings.theme')}</h2>
          <p className="text-sm text-gray-700 mb-4">
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
          <p className="text-sm text-gray-700 mb-4">
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
            className="btn-primary disabled:opacity-50"
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
