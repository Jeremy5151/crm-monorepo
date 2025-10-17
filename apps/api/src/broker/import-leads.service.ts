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
      // Рендерим URL с параметрами
      const pullUrl = this.renderPullUrl(template.pullUrl, fromDate, toDate, template.params || {});
      
      // Рендерим body с датами
      const body = this.renderPullBody(template.pullBody, fromDate, toDate);
      
      logger.log(`Request to ${pullUrl}`);
      logger.log(`Headers:`, JSON.stringify(template.pullHeaders));
      logger.log(`Body: ${body}`);
      
      // Делаем запрос к брокеру
      let response;
      try {
        const method = template.pullMethod || 'POST';
        const options: any = {
          method,
          headers: {
            ...(template.pullHeaders || {})
          },
          agent: template.pullUrl.startsWith('https') ? httpsAgent : undefined
        };
        
        // Для POST добавляем Content-Type и body
        if (method === 'POST') {
          options.headers['Content-Type'] = 'application/json';
          options.body = body;
        }
        
        response = await fetch(pullUrl, options) as any;
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
   * Обрабатываем лиды из ответа брокера (Trackbox или AlgoLead)
   */
  async processLeads(brokerCode: string, data: any): Promise<number> {
    let importedCount = 0;

    // Trackbox формат: { data: { customers: [...] } }
    // AlgoLead формат: { status: "Success", data: [{...}, {...}] }
    let customers = data?.data?.customers || data?.customers || [];
    
    // Если data - это массив (AlgoLead), используем его напрямую
    if (Array.isArray(data?.data)) {
      customers = data.data;
    }
    
    if (!Array.isArray(customers)) {
      logger.warn(`Unexpected response format`);
      return 0;
    }

    logger.log(`Found ${customers.length} customers to import`);

    for (const customer of customers) {
      try {
        // AlgoLead использует UserID, Trackbox - uniqueid
        const externalId = String(customer.UserID || customer.AccountID || customer.uniqueid || customer.id || customer.customer_id);
        
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
            // AlgoLead: FirstName, LastName; Trackbox: firstname, lastname
            firstName: customer.FirstName || customer.firstname || customer.first_name || null,
            lastName: customer.LastName || customer.lastname || customer.last_name || null,
            email: customer.LoginEmail || customer.email || null,
            phone: customer.Phone || customer.phone || null,
            country: customer.Country || customer.country || null,
            ip: customer.ClientIP || customer.userip || customer.ip || null,
            
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
            // AlgoLead: SaleStatus; Trackbox: status
            brokerStatus: this.mapBrokerStatus(customer.SaleStatus || customer.status || customer.customer_status),
            // AlgoLead: CreateTime; Trackbox: created_at
            sentAt: customer.CreateTime ? new Date(customer.CreateTime) : (customer.created_at ? new Date(customer.created_at) : new Date()),
            
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
   * Маппинг статуса брокера (Trackbox, AlgoLead и другие)
   */
  mapBrokerStatus(rawStatus: string): string | null {
    if (!rawStatus) return null;

    const statusMap: Record<string, string> = {
      // Общие статусы
      'new': 'NEW',
      'no_answer': 'NO_ANSWER',
      'no answer': 'NO_ANSWER',
      'noanswer': 'NO_ANSWER',
      'not_interested': 'NOT_INTERESTED',
      'not interested': 'NOT_INTERESTED',
      'notinterested': 'NOT_INTERESTED',
      'nointerested': 'NOT_INTERESTED',
      'callback': 'CALLBACK',
      'depositor': 'DEPOSITOR',
      'ftd': 'FTD',
      'retention': 'RETENTION',
      'converted': 'CONVERTED',
      'interested': 'INTERESTED'
    };

    const normalized = rawStatus.toLowerCase().trim();
    return statusMap[normalized] || rawStatus.toUpperCase();
  }
}

