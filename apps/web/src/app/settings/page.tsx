'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
import { useTimezone } from '@/contexts/TimezoneContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { CustomSelect } from '@/components/CustomSelect';

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [settings, setSettings] = useState<{ 
    timezone: string;
    theme: string;
    language: Language;
    accentColor: string;
  }>({ 
    timezone: 'UTC', 
    theme: 'light', 
    language,
    accentColor: '#FFD666'
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

  // Function to update CSS variables
  const updateCSSVariables = (accentColor: string) => {
    if (!accentColor) return; // Exit if accentColor is undefined or empty
    
    // Convert hex to RGB
    const hex = accentColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate hover color (darker)
    const hoverR = Math.max(0, r - Math.round(r * 0.1));
    const hoverG = Math.max(0, g - Math.round(g * 0.1));
    const hoverB = Math.max(0, b - Math.round(b * 0.1));
    
    // Calculate light color (lighter)
    const lightR = Math.min(255, r + Math.round((255 - r) * 0.3));
    const lightG = Math.min(255, g + Math.round((255 - g) * 0.3));
    const lightB = Math.min(255, b + Math.round((255 - b) * 0.3));
    
    // Create or update style element to inject CSS variables
    let styleElement = document.getElementById('dynamic-css-variables');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'dynamic-css-variables';
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = `:root {
      --primary: rgb(${r}, ${g}, ${b});
      --primary-hover: rgb(${hoverR}, ${hoverG}, ${hoverB});
      --primary-light: rgb(${lightR}, ${lightG}, ${lightB});
      --bg-gradient: linear-gradient(352deg, rgb(${lightR}, ${lightG}, ${lightB}), #E4E6E7);
    }`;
  };

  // Update CSS variables when accent color changes
  useEffect(() => {
    if (settings.accentColor) {
      updateCSSVariables(settings.accentColor);
    }
  }, [settings.accentColor]);

  async function loadSettings() {
    try {
      // Сначала пробуем загрузить из localStorage для быстрого отображения
      const savedSettings = localStorage.getItem('crm-settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          // Используем сохраненные настройки, но приоритет отдаем актуальному языку
          setSettings({ 
            ...parsed, 
            language,
            // Убеждаемся, что accentColor не undefined
            accentColor: parsed.accentColor || '#FFD666'
          });
        } catch (e) {
          console.warn('Failed to parse saved settings:', e);
        }
      }
      
      // Затем загружаем актуальные данные с сервера
      const data = await apiGet('/v1/settings');
      setSettings({ 
        ...data, 
        language: language, // Use current language from context
        // Убеждаемся, что accentColor не undefined
        accentColor: data.accentColor || '#FFD666'
      });
      
      // Обновляем localStorage актуальными данными
      localStorage.setItem('crm-settings', JSON.stringify({
        timezone: data.timezone,
        theme: data.theme,
        language: (data.language as Language) ?? language,
        accentColor: data.accentColor || '#FFD666'
      }));
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
        language: settings.language,
        accentColor: settings.accentColor
      });
      showSuccess(t('settings.saved'));
      
      // Сохраняем настройки в localStorage для быстрого доступа
      localStorage.setItem('crm-settings', JSON.stringify({
        timezone: settings.timezone,
        theme: settings.theme,
        language: settings.language,
        accentColor: settings.accentColor
      }));
      
      // Обновляем локальные контексты
      setTheme(settings.theme as any);
      setLanguage(settings.language as Language);
      
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

        {/* Акцентный цвет */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('settings.accentColor')}</h2>
          <p className="text-sm text-gray-700 mb-4">
            {t('settings.accentColor.description')}
          </p>
          
          <div className="max-w-md space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={settings.accentColor}
                onChange={(e) => setSettings(s => ({ ...s, accentColor: e.target.value }))}
                className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={settings.accentColor}
                  onChange={(e) => setSettings(s => ({ ...s, accentColor: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#FFD666"
                />
              </div>
            </div>
            
            {/* Предустановленные цвета */}
            <div className="grid grid-cols-6 gap-2">
              {[
                '#FFD666', '#60A5FA', '#34D399', '#F472B6', '#A78BFA', '#FBBF24',
                '#EF4444', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EC4899'
              ].map((color) => (
                <button
                  key={color}
                  onClick={() => setSettings(s => ({ ...s, accentColor: color }))}
                  className={`w-8 h-8 rounded-lg border-2 ${
                    settings.accentColor === color ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
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
              onChange={(value) => setSettings(s => ({ ...s, language: value as Language }))}
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
