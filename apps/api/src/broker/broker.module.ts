import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { StatusPullService } from './status-pull.service';
import { ImportLeadsService } from './import-leads.service';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [WebhookController],
  providers: [StatusPullService, ImportLeadsService],
  exports: [StatusPullService, ImportLeadsService]
})
export class BrokerModule {}

