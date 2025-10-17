import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LeadsModule } from './leads/leads.module';
import { TemplatesModule } from './templates/templates.module';
import { BrokerModule } from './broker/broker.module';
import { DispatchService } from './dispatcher/dispatch.service';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LeadsModule,
    TemplatesModule,
    BrokerModule
  ],
  controllers: [AppController],
  providers: [DispatchService],
})
export class AppModule { }