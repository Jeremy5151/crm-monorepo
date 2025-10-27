import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('v1/groups')
@UseGuards(AuthGuard)
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @Post()
  create(@Body() body: { name: string; description?: string }, @CurrentUser() user: any) {
    // Только ADMIN и SUPERADMIN могут создавать группы
    if (!['ADMIN', 'SUPERADMIN'].includes(user.role)) {
      throw new Error('Недостаточно прав');
    }
    
    return this.groupsService.create(body);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    // Только ADMIN и SUPERADMIN могут видеть группы
    if (!['ADMIN', 'SUPERADMIN'].includes(user.role)) {
      throw new Error('Недостаточно прав');
    }
    
    return this.groupsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    if (!['ADMIN', 'SUPERADMIN'].includes(user.role)) {
      throw new Error('Недостаточно прав');
    }
    
    return this.groupsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: { name?: string; description?: string; isActive?: boolean }, @CurrentUser() user: any) {
    if (!['ADMIN', 'SUPERADMIN'].includes(user.role)) {
      throw new Error('Недостаточно прав');
    }
    
    return this.groupsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    if (!['ADMIN', 'SUPERADMIN'].includes(user.role)) {
      throw new Error('Недостаточно прав');
    }
    
    return this.groupsService.remove(id);
  }

  @Post(':id/users/:userId')
  addUser(@Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) userId: string, @CurrentUser() user: any) {
    if (!['ADMIN', 'SUPERADMIN'].includes(user.role)) {
      throw new Error('Недостаточно прав');
    }
    
    return this.groupsService.addUser(id, userId);
  }

  @Delete(':id/users/:userId')
  removeUser(@Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) userId: string, @CurrentUser() user: any) {
    if (!['ADMIN', 'SUPERADMIN'].includes(user.role)) {
      throw new Error('Недостаточно прав');
    }
    
    return this.groupsService.removeUser(id, userId);
  }
}

