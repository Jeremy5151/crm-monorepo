import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { StatusPullService } from '../broker/status-pull.service';
import { ImportLeadsService } from '../broker/import-leads.service';

@Controller('/v1/templates')
export class TemplatesController {
  constructor(
    private readonly svc: TemplatesService,
    private readonly pullService: StatusPullService,
    private readonly importService: ImportLeadsService
  ) {}

  @Get()
  list() { return this.svc.list(); }

  @Get(':id')
  get(@Param('id') id: string) { return this.svc.get(id); }

  @Post()
  create(@Body() dto: any) { return this.svc.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.svc.delete(id); }

  @Post(':id/pull-now')
  async pullNow(@Param('id') id: string) {
    const template = await this.svc.get(id);
    if (!template) {
      return { success: false, error: 'Template not found' };
    }
    if (!template.pullEnabled) {
      return { success: false, error: 'Pull API not enabled for this template' };
    }
    await this.pullService.pullBrokerStatus(template);
    return { success: true, message: 'Pull completed' };
  }

  @Post(':id/import-leads')
  async importLeads(
    @Param('id') id: string,
    @Body() body: { fromDate?: string; toDate?: string; daysBack?: number }
  ) {
    const template = await this.svc.get(id);
    if (!template) {
      return { success: false, error: 'Template not found' };
    }
    if (!template.pullEnabled || !template.pullUrl) {
      return { success: false, error: 'Pull API not configured for this template' };
    }

    // Определяем даты для импорта
    const daysBack = body.daysBack || 7; // по умолчанию за последние 7 дней
    const toDate = body.toDate ? new Date(body.toDate) : new Date();
    const fromDate = body.fromDate 
      ? new Date(body.fromDate) 
      : new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const result = await this.importService.importFromTrackbox(template, fromDate, toDate);
    return result;
  }
}


