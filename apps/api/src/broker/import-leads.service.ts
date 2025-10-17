import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';
import * as https from 'https';

const prisma = new PrismaClient();
const logger = new Logger('ImportLeadsService');

// Agent для отключения проверки SSL (только для dev/testing)
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

@Injectable()
export class ImportLeadsService {
  
  /**
   * Импорт лидов из Trackbox через Pull API
   */
  async importFromTrackbox(template: any, fromDate: Date, toDate: Date) {
    logger.log(`Importing leads from ${template.code}...`);
    
    try {
      // Рендерим body с датами
      const body = this.renderPullBody(template.pullBody, fromDate, toDate);
      
      logger.log(`Request to ${template.pullUrl}`);
      logger.log(`Headers:`, JSON.stringify(template.pullHeaders));
      logger.log(`Body: ${body}`);
      
      // Делаем запрос к Trackbox
      let response;
      try {
        response = await fetch(template.pullUrl, {
          method: template.pullMethod || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(template.pullHeaders || {})
          },
          body: body,
          agent: template.pullUrl.startsWith('https') ? httpsAgent : undefined
        }) as any;
      } catch (fetchError: any) {
        logger.error(`Fetch error:`, fetchError);
        throw new Error(`fetch failed: ${fetchError.message || fetchError.cause?.message || 'unknown error'}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`HTTP ${response.status}: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.log(`Response:`, JSON.stringify(data).slice(0, 1000));
      
      // Проверяем успешность запроса
      if (data.status === false) {
        logger.error(`Trackbox error: ${data.message}`);
        return {
          success: false,
          error: data.message,
          imported: 0
        };
      }

      // Парсим и импортируем лиды
      const importedCount = await this.processLeads(template.code, data);
      
      logger.log(`✅ Imported ${importedCount} leads from ${template.code}`);
      
      return {
        success: true,
        imported: importedCount
      };
      
    } catch (error: any) {
      logger.error(`❌ Import failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        imported: 0
      };
    }
  }

  /**
   * Рендерим body для pull запроса с датами
   */
  renderPullBody(template: string, from: Date, to: Date): string {
    const formatDate = (date: Date) => {
      return date.toISOString().replace('T', ' ').slice(0, 19);
    };

    if (!template) {
      return JSON.stringify({
        from: formatDate(from),
        to: formatDate(to),
        type: "3"
      });
    }

    return template
      .replace(/\$\{from\}/g, formatDate(from))
      .replace(/\$\{to\}/g, formatDate(to))
      .replace(/\$\{fromIso\}/g, from.toISOString())
      .replace(/\$\{toIso\}/g, to.toISOString());
  }

  /**
   * Обрабатываем лиды из ответа Trackbox
   */
  async processLeads(brokerCode: string, data: any): Promise<number> {
    let importedCount = 0;

    // Trackbox формат: { data: { customers: [...] } }
    const customers = data?.data?.customers || data?.customers || [];
    
    if (!Array.isArray(customers)) {
      logger.warn(`Unexpected response format`);
      return 0;
    }

    logger.log(`Found ${customers.length} customers to import`);

    for (const customer of customers) {
      try {
        const externalId = String(customer.uniqueid || customer.id || customer.customer_id);
        
        // Проверяем, есть ли уже такой лид
        const existing = await prisma.lead.findFirst({
          where: { externalId }
        });

        if (existing) {
          logger.debug(`Lead ${externalId} already exists, skipping`);
          continue;
        }

        // Создаем нового лида
        await prisma.lead.create({
          data: {
            firstName: customer.firstname || customer.first_name || null,
            lastName: customer.lastname || customer.last_name || null,
            email: customer.email || null,
            phone: customer.phone || null,
            country: customer.country || null,
            ip: customer.userip || customer.ip || null,
            
            // Trackbox специфичные поля
            aff: customer.sub || customer.aff || null,
            funnel: customer.so || customer.funnel || null,
            
            // UTM параметры
            utmSource: customer.ad || null,
            utmTerm: customer.term || null,
            utmCampaign: customer.campaign || null,
            utmMedium: customer.medium || null,
            
            // Sub параметры
            attrs: {
              sub1: customer.MPC_1 || '',
              sub2: customer.MPC_2 || '',
              sub3: customer.MPC_3 || '',
              sub4: customer.MPC_4 || '',
              sub5: customer.MPC_5 || '',
              sub6: customer.MPC_6 || '',
              sub7: customer.MPC_7 || '',
              sub8: customer.MPC_8 || '',
              sub9: customer.MPC_9 || '',
              sub10: customer.MPC_10 || '',
            },
            
            // Статусы
            status: 'SENT',
            externalId,
            brokerStatus: this.mapBrokerStatus(customer.status || customer.customer_status),
            sentAt: customer.created_at ? new Date(customer.created_at) : new Date(),
            
            // Дополнительные поля
            lang: customer.lg || null,
            autologinUrl: customer.login_url || customer.autologin_url || null,
          }
        });

        importedCount++;
        
      } catch (error) {
        logger.error(`Error importing customer ${customer.uniqueid}:`, error);
      }
    }

    return importedCount;
  }

  /**
   * Маппинг статуса брокера
   */
  mapBrokerStatus(rawStatus: string): string | null {
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
      'converted': 'CONVERTED'
    };

    const normalized = rawStatus.toLowerCase().trim();
    return statusMap[normalized] || rawStatus.toUpperCase();
  }
}

