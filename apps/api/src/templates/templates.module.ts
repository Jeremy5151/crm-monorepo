import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { TemplateSyncService } from './template-sync.service';
import { TemplateSyncController } from './template-sync.controller';
import { BrokerModule } from '../broker/broker.module';

@Module({
  imports: [HttpModule, BrokerModule],
  providers: [TemplatesService, TemplateSyncService],
  controllers: [TemplatesController, TemplateSyncController],
  exports: [TemplatesService, TemplateSyncService],
})
export class TemplatesModule {}


