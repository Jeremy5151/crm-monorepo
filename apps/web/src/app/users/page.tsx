'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CustomSelect } from '@/components/CustomSelect';

interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  role: string;
  isActive: boolean;
  apiKey: string;
  timezone: string;
  language: string;
  parentId: string | null;
  createdAt: string;
}

interface CreateUserData {
  email: string;
  name: string;
  password: string;
  role: string;
  isActive: boolean;
  timezone: string;
  language: string;
  parentId?: string;
}

export default function UsersPage() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    name: '',
    password: '',
    role: 'AFFILIATE',
    isActive: true,
    timezone: 'UTC',
    language: 'en',
  });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning' as 'warning' | 'danger',
    onConfirm: () => {},
  });
  const [permissionsModal, setPermissionsModal] = useState({
    isOpen: false,
    userId: '',
    userName: '',
    aff: '',
  });
  const [permissionsSettings, setPermissionsSettings] = useState({
    nameVisibility: 'SHOW' as 'SHOW' | 'MASK' | 'HIDE',
    emailVisibility: 'SHOW' as 'SHOW' | 'MASK' | 'HIDE',
    phoneVisibility: 'SHOW' as 'SHOW' | 'MASK' | 'HIDE',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await apiGet('/v1/users');
      setUsers(data.users || data);
    } catch (error) {
      showError(t('users.load_error'));
    } finally {
      setLoading(false);
    }
  }

  async function createUser() {
    // Валидация обязательных полей
    if (!formData.email || !formData.password || !formData.name) {
      showError(t('common.error'), 'Email, password and name are required');
      return;
    }

    try {
      await apiPost('/v1/users', formData);
      showSuccess(t('users.create_success'));
      setShowForm(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      const message = parseValidationError(error);
      showError(message);
    }
  }

  async function updateUser() {
    if (!editingId) return;
    try {
      const updateData = { ...formData };
      if (!updateData.password) delete (updateData as any).password;
      await apiPatch(`/v1/users/${editingId}`, updateData);
      showSuccess(t('users.update_success'));
      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadUsers();
    } catch (error: any) {
      const message = parseValidationError(error);
      showError(message);
    }
  }

  async function deleteUser(user: User) {
    setConfirmDialog({
      isOpen: true,
      title: t('users.delete_confirm_title'),
      message: t('users.delete_confirm_message', { name: user.name }),
      type: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await apiDelete(`/v1/users/${user.id}`);
          showSuccess(t('users.delete_success', { name: user.name }));
          loadUsers();
        } catch (error: any) {
          showError(t('users.delete_error'), error?.message || String(error));
        }
      }
    });
  }

  async function openPermissionsModal(user: User) {
    // Получаем aff из email (часть до @)
    const aff = user.email.split('@')[0];
    
    setPermissionsModal({
      isOpen: true,
      userId: user.id,
      userName: user.name,
      aff,
    });

    // Загружаем текущие настройки
    try {
      const settings = await apiGet(`/v1/permissions/${aff}`);
      setPermissionsSettings(settings || {
        nameVisibility: 'SHOW',
        emailVisibility: 'SHOW',
        phoneVisibility: 'SHOW',
      });
    } catch (e) {
      setPermissionsSettings({
        nameVisibility: 'SHOW',
        emailVisibility: 'SHOW',
        phoneVisibility: 'SHOW',
      });
    }
  }

  async function savePermissions() {
    try {
      await apiPatch(`/v1/permissions/${permissionsModal.aff}`, permissionsSettings);
      showSuccess('Permissions saved successfully');
      setPermissionsModal({ isOpen: false, userId: '', userName: '', aff: '' });
    } catch (error: any) {
      showError('Error saving permissions', error?.message || String(error));
    }
  }

  async function regenerateApiKey(user: User) {
    setConfirmDialog({
      isOpen: true,
      title: t('users.regenerate_key_title'),
      message: t('users.regenerate_key_message', { name: user.name }),
      type: 'warning',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await apiPost(`/v1/users/${user.id}/regenerate-api-key`, {});
          showSuccess(t('users.regenerate_key_success'));
          loadUsers();
        } catch (error: any) {
          showError(t('users.regenerate_key_error'), error?.message || String(error));
        }
      }
    });
  }

  function startEdit(user: User) {
    setEditingId(user.id);
    setFormData({
      email: user.email,
      name: user.name,
      password: '',
      role: user.role,
      isActive: user.isActive,
      timezone: user.timezone,
      language: user.language,
      parentId: user.parentId || undefined,
    });
    setShowForm(true);
  }

  function resetForm() {
    setFormData({
      email: '',
      name: '',
      password: '',
      role: 'AFFILIATE',
      isActive: true,
      timezone: 'UTC',
      language: 'en',
    });
  }

  function cancelEdit() {
    setShowForm(false);
    setEditingId(null);
    resetForm();
  }

  function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
  }

  function copyPassword() {
    navigator.clipboard.writeText(formData.password);
    showSuccess(t('users.password_copied'));
  }

  function parseValidationError(error: any): string {
    try {
      const errorData = error.originalMessage ? JSON.parse(error.originalMessage) : error;
      if (errorData.message && Array.isArray(errorData.message)) {
        const firstError = errorData.message[0];
        if (firstError.includes('email must be an email')) {
          return t('users.email_invalid');
        }
        if (firstError.includes('password')) {
          return t('users.password_required');
        }
        if (firstError.includes('name')) {
          return t('users.name_required');
        }
      }
    } catch (e) {}
    return error?.message || String(error);
  }

  return (
    <div className="space-y-4">
      <div className="page-container">
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{t('users.title')}</h1>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              {t('users.create')}
            </button>
          </div>

      {loading && <div className="text-center py-8">{t('common.loading')}</div>}

      {!loading && users.length === 0 && (
        <div className="text-center py-8 text-gray-500">{t('users.no_users')}</div>
      )}

      {!loading && users.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('users.name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('users.email')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('users.role')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('users.status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('users.language')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('users.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 text-sm">{user.name}</td>
                  <td className="px-6 py-4 text-sm">{user.email}</td>
                  <td className="px-6 py-4 text-sm">{user.role}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.isActive ? t('users.active') : t('users.inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{user.language.toUpperCase()}</td>
                  <td className="px-6 py-4 text-sm text-right space-x-2">
                    <button
                      onClick={() => startEdit(user)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                    >
                      {t('common.edit')}
                    </button>
                    {user.role !== 'ADMIN' && user.role !== 'SUPERADMIN' && (
                      <button
                        onClick={() => openPermissionsModal(user)}
                        className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                      >
                        Permissions
                      </button>
                    )}
                    {user.role !== 'SUPERADMIN' && (
                      <button
                        onClick={() => deleteUser(user)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        {t('common.delete')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="space-y-4 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              {editingId ? t('users.edit') : t('users.create')}
            </h2>
            <button
              onClick={cancelEdit}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">{t('users.email')}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">{t('users.name')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('users.name_placeholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">{t('users.password')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={editingId ? t('users.password_placeholder_edit') : t('users.password_placeholder')}
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200"
                    title={t('users.generate_password')}
                  >
                    🎲
                  </button>
                  <button
                    type="button"
                    onClick={copyPassword}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
                    title={t('users.copy_password')}
                  >
                    📋
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">{t('users.role')}</label>
                <CustomSelect
                  value={formData.role}
                  onChange={(value) => setFormData({ ...formData, role: value })}
                  options={[
                    { value: 'AFFILIATE', label: 'Affiliate' },
                    { value: 'AFFILIATE_MASTER', label: 'MasterAffiliate' },
                    { value: 'ADMIN', label: 'Admin' },
                    { value: 'SUPERADMIN', label: 'SuperAdmin' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">{t('users.language')}</label>
                <CustomSelect
                  value={formData.language}
                  onChange={(value) => setFormData({ ...formData, language: value })}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'ru', label: 'Русский' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">{t('users.timezone')}</label>
                <CustomSelect
                  value={formData.timezone}
                  onChange={(value) => setFormData({ ...formData, timezone: value })}
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

              {/* Parent User Selection (для AFFILIATE роли) */}
              {(formData.role === 'AFFILIATE' || formData.role === 'AFFILIATE_MASTER') && (
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">{t('users.parent')}</label>
                  <CustomSelect
                    value={formData.parentId || ''}
                    onChange={(value) => setFormData({ ...formData, parentId: value || undefined })}
                    options={[
                      { value: '', label: t('users.no_parent') },
                      ...users
                        .filter(u => u.role === 'AFFILIATE_MASTER' || u.role === 'ADMIN')
                        .map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))
                    ]}
                  />
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm">{t('users.active')}</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={editingId ? updateUser : createUser}
                className="btn-primary"
              >
                {editingId ? t('common.save') : t('common.create')}
              </button>
              <button
                onClick={cancelEdit}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
      )}
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

      {/* Permissions Modal */}
      {permissionsModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Permissions for {permissionsModal.userName}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Affiliate: {permissionsModal.aff}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">Name Visibility</label>
                <CustomSelect
                  value={permissionsSettings.nameVisibility}
                  onChange={(value) => setPermissionsSettings({ ...permissionsSettings, nameVisibility: value as any })}
                  options={[
                    { value: 'SHOW', label: 'Show fully' },
                    { value: 'MASK', label: 'Mask (J*** D***)' },
                    { value: 'HIDE', label: 'Hide completely' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">Email Visibility</label>
                <CustomSelect
                  value={permissionsSettings.emailVisibility}
                  onChange={(value) => setPermissionsSettings({ ...permissionsSettings, emailVisibility: value as any })}
                  options={[
                    { value: 'SHOW', label: 'Show fully' },
                    { value: 'MASK', label: 'Mask (jo***@example.com)' },
                    { value: 'HIDE', label: 'Hide completely' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">Phone Visibility</label>
                <CustomSelect
                  value={permissionsSettings.phoneVisibility}
                  onChange={(value) => setPermissionsSettings({ ...permissionsSettings, phoneVisibility: value as any })}
                  options={[
                    { value: 'SHOW', label: 'Show fully' },
                    { value: 'MASK', label: 'Mask (***45)' },
                    { value: 'HIDE', label: 'Hide completely' },
                  ]}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={savePermissions}
                className="btn-primary"
              >
                Save Permissions
              </button>
              <button
                onClick={() => setPermissionsModal({ isOpen: false, userId: '', userName: '', aff: '' })}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
