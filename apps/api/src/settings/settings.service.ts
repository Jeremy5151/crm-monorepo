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
          timezone: 'UTC',
          theme: 'light',
          language: 'en',
          accentColor: '#FFD666'
        }
      });
      this.logger.log('Created default CRM settings');
    }

    return settings;
  }

  async updateSettings(data: { timezone?: string; theme?: string; language?: string; accentColor?: string }) {
    let settings = await prisma.crmSettings.findFirst();
    
    if (!settings) {
      settings = await prisma.crmSettings.create({
        data: {
          timezone: data.timezone || 'UTC',
          theme: data.theme || 'light',
          language: data.language || 'en',
          accentColor: data.accentColor || '#FFD666'
        }
      });
    } else {
      settings = await prisma.crmSettings.update({
        where: { id: settings.id },
        data: {
          timezone: data.timezone,
          theme: data.theme,
          language: data.language,
          accentColor: data.accentColor
        }
      });
    }

    this.logger.log(`Updated CRM settings: timezone=${settings.timezone}, theme=${settings.theme}, language=${settings.language}, accentColor=${settings.accentColor}`);
    return settings;
  }
}
