import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
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
  private readonly TEMPLATES_BASE_URL = 'https://raw.githubusercontent.com/Jeremy5151/shablons/main';

  constructor(private readonly httpService: HttpService) {}

  async getAvailableTemplates(): Promise<ExternalTemplate[]> {
    try {
      // Используем timestamp для обхода кеша GitHub
      // templates.json находится в shablons/templates.json (репозиторий содержит папку shablons)
      const url = `https://raw.githubusercontent.com/Jeremy5151/shablons/main/shablons/templates.json?t=${Date.now()}`;
      logger.log(`Fetching templates from: ${url}`);
      
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
      );
      
      logger.log(`Response status: ${response.status}, data length: ${JSON.stringify(response.data).length}`);
      
      const data = response.data;
      const templates = data.templates || [];
      logger.log(`Found ${templates.length} templates`);
      
      return templates;
    } catch (error) {
      logger.error('Error fetching available templates:', error);
      logger.error(`Error details: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async getTemplateConfig(templateId: string): Promise<ExternalTemplate | null> {
    try {
      // Путь: shablons/templates/{templateId}/config.json (так как репозиторий shablons находится в корне)
      const url = `${this.TEMPLATES_BASE_URL}/shablons/templates/${templateId}/config.json?t=${Date.now()}`;
      logger.log(`Fetching template config from: ${url}`);
      
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
      );
      
      return response.data;
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
