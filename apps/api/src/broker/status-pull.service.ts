import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient, Lead } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

const prisma = new PrismaClient();
const logger = new Logger('StatusPullService');

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
    logger.log('Starting pull cycle for all brokers...');
    
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
          await this.pullBrokerStatus(template);
        } catch (error) {
          logger.error(`Error pulling status for ${template.code}:`, error);
        }
      }

      logger.log('Pull cycle completed');
    } catch (error) {
      logger.error('Error in pull cycle:', error);
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

    logger.log(`Pulling status for ${template.code} from ${from.toISOString()} to ${to.toISOString()}`);

    try {
      // Рендерим body с датами
      const body = this.renderPullBody(template.pullBody, from, to);
      
      // Делаем запрос к брокеру
      const response = await fetch(template.pullUrl, {
        method: template.pullMethod || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(template.pullHeaders || {})
        },
        body: body
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.log(`Response from ${template.code}:`, JSON.stringify(data).slice(0, 500));
      
      // Парсим ответ и обновляем статусы
      const updatedCount = await this.processStatusUpdates(template.code, data);
      
      // Обновляем время последней синхронизации
      await prisma.brokerTemplate.update({
        where: { id: template.id },
        data: { pullLastSync: now }
      });

      logger.log(`✅ ${template.code}: Updated ${updatedCount} leads`);
      
    } catch (error: any) {
      logger.error(`❌ ${template.code}: ${error.message}`);
    }
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

