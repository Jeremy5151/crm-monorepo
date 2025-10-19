import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { SettingsModule } from '../settings/settings.module';
import { BoxesModule } from '../boxes/boxes.module';

@Module({
  imports: [SettingsModule, BoxesModule],
  providers: [LeadsService],
  controllers: [LeadsController]
})
export class LeadsModule {}
