import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { StatusPullService } from './status-pull.service';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [WebhookController],
  providers: [StatusPullService],
  exports: [StatusPullService]
})
export class BrokerModule {}

