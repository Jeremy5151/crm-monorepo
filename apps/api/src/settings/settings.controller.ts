import { Controller, Get, Patch, Body, Logger } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('v1/settings')
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings() {
    this.logger.log('Getting CRM settings');
    return this.settingsService.getSettings();
  }

  @Patch()
  updateSettings(@Body() data: { timezone?: string; theme?: string; language?: string }) {
    this.logger.log(`Updating CRM settings: timezone=${data.timezone}, theme=${data.theme}, language=${data.language}`);
    return this.settingsService.updateSettings(data);
  }
}
