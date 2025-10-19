import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Получает текущее время в UTC (для сохранения в БД).
 * Prisma автоматически сохраняет Date объекты в UTC.
 */
export function getCurrentTimeInUtc(): Date {
  return new Date();
}

/**
 * Конвертирует дату в часовой пояс CRM для отображения
 */
export async function formatDateInCrmTimezone(date: Date): Promise<string> {
  try {
    const settings = await prisma.crmSettings.findFirst();
    const timezone = settings?.timezone || 'UTC';
    
    return date.toLocaleString('ru-RU', {
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
    return date.toLocaleString('ru-RU');
  }
}

/**
 * Конвертирует дату из часового пояса CRM в UTC для сохранения в БД
 */
export async function convertFromCrmTimezoneToUtc(dateString: string): Promise<Date> {
  try {
    const settings = await prisma.crmSettings.findFirst();
    const timezone = settings?.timezone || 'UTC';
    
    // Создаем дату в часовом поясе CRM
    const date = new Date(dateString);
    
    // Получаем смещение для указанного часового пояса
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const targetTime = new Date(utcTime + (getTimezoneOffset(timezone) * 60000));
    
    return targetTime;
  } catch (error) {
    console.error('Ошибка конвертации даты:', error);
    return new Date(dateString);
  }
}

/**
 * Получает смещение часового пояса в минутах
 */
function getTimezoneOffset(timezone: string): number {
  const now = new Date();
  const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
  const target = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
  return (target.getTime() - utc.getTime()) / 60000;
}
