'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TimezoneSelector } from '@/components/TimezoneSelector';
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
              className="px-3 py-2 text-sm rounded-xl bg-yellow-500 text-white hover:bg-yellow-600"
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
                    <button
                      onClick={() => deleteUser(user)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      {t('common.delete')}
                    </button>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">{t('users.name')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={editingId ? t('users.password_placeholder_edit') : t('users.password_placeholder')}
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                    title={t('users.generate_password')}
                  >
                    🎲
                  </button>
                  <button
                    type="button"
                    onClick={copyPassword}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
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
                <TimezoneSelector
                  value={formData.timezone}
                  onChange={(value) => setFormData({ ...formData, timezone: value })}
                />
              </div>

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
                className="px-4 py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600"
              >
                {editingId ? t('common.save') : t('common.create')}
              </button>
              <button
                onClick={cancelEdit}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
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
    </div>
  );
}
