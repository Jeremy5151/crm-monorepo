/**
 * Утилиты для маскирования данных в зависимости от прав пользователя
 */

export interface UserPermissions {
  canViewFullEmail: boolean;
  canViewFullPhone: boolean;
}

/**
 * Маскирует email адрес, показывая только первые 2 символа и домен
 * @param email - полный email адрес
 * @param canViewFull - может ли пользователь видеть полный email
 * @returns маскированный или полный email
 */
export function maskEmail(email: string, canViewFull: boolean): string {
  if (canViewFull || !email) {
    return email;
  }

  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) {
    return email;
  }

  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`;
  }

  const visiblePart = localPart.substring(0, 2);
  const maskedPart = '*'.repeat(Math.max(1, localPart.length - 2));
  
  return `${visiblePart}${maskedPart}@${domain}`;
}

/**
 * Маскирует номер телефона, скрывая последние 5 цифр
 * @param phone - полный номер телефона
 * @param canViewFull - может ли пользователь видеть полный телефон
 * @returns маскированный или полный номер телефона
 */
export function maskPhone(phone: string, canViewFull: boolean): string {
  if (canViewFull || !phone) {
    return phone;
  }

  // Убираем все нецифровые символы для обработки
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length <= 5) {
    return '*'.repeat(phone.length);
  }

  // Показываем все символы кроме последних 5 цифр
  const visibleLength = digitsOnly.length - 5;
  let visibleCount = 0;
  let result = '';

  for (let i = 0; i < phone.length; i++) {
    const char = phone[i];
    if (/\d/.test(char)) {
      if (visibleCount < visibleLength) {
        result += char;
        visibleCount++;
      } else {
        result += '*';
      }
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Проверяет, может ли пользователь видеть полные данные
 * @param permissions - права пользователя
 * @param dataType - тип данных ('email' | 'phone')
 * @returns true если пользователь может видеть полные данные
 */
export function canViewFullData(permissions: UserPermissions, dataType: 'email' | 'phone'): boolean {
  if (dataType === 'email') {
    return permissions.canViewFullEmail;
  }
  if (dataType === 'phone') {
    return permissions.canViewFullPhone;
  }
  return false;
}
