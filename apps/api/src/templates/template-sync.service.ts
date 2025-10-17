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
    try {
      const response = await fetch(`${this.TEMPLATES_BASE_URL}/templates.json`);
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }
      const data = await response.json();
      return data.templates || [];
    } catch (error) {
      logger.error('Error fetching available templates:', error);
      return [];
    }
  }

  async getTemplateConfig(templateId: string): Promise<ExternalTemplate | null> {
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
