import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const logger = new Logger('TemplateSyncService');
const prisma = new PrismaClient();

export interface ExternalTemplate {
  id: string;
  name: string;
  version: string;
  description: string;
  urlTemplate: string;
  method: string;
  headers: Record<string, string>;
  bodyTemplate: Record<string, any>;
  formFields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
  }>;
}

@Injectable()
export class TemplateSyncService {
  private readonly TEMPLATES_BASE_URL = 'https://jeremy5151.github.io/shablons';

  async getAvailableTemplates(): Promise<ExternalTemplate[]> {
    // Локальные шаблоны (fallback если GitHub недоступен)
    const localTemplates: ExternalTemplate[] = [
      {
        id: 'easyai-market',
        name: '🤖 EasyAI Market',
        version: '1.0.0',
        description: 'EasyAI Market affiliate integration with status pulling',
        urlTemplate: 'https://api.stahptdp.com/api/affiliate/leads',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer {TOKEN}',
          'Content-Type': 'application/json'
        },
        bodyTemplate: {
          firstName: '${firstName}',
          lastName: '${lastName}',
          email: '${email}',
          phone: '${phone}',
          country: '${country}',
          password: '${password}',
          ip: '${ip}',
          funnel: '${funnel}',
          aff: '${aff}'
        },
        formFields: [
          {
            name: 'TOKEN',
            label: 'API Bearer Token',
            type: 'text',
            required: true,
            placeholder: 'Enter your EasyAI Market API token'
          }
        ]
      }
    ];

    try {
      const response = await fetch(`${this.TEMPLATES_BASE_URL}/templates.json`);
      if (!response.ok) {
        logger.warn('GitHub templates unavailable, using local templates');
        return localTemplates;
      }
      const data = await response.json();
      return [...(data.templates || []), ...localTemplates];
    } catch (error) {
      logger.error('Error fetching available templates:', error);
      return localTemplates;
    }
  }

  async getTemplateConfig(templateId: string): Promise<ExternalTemplate | null> {
    // Локальный шаблон EasyAI Market
    if (templateId === 'easyai-market') {
      return {
        id: 'easyai-market',
        name: '🤖 EasyAI Market',
        version: '1.0.0',
        description: 'EasyAI Market affiliate integration with status pulling',
        urlTemplate: 'https://api.stahptdp.com/api/affiliate/leads',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer {TOKEN}',
          'Content-Type': 'application/json'
        },
        bodyTemplate: {
          firstName: '${firstName}',
          lastName: '${lastName}',
          email: '${email}',
          phone: '${phone}',
          country: '${country}',
          password: '${password}',
          ip: '${ip}',
          funnel: '${funnel}',
          aff: '${aff}'
        },
        formFields: [
          {
            name: 'TOKEN',
            label: 'API Bearer Token',
            type: 'text',
            required: true,
            placeholder: 'Enter your EasyAI Market API token'
          }
        ]
      };
    }

    try {
      const response = await fetch(`${this.TEMPLATES_BASE_URL}/templates/${templateId}/config.json`);
      if (!response.ok) {
        throw new Error(`Failed to fetch template config: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      logger.error(`Error fetching template config for ${templateId}:`, error);
      return null;
    }
  }

  async installTemplate(templateId: string): Promise<boolean> {
    try {
      const config = await this.getTemplateConfig(templateId);
      if (!config) {
        return false;
      }

      const existingTemplate = await prisma.brokerTemplate.findFirst({
        where: { code: templateId.toUpperCase() }
      });

      if (existingTemplate) {
        await prisma.brokerTemplate.update({
          where: { id: existingTemplate.id },
          data: {
            name: config.name,
            url: config.urlTemplate,
            method: config.method,
            headers: config.headers,
            body: JSON.stringify(config.bodyTemplate),
            isActive: true
          }
        });
        logger.log(`Updated template: ${templateId}`);
      } else {
        await prisma.brokerTemplate.create({
          data: {
            code: templateId.toUpperCase(),
            name: config.name,
            url: config.urlTemplate,
            method: config.method,
            headers: config.headers,
            body: JSON.stringify(config.bodyTemplate),
            isActive: true
          }
        });
        logger.log(`Installed new template: ${templateId}`);
      }

      return true;
    } catch (error) {
      logger.error(`Error installing template ${templateId}:`, error);
      return false;
    }
  }

  async getInstalledTemplates() {
    return prisma.brokerTemplate.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async uninstallTemplate(templateId: string): Promise<boolean> {
    try {
      await prisma.brokerTemplate.deleteMany({
        where: { code: templateId.toUpperCase() }
      });
      logger.log(`Uninstalled template: ${templateId}`);
      return true;
    } catch (error) {
      logger.error(`Error uninstalling template ${templateId}:`, error);
      return false;
    }
  }
}
