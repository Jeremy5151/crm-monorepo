import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  async getSettings() {
    let settings = await prisma.crmSettings.findFirst();
    
    if (!settings) {
      // Создаем настройки по умолчанию если их нет
      settings = await prisma.crmSettings.create({
        data: {
          timezone: 'UTC'
        }
      });
      this.logger.log('Created default CRM settings');
    }

    return settings;
  }

  async updateSettings(data: { timezone?: string }) {
    let settings = await prisma.crmSettings.findFirst();
    
    if (!settings) {
      settings = await prisma.crmSettings.create({
        data: {
          timezone: data.timezone || 'UTC'
        }
      });
    } else {
      settings = await prisma.crmSettings.update({
        where: { id: settings.id },
        data: {
          timezone: data.timezone
        }
      });
    }

    this.logger.log(`Updated CRM settings: timezone=${settings.timezone}`);
    return settings;
  }
}
