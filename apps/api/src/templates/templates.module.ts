import { Module } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { TemplateSyncService } from './template-sync.service';
import { TemplateSyncController } from './template-sync.controller';

@Module({
  providers: [TemplatesService, TemplateSyncService],
  controllers: [TemplatesController, TemplateSyncController],
  exports: [TemplatesService, TemplateSyncService],
})
export class TemplatesModule {}


