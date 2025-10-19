/**
 * Форматирует дату в часовом поясе CRM
 */
export function formatDateInCrmTimezone(date: string | Date, timezone: string = 'UTC'): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('ru-RU', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Ошибка форматирования даты:', error);
    return typeof date === 'string' ? date : date.toLocaleString('ru-RU');
  }
}

/**
 * Форматирует только время в часовом поясе CRM
 */
export function formatTimeInCrmTimezone(date: string | Date, timezone: string = 'UTC'): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString('ru-RU', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Ошибка форматирования времени:', error);
    return typeof date === 'string' ? date : date.toLocaleTimeString('ru-RU');
  }
}
