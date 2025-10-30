import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient, Lead } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import fetch from 'node-fetch';
import * as https from 'https';

const prisma = new PrismaClient();
const logger = new Logger('StatusPullService');

// Agent для отключения проверки SSL
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

@Injectable()
export class StatusPullService implements OnModuleInit {
  onModuleInit() {
    logger.log('Status Pull Service initialized');
  }

  /**
   * Периодический опрос брокеров для получения обновлений статусов
   * Запускается каждые 5 минут
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async pullAllBrokerStatuses() {
    logger.log('[STATUS_PULL] Starting pull cycle for all brokers...');
    
    try {
      // Получаем все активные шаблоны с включенным Pull
      const templates = await prisma.brokerTemplate.findMany({
        where: {
          isActive: true,
          pullEnabled: true,
          pullUrl: { not: null }
        }
      });

      logger.log(`Found ${templates.length} templates with Pull enabled`);

      for (const template of templates) {
        try {
          console.log('[STATUS_PULL] Template queued:', template.code);
          await this.pullBrokerStatus(template);
        } catch (error) {
          console.error('[STATUS_PULL] Error pulling status for', template.code, error);
        }
      }

      logger.log('[STATUS_PULL] Pull cycle completed');
    } catch (error) {
      console.error('[STATUS_PULL] Error in pull cycle:', error);
    }
  }

  /**
   * Опрос конкретного брокера
   */
  async pullBrokerStatus(template: any) {
    const now = new Date();
    const lastSync = template.pullLastSync || new Date(Date.now() - 24 * 60 * 60 * 1000); // default: last 24h
    const interval = template.pullInterval || 15;
    
    // Определяем период для запроса (с последней синхронизации до текущего момента)
    const from = lastSync;
    const to = now;

    console.log('[STATUS_PULL] Pulling status for', template.code, 'from', from.toISOString(), 'to', to.toISOString());

    try {
      // Собираем externalId для текущего брокера за 14 дней
      const brokerCode = String(template.code || '').toUpperCase();
      const leads = await prisma.lead.findMany({
        where: {
          broker: brokerCode,
          status: 'SENT',
          externalId: { not: null }
        },
        select: { externalId: true }
      });
      const idsAll = leads.map(l => String(l.externalId)).filter(Boolean);
      const chunkSize = 50;
      const chunks: string[][] = [];
      for (let i = 0; i < idsAll.length; i += chunkSize) {
        chunks.push(idsAll.slice(i, i + chunkSize));
      }

      let updatedCount = 0;
      if (chunks.length === 0) {
        console.log('[STATUS_PULL] No SENT leads with externalId for', template.code);
      }

      for (const idsChunk of chunks) {
        const idsCsv = idsChunk.join(',');

        // Рендерим URL с параметрами интеграции, датами и ids
        const params = this.normalizeParams({ ...(template.params || {}) as Record<string, any>, ids: idsCsv, leadIds: idsCsv });
        console.log('[STATUS_PULL] PARAMS', { code: template.code, params });
        let pullUrl = this.renderPullUrl(template.pullUrl, from, to, params);

        // Рендерим body с датами и ids (для POST запросов)
        let body = this.renderPullBody(template.pullBody, from, to, params)
          .replace(/\$\{ids\}/g, idsCsv).replace(/\{ids\}/g, idsCsv)
          .replace(/\$\{leadIds\}/g, idsCsv).replace(/\{leadIds\}/g, idsCsv);

        // Дополнительная подстановка для leadIds в JSON массивах
        if (body.includes('${leadIds}') || body.includes('{leadIds}')) {
          const leadIdsArray = idsCsv ? idsCsv.split(',').map(id => `"${id}"`).join(',') : '';
          body = body.replace(/\$\{leadIds\}/g, leadIdsArray).replace(/\{leadIds\}/g, leadIdsArray);
        }

        // Делаем запрос к брокеру
        const method = (template.pullMethod || 'POST').toUpperCase();
        const options: any = {
          method,
          headers: { ...(template.pullHeaders || {}) },
          agent: pullUrl.startsWith('https') ? httpsAgent : undefined
        };

        // Для GET запросов добавляем ids/oid в URL, только если они ещё не подставлены и параметр не указан
        if (method === 'GET' && idsCsv) {
          const hasIdsPlaceholder = pullUrl.includes('{ids}') || pullUrl.includes('${ids}') || pullUrl.includes('{leadIds}') || pullUrl.includes('${leadIds}')
            || /%7Bids%7D/i.test(pullUrl) || /%24%7Bids%7D/i.test(pullUrl) || /%7BleadIds%7D/i.test(pullUrl) || /%24%7BleadIds%7D/i.test(pullUrl);
          const hasIdsQuery = /[?&](ids|oid)=/.test(pullUrl);
          if (!hasIdsPlaceholder && !hasIdsQuery) {
            const separator = pullUrl.includes('?') ? '&' : '?';
            const paramName = template.code === 'ALTERCPA_MOE' ? 'oid' : 'ids';
            // Передаем CSV как есть, без URL-экранирования запятых
            pullUrl += `${separator}${paramName}=${idsCsv}`;
          }
        }

        // Рендерим заголовки с параметрами
        if (options.headers) {
          const render = (v: string) => v
            .replace(/\$\{([^}]+)\}/g, (_, k) => String((params as any)[String(k).trim()] ?? ''))
            .replace(/\{([^}]+)\}/g, (_, k) => String((params as any)[String(k).trim()] ?? ''));
          const newHeaders: Record<string, string> = {};
          for (const [k, v] of Object.entries(options.headers)) newHeaders[k] = render(String(v));
          options.headers = newHeaders;
        }

        // Для GET не указываем Content-Type
        if (method === 'GET' && options.headers) {
          delete (options.headers as any)['Content-Type'];
          delete (options.headers as any)['content-type'];
        }

        // Для POST добавляем Content-Type и body
        if (method === 'POST') {
          const ct = (options.headers['Content-Type'] || options.headers['content-type'] || '').toLowerCase();
          if (!ct) options.headers['Content-Type'] = 'application/json';

          const trimmed = (body ?? '').trim();
          if (!trimmed || trimmed === '{}' || trimmed === '[]') {
            if ((options.headers['Content-Type'] || '').includes('application/x-www-form-urlencoded')) {
              options.body = idsCsv ? `ids=${encodeURIComponent(idsCsv)}` : '';
            } else {
              options.body = idsCsv ? JSON.stringify({ ids: idsCsv.split(',') }) : '{}';
            }
          } else {
            options.body = this.convertBodyFormat(body, options.headers['Content-Type'] || 'application/json');
          }
        }

        console.log('[STATUS_PULL] REQUEST', { url: pullUrl, method, headers: options.headers, body: options.body ?? null });
        const response = await fetch(pullUrl, options) as any;
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const rawText = await response.text();
        let data: any;
        try { data = JSON.parse(rawText); } catch { data = rawText; }
        console.log('[STATUS_PULL] RESPONSE', { code: template.code, status: response.status, body: typeof data === 'string' ? data.slice(0, 1000) : data });
        console.log('[STATUS_PULL] About to call processStatusUpdates...');
        console.log('[STATUS_PULL] Data type:', typeof data, 'Is array:', Array.isArray(data));
        console.log('[STATUS_PULL] Data length:', Array.isArray(data) ? data.length : 'N/A');
        console.log('[STATUS_PULL] Data sample:', Array.isArray(data) && data.length > 0 ? data[0] : 'N/A');
        console.log('[STATUS_PULL] Template code:', template.code);
        console.log('[STATUS_PULL] Template id:', template.id);

        // Обновляем статусы
        console.log(`[STATUS_PULL] Calling processStatusUpdates for ${template.code}`);
        try {
          const c = await this.processStatusUpdates(template.code, data);
          updatedCount += c;
          console.log(`[STATUS_PULL] processStatusUpdates returned ${c} updated leads (total ${updatedCount})`);
        } catch (error) {
          console.error(`[STATUS_PULL] Error in processStatusUpdates:`, error);
          throw error;
        }
      }
      
      // Обновляем время последней синхронизации
      await prisma.brokerTemplate.update({
        where: { id: template.id },
        data: { pullLastSync: now }
      });

      logger.log(`✅ ${template.code}: Updated ${updatedCount} leads`);
      
    } catch (error: any) {
      console.error('[STATUS_PULL] ❌', template.code, error?.message || String(error));
    }
  }


  /**
   * Рендерим URL для pull запроса с параметрами и датами
   */
  renderPullUrl(template: string, from: Date, to: Date, params: Record<string, any>): string {
    if (!template) return template;
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace('T', ' ').slice(0, 19);
    };

    let result = template;
    
    // Подставляем параметры интеграции (${KEY} и {KEY})
    for (const [key, value] of Object.entries(params)) {
      const v = String(value ?? '');
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), v);
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), v);
    }
    
    // Подставляем даты
    result = result
      .replace(/\$\{from\}/g, encodeURIComponent(formatDate(from)))
      .replace(/\$\{to\}/g, encodeURIComponent(formatDate(to)))
      .replace(/\$\{fromIso\}/g, encodeURIComponent(from.toISOString()))
      .replace(/\$\{toIso\}/g, encodeURIComponent(to.toISOString()));
    
    return result;
  }

  /**
   * Рендерим body для pull запроса с датами
   */
  renderPullBody(template: string, from: Date, to: Date, params: Record<string, any> = {}): string {
    if (!template) return JSON.stringify({ from: from.toISOString(), to: to.toISOString() });
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace('T', ' ').slice(0, 19);
    };

    let result = template
      .replace(/\$\{from\}/g, formatDate(from))
      .replace(/\$\{to\}/g, formatDate(to))
      .replace(/\$\{fromIso\}/g, from.toISOString())
      .replace(/\$\{toIso\}/g, to.toISOString());

    // Подставляем параметры интеграции в body (${KEY} и {KEY})
    for (const [key, value] of Object.entries(params)) {
      const v = String(value ?? '');
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), v);
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), v);
    }
    return result;
  }

  /**
   * Конвертируем body в правильный формат в зависимости от Content-Type
   */
  private convertBodyFormat(body: string, contentType: string): string {
    const isFormUrlEncoded = contentType.includes('application/x-www-form-urlencoded');
    const isJson = contentType.includes('application/json');
    
    if (isFormUrlEncoded) {
      // Конвертируем из формата key: value; в form-urlencoded
      const params = new URLSearchParams();
      const looksLikeLines = /:\s*.+;\s*(\n|$)/.test(body);
      
      if (looksLikeLines) {
        body.split(/\r?\n/).forEach(line => {
          const l = line.trim();
          if (!l || l.startsWith('#') || l.startsWith('//')) return;
          const clean = l.endsWith(';') ? l.slice(0, -1) : l;
          const idx = clean.indexOf(':');
          if (idx === -1) return;
          const key = clean.slice(0, idx).trim();
          const value = clean.slice(idx + 1).trim();
          params.append(key, value);
        });
        return params.toString();
      } else {
        // Попробуем JSON
        try {
          const bodyObj = JSON.parse(body);
          for (const [key, value] of Object.entries(bodyObj)) {
            params.append(key, String(value ?? ''));
          }
          return params.toString();
        } catch {
          // Считаем уже form-urlencoded
          return body;
        }
      }
    } else if (isJson) {
      // Конвертируем из формата key: value; в JSON
      const looksLikeLines = /:\s*.+;\s*(\n|$)/.test(body);
      
      if (looksLikeLines) {
        const obj: Record<string, any> = {};
        body.split(/\r?\n/).forEach(line => {
          const l = line.trim();
          if (!l || l.startsWith('#') || l.startsWith('//')) return;
          const clean = l.endsWith(';') ? l.slice(0, -1) : l;
          const idx = clean.indexOf(':');
          if (idx === -1) return;
          const key = clean.slice(0, idx).trim();
          const value = clean.slice(idx + 1).trim();
          
          // Пытаемся распарсить значение как JSON
          try {
            obj[key] = JSON.parse(value);
          } catch {
            obj[key] = value;
          }
        });
        return JSON.stringify(obj);
      } else {
        // Считаем уже JSON
        return body;
      }
    }
    
    return body;
  }

  /**
   * Нормализуем параметры: создаём алиасы ключей и варианты регистра,
   * чтобы {USER_ID}, {WM}, {userId} и т.п. подставлялись одинаково.
   */
  private normalizeParams(input: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};

    const addVariants = (k: string, v: any) => {
      const upper = k.toUpperCase();
      const lower = k.toLowerCase();
      const camel = upper
        .toLowerCase()
        .replace(/[_-](\w)/g, (_, c) => c.toUpperCase());
      const snake = k
        .replace(/[A-Z]/g, (c, i) => (i ? '_' : '') + c)
        .toUpperCase();
      out[k] = v;
      out[upper] = v;
      out[lower] = v;
      out[camel] = v;
      out[snake] = v;
    };

    // Базовые пары
    for (const [k, v] of Object.entries(input)) addVariants(k, v);

    // Алиасы под распространённые названия
    const wm = out['WM'] ?? out['user_id'] ?? out['USER_ID'] ?? out['userId'];
    const apiKey = out['API_KEY'] ?? out['api_key'] ?? out['key'] ?? out['apikey'] ?? out['apiKey'];

    if (wm != null) {
      addVariants('WM', wm);
      addVariants('USER_ID', wm);
      addVariants('user', wm);
      addVariants('uid', wm);
    }
    if (apiKey != null) {
      addVariants('API_KEY', apiKey);
      addVariants('KEY', apiKey);
      addVariants('auth', apiKey);
    }

    return out;
  }

  /**
   * Обрабатываем обновления статусов из ответа брокера
   */
  async processStatusUpdates(brokerCode: string, data: any): Promise<number> {
    let updatedCount = 0;

    // AlterCPA MOE формат: массив лидов напрямую
    // Trackbox формат: { data: { customers: [...] } }
    let customers = [];
    
    if (brokerCode === 'ALTERCPA_MOE') {
      customers = Array.isArray(data) ? data : [];
    } else {
      customers = data?.data?.customers || data?.customers || [];
    }
    
    if (!Array.isArray(customers)) {
      logger.warn(`Unexpected response format from ${brokerCode}`);
      return 0;
    }

    console.log(`[STATUS_PULL] Processing ${customers.length} customers for ${brokerCode}`);

    for (const customer of customers) {
      try {
        // Ищем лид по externalId (для AlterCPA MOE это customer.id)
        let externalId;
        if (brokerCode === 'ALTERCPA_MOE') {
          externalId = customer.id;
        } else {
          externalId = customer.uniqueid || customer.id || customer.customer_id;
        }
        
        if (!externalId) continue;

        const lead = await prisma.lead.findFirst({
          where: { externalId: String(externalId) }
        });

        if (!lead) {
          console.log(`[STATUS_PULL] Lead not found for externalId: ${externalId}`);
          continue;
        }

        // Определяем новый статус
        const newStatus = this.mapBrokerStatus(customer, brokerCode);
        console.log(`[STATUS_PULL] Processing lead ${lead.id}, externalId: ${externalId}, current status: ${lead.brokerStatus}, new status: ${newStatus}`);
        
        // Обновляем только если статус изменился
        if (newStatus && newStatus !== lead.brokerStatus) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              brokerStatus: newStatus,
              brokerStatusChangedAt: new Date()
            }
          });

          // Записываем в историю изменений
          await prisma.leadStatusEvent.create({
            data: {
              leadId: lead.id,
              kind: 'brokerStatus',
              from: lead.brokerStatus,
              to: newStatus
            }
          });

          updatedCount++;
          logger.debug(`Updated lead ${lead.id}: ${lead.brokerStatus} → ${newStatus}`);
        }
      } catch (error) {
        logger.error(`Error processing customer update:`, error);
      }
    }

    return updatedCount;
  }

  /**
   * Маппинг статуса брокера в наш формат
   */
  mapBrokerStatus(customer: any, brokerCode?: string): string | null {
    // AlterCPA MOE статусы (числовые)
    if (brokerCode === 'ALTERCPA_MOE') {
      const statusMap: Record<number, string> = {
        1: 'NEW',           // Новый заказ
        2: 'PENDING',       // В обработке
        3: 'CALLBACK',      // Перезвонить
        4: 'HOLD',          // Холд
        5: 'REJECTED',      // Отменён
        6: 'PENDING',       // На упаковке
        7: 'PENDING',       // Отправка
        8: 'PENDING',       // В пути
        9: 'APPROVED',      // Доставлен
        10: 'APPROVED',     // Оплачен
        11: 'REJECTED',     // Возврат
        12: 'REJECTED'      // Удалён
      };
      
      const status = customer.status;
      return statusMap[status] || 'PENDING';
    }

    // Trackbox статусы
    const statusMap: Record<string, string> = {
      'new': 'NEW',
      'no_answer': 'NO_ANSWER',
      'not_interested': 'NOT_INTERESTED',
      'callback': 'CALLBACK',
      'depositor': 'DEPOSITOR',
      'ftd': 'FTD',
      'retention': 'RETENTION',
      'converted': 'CONVERTED'
    };

    const rawStatus = (customer.status || customer.customer_status || '').toLowerCase();
    return statusMap[rawStatus] || rawStatus.toUpperCase();
  }
}

