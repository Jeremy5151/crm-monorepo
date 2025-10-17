import { Controller, Get, Param } from '@nestjs/common';
import { TemplateSyncService } from './template-sync.service';

@Controller('/v1/templates/sync')
export class TemplateSyncController {
  constructor(private readonly syncSvc: TemplateSyncService) {}

  @Get('available')
  getAvailableTemplates() { 
    return this.syncSvc.getAvailableTemplates(); 
  }

  @Get('config/:templateId')
  getTemplateConfig(@Param('templateId') templateId: string) { 
    return this.syncSvc.getTemplateConfig(templateId); 
  }

  @Get('installed')
  getInstalledTemplates() { 
    return this.syncSvc.getInstalledTemplates(); 
  }
}
