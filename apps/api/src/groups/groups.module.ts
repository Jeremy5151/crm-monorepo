import { Module } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [GroupsController],
  providers: [GroupsService],
  imports: [PrismaModule, AuthModule],
  exports: [GroupsService]
})
export class GroupsModule {}

