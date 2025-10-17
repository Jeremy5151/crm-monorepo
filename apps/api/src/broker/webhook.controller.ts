import { Controller, Post, Body, Headers, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const logger = new Logger('WebhookController');

@Controller('v1/webhook')
export class WebhookController {
  
  /**
   * Webhook endpoint для получения обновлений статусов от брокеров
   * POST /v1/webhook/broker-status
   */
  @Post('broker-status')
  @HttpCode(HttpStatus.OK)
  async handleBrokerStatusUpdate(
    @Body() body: any,
    @Headers() headers: any
  ) {
    logger.log('Received broker status webhook', JSON.stringify(body).slice(0, 200));

    try {
      // Валидация (TODO: добавить проверку подписи/API ключа)
      const apiKey = headers['x-api-key'] || headers['authorization'];
      
      // Извлекаем данные
      const {
        lead_id,
        external_id,
        customer_id,
        uniqueid,
        status,
        customer_status,
        broker_status,
        deposit_amount,
        timestamp
      } = body;

      // Определяем externalId (разные брокеры используют разные поля)
      const externalId = external_id || customer_id || uniqueid || lead_id;
      
      if (!externalId) {
        logger.warn('No external_id in webhook payload');
        return { success: false, error: 'Missing external_id' };
      }

      // Ищем лид
      const lead = await prisma.lead.findFirst({
        where: { externalId: String(externalId) }
      });

      if (!lead) {
        logger.warn(`Lead not found for externalId: ${externalId}`);
        return { success: false, error: 'Lead not found' };
      }

      // Определяем новый статус
      const newStatus = this.mapBrokerStatus(status || customer_status || broker_status);
      
      if (!newStatus) {
        logger.warn(`Unknown status in webhook: ${status}`);
        return { success: false, error: 'Unknown status' };
      }

      // Обновляем лид
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          brokerStatus: newStatus,
          brokerStatusChangedAt: new Date()
        }
      });

      // Записываем в историю
      await prisma.leadStatusEvent.create({
        data: {
          leadId: lead.id,
          kind: 'brokerStatus',
          from: lead.brokerStatus,
          to: newStatus
        }
      });

      logger.log(`✅ Updated lead ${lead.id}: ${lead.brokerStatus} → ${newStatus}`);

      // TODO: Если статус = DEPOSITOR, отправить постбек аффилиату

      return {
        success: true,
        lead_id: lead.id,
        old_status: lead.brokerStatus,
        new_status: newStatus
      };

    } catch (error: any) {
      logger.error('Error processing webhook:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Маппинг статуса брокера в наш формат
   */
  private mapBrokerStatus(rawStatus: string): string | null {
    if (!rawStatus) return null;

    const statusMap: Record<string, string> = {
      'new': 'NEW',
      'no_answer': 'NO_ANSWER',
      'no answer': 'NO_ANSWER',
      'not_interested': 'NOT_INTERESTED',
      'not interested': 'NOT_INTERESTED',
      'callback': 'CALLBACK',
      'depositor': 'DEPOSITOR',
      'ftd': 'FTD',
      'retention': 'RETENTION',
      'converted': 'CONVERTED',
      'rejected': 'REJECTED'
    };

    const normalized = rawStatus.toLowerCase().trim();
    return statusMap[normalized] || rawStatus.toUpperCase();
  }
}

