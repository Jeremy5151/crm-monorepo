import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TemplatesService } from './templates.service';

@Controller('/v1/templates')
export class TemplatesController {
  constructor(private readonly svc: TemplatesService) {}

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
}


