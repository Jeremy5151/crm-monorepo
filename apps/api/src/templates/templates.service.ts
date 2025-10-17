import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { BrokerRegistry, HttpTemplateAdapter } from '../broker/adapter.mock';

const logger = new Logger('TemplatesService');

const prisma = new PrismaClient();

@Injectable()
export class TemplatesService implements OnModuleInit {
  async onModuleInit() {
    logger.log('Initializing TemplatesService...');
    await this.registerActiveTemplates();
  }

  async registerActiveTemplates() {
    try {
      const templates = await prisma.brokerTemplate.findMany({ where: { isActive: true } });
      logger.log(`Found ${templates.length} active templates`);
      for (const t of templates) {
        BrokerRegistry.register(new HttpTemplateAdapter(
          t.code,
          {
            url: t.url,
            method: (t.method as any) ?? 'POST',
            headers: (t.headers as any) ?? undefined,
            body: t.body ?? undefined,
          },
          (t.params as any) ?? undefined
        ));
        logger.log(`Registered broker template: ${t.code}`);
      }
    } catch (error) {
      logger.error('Error registering templates:', error);
    }
  }

  list() { return prisma.brokerTemplate.findMany({ orderBy: { createdAt: 'desc' } }); }
  get(id: string) { return prisma.brokerTemplate.findUnique({ where: { id } }); }
  async create(data: { code: string; name?: string; templateName?: string; isActive?: boolean; method?: string; url: string; headers?: any; body?: string | null; }) {
    const template = await prisma.brokerTemplate.create({ data: data as any });
    
    // Register the new template in BrokerRegistry if it's active
    if (template.isActive !== false) {
      BrokerRegistry.register(new HttpTemplateAdapter(
        template.code,
        {
          url: template.url,
          method: (template.method as any) ?? 'POST',
          headers: (template.headers as any) ?? undefined,
          body: template.body ?? undefined,
        },
        (template.params as any) ?? undefined
      ));
      logger.log(`Registered new broker template: ${template.code}`);
    }
    
    return template;
  }
  async update(id: string, data: Partial<{ code: string; name?: string; templateName?: string; isActive?: boolean; method?: string; url: string; headers?: any; body?: string | null; }>) {
    const template = await prisma.brokerTemplate.update({ where: { id }, data: data as any });
    
    // Re-register the updated template in BrokerRegistry if it's active
    if (template.isActive !== false) {
      BrokerRegistry.register(new HttpTemplateAdapter(
        template.code,
        {
          url: template.url,
          method: (template.method as any) ?? 'POST',
          headers: (template.headers as any) ?? undefined,
          body: template.body ?? undefined,
        },
        (template.params as any) ?? undefined
      ));
      logger.log(`Re-registered updated broker template: ${template.code}`);
    }
    
    return template;
  }
  delete(id: string) { return prisma.brokerTemplate.delete({ where: { id } }); }
}


