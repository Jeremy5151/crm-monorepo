import {
  Controller, Get, Post, Patch, Body, Param, Query, Headers,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ListLeadsDto } from './dto/list-leads.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Controller('/v1/leads')
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  @Get()
  list(@Query() dto: ListLeadsDto, @Headers('x-api-key') key?: string) {
    return this.service.list(dto, key);
  }

  @Post()
  create(@Body() dto: CreateLeadDto, @Headers('x-api-key') key?: string) {
    return this.service.create(dto, key);
  }

  @Get(':id')
  get(@Param('id') id: string, @Headers('x-api-key') key?: string) {
    return this.service.get(id, key);
  }

  @Get(':id/attempts')
  attempts(@Param('id') id: string, @Headers('x-api-key') key?: string) {
    return this.service.attempts(id, key);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @Headers('x-api-key') key?: string,
  ) {
    return this.service.update(id, dto, key);
  }

  @Post(':id/clone')
  clone(@Param('id') id: string, @Headers('x-api-key') key?: string) {
    return this.service.clone(id, key);
  }

  @Post('bulk-delete')
  bulkDelete(@Body() dto: { ids: string[] }, @Headers('x-api-key') key?: string) {
    return this.service.bulkDelete(dto.ids, key);
  }

  @Post('bulk-clone')
  bulkClone(@Body() dto: { ids: string[] }, @Headers('x-api-key') key?: string) {
    return this.service.bulkClone(dto.ids, key);
  }

  @Post('bulk-send')
  bulkSend(@Body() dto: { ids: string[]; broker?: string; intervalMinutes?: number }, @Headers('x-api-key') key?: string) {
    return this.service.bulkSend(dto.ids, dto.broker, key, dto.intervalMinutes);
  }

  @Get('queue')
  getQueue() {
    return this.service.getQueue();
  }

  @Get('cancellations')
  getCancellations() {
    return this.service.getCancellations();
  }

  @Post('cancel-sending')
  cancelSending(@Body() dto: { leadId: string }) {
    return this.service.cancelSending(dto.leadId);
  }

  @Post('remove-completed')
  removeCompleted(@Body() dto: { leadId: string }) {
    return this.service.removeCompleted(dto.leadId);
  }

  @Post('clear-queue')
  clearQueue() {
    return this.service.clearQueue();
  }
}
