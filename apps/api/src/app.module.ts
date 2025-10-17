import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LeadsModule } from './leads/leads.module';
import { TemplatesModule } from './templates/templates.module';
import { DispatchService } from './dispatcher/dispatch.service';
import { AppController } from './app.controller';
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), LeadsModule, TemplatesModule],
  providers: [DispatchService],
})


@Module({ imports: [LeadsModule, TemplatesModule], controllers: [AppController] })
export class AppModule { }