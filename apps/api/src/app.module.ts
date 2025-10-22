import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LeadsModule } from './leads/leads.module';
import { TemplatesModule } from './templates/templates.module';
import { BrokerModule } from './broker/broker.module';
import { BoxesModule } from './boxes/boxes.module';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PrismaModule } from './prisma/prisma.module';
import { DispatchService } from './dispatcher/dispatch.service';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    LeadsModule,
    TemplatesModule,
    BrokerModule,
    BoxesModule,
    SettingsModule,
    UsersModule,
    PermissionsModule,
  ],
  controllers: [AppController],
  providers: [DispatchService],
})
export class AppModule {}