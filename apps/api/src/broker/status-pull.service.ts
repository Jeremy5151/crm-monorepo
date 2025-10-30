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
      // Спец-ветка для AlterCPA Moe: нужен список externalId (ids)
      if (template.code?.toUpperCase() === 'ALTERCPA_MOE') {
        await this.pullAlterCpaMoe(template);
        return;
      }

      // Собираем externalId для текущего брокера за 14 дней
      const brokerCode = String(template.code || '').toUpperCase();
      const leads = await prisma.lead.findMany({
        where: { broker: brokerCode, externalId: { not: null }, createdAt: { gte: new Date(Date.now() - 14*24*60*60*1000) } },
        select: { externalId: true }
      });
      const idsCsv = leads.map(l => String(l.externalId)).join(',');

      // Рендерим URL с параметрами интеграции, датами и ids
      const params = { ...(template.params || {}), ids: idsCsv, leadIds: idsCsv };
      let pullUrl = this.renderPullUrl(template.pullUrl, from, to, params)
        .replace(/\{ids\}/g, encodeURIComponent(idsCsv))
        .replace(/\{leadIds\}/g, encodeURIComponent(idsCsv));
      
      // Рендерим body с датами и ids (для POST запросов)
      let body = this.renderPullBody(template.pullBody, from, to)
        .replace(/\$\{ids\}/g, idsCsv).replace(/\{ids\}/g, idsCsv)
        .replace(/\$\{leadIds\}/g, idsCsv).replace(/\{leadIds\}/g, idsCsv);
      
      // Делаем запрос к брокеру
      const method = (template.pullMethod || 'POST').toUpperCase();
      const options: any = {
        method,
        headers: { ...(template.pullHeaders || {}) },
        agent: pullUrl.startsWith('https') ? httpsAgent : undefined
      };

      // Рендерим заголовки с параметрами (поддержка ${NAME} и {NAME})
      if (options.headers) {
        const render = (v: string) => v
          .replace(/\$\{([^}]+)\}/g, (_, k) => String((params as any)[String(k).trim()] ?? ''))
          .replace(/\{([^}]+)\}/g, (_, k) => String((params as any)[String(k).trim()] ?? ''));
        const newHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(options.headers)) newHeaders[k] = render(String(v));
        options.headers = newHeaders;
      }

      // Для POST добавляем Content-Type и body
      if (method === 'POST') {
        options.headers['Content-Type'] = options.headers['Content-Type'] || options.headers['content-type'] || 'application/json';
        options.body = body;
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
      
      // Парсим ответ и обновляем статусы
      const updatedCount = await this.processStatusUpdates(template.code, data);
      
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
   * Pull для AlterCPA Moe: https://cpa.moe/ru/api-wm.html
   * URL: https://api.cpa.moe/ext/list.json?id={user}-{key}&ids=1,2,3
   */
  private async pullAlterCpaMoe(template: any) {
    const now = new Date();
    // Берём лиды с этим брокером и с externalId, за последние 14 дней
    const fromDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const leads = await prisma.lead.findMany({
      where: {
        broker: { equals: 'ALTERCPA_MOE' },
        externalId: { not: null },
        createdAt: { gte: fromDate }
      },
      select: { id: true, externalId: true }
    });

    if (leads.length === 0) {
      logger.log('ALTERCPA_MOE: no leads to pull');
      return;
    }

    const idsCsv = leads.map(l => String(l.externalId)).join(',');
    const method = (template.pullMethod || 'POST').toUpperCase();
    let url = template.pullUrl as string;
    if (method === 'GET') {
      url += (url.includes('?') ? '&' : '?') + `ids=${encodeURIComponent(idsCsv)}`;
    }

    const opts: any = {
      method,
      headers: { ...(template.pullHeaders || {}) },
      agent: url.startsWith('https') ? httpsAgent : undefined
    };
    if (method === 'POST') {
      const params = new URLSearchParams();
      params.append('ids', idsCsv);
      opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      opts.body = params.toString();
    }

    console.log('[STATUS_PULL] REQUEST', { url, method, headers: opts.headers, body: opts.body ?? null });
    const resp = await fetch(url, opts) as any;
    const raw = await resp.text();
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${raw}`);

    let data: any;
    try { data = JSON.parse(raw); } catch { data = raw; }
    console.log('[STATUS_PULL] RESPONSE', { code: template.code, status: resp.status, body: typeof data === 'string' ? data.slice(0, 1000) : data });

    // Ответ может быть объект с ключами id → { stage/status/... }
    let updates: Array<{ id: string; stage?: string; status?: any } > = [];
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      for (const [id, info] of Object.entries(data)) {
        updates.push({ id, stage: (info as any).stage, status: (info as any).status });
      }
    }

    let updated = 0;
    for (const u of updates) {
      const lead = await prisma.lead.findFirst({ where: { externalId: String(u.id), broker: 'ALTERCPA_MOE' } });
      if (!lead) continue;

      // маппинг стадий AlterCPA Moe
      const stage = String(u.stage || '').toLowerCase();
      const map: Record<string, string> = {
        wait: 'PENDING',
        hold: 'HOLD',
        approve: 'APPROVED',
        cancel: 'REJECTED',
        trash: 'TRASH'
      };
      const newStatus = map[stage] || (u.status != null ? String(u.status) : null);
      if (!newStatus || newStatus === lead.brokerStatus) continue;

      await prisma.lead.update({
        where: { id: lead.id },
        data: { brokerStatus: newStatus, brokerStatusChangedAt: now }
      });
      updated++;
    }

    await prisma.brokerTemplate.update({ where: { id: template.id }, data: { pullLastSync: now } });
    logger.log(`ALTERCPA_MOE: Updated ${updated} leads`);
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
    
    // Подставляем параметры интеграции
    for (const [key, value] of Object.entries(params)) {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      result = result.replace(regex, String(value || ''));
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
  renderPullBody(template: string, from: Date, to: Date): string {
    if (!template) return JSON.stringify({ from: from.toISOString(), to: to.toISOString() });
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace('T', ' ').slice(0, 19);
    };

    return template
      .replace(/\$\{from\}/g, formatDate(from))
      .replace(/\$\{to\}/g, formatDate(to))
      .replace(/\$\{fromIso\}/g, from.toISOString())
      .replace(/\$\{toIso\}/g, to.toISOString());
  }

  /**
   * Обрабатываем обновления статусов из ответа брокера
   */
  async processStatusUpdates(brokerCode: string, data: any): Promise<number> {
    let updatedCount = 0;

    // Trackbox формат: { data: { customers: [...] } }
    const customers = data?.data?.customers || data?.customers || [];
    
    if (!Array.isArray(customers)) {
      logger.warn(`Unexpected response format from ${brokerCode}`);
      return 0;
    }

    for (const customer of customers) {
      try {
        // Ищем лид по externalId (uniqueid от брокера)
        const externalId = customer.uniqueid || customer.id || customer.customer_id;
        if (!externalId) continue;

        const lead = await prisma.lead.findFirst({
          where: { externalId: String(externalId) }
        });

        if (!lead) {
          logger.debug(`Lead not found for externalId: ${externalId}`);
          continue;
        }

        // Определяем новый статус
        const newStatus = this.mapBrokerStatus(customer);
        
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
  mapBrokerStatus(customer: any): string | null {
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

