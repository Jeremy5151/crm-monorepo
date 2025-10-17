import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { StatusPullService } from '../broker/status-pull.service';

@Controller('/v1/templates')
export class TemplatesController {
  constructor(
    private readonly svc: TemplatesService,
    private readonly pullService: StatusPullService
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
}


