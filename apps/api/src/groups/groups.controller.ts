import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
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
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    if (!['ADMIN', 'SUPERADMIN'].includes(user.role)) {
      throw new Error('Недостаточно прав');
    }
    
    return this.groupsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string; isActive?: boolean; nameVisibility?: 'SHOW' | 'MASK' | 'HIDE'; emailVisibility?: 'SHOW' | 'MASK' | 'HIDE'; phoneVisibility?: 'SHOW' | 'MASK' | 'HIDE' }, @CurrentUser() user: any) {
    if (!['ADMIN', 'SUPERADMIN'].includes(user.role)) {
      throw new Error('Недостаточно прав');
    }
    
    return this.groupsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    if (!['ADMIN', 'SUPERADMIN'].includes(user.role)) {
      throw new Error('Недостаточно прав');
    }
    
    return this.groupsService.remove(id);
  }

  @Post(':id/users/:userId')
  addUser(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: any) {
    if (!['ADMIN', 'SUPERADMIN'].includes(user.role)) {
      throw new Error('Недостаточно прав');
    }
    
    return this.groupsService.addUser(id, userId);
  }

  @Delete(':id/users/:userId')
  removeUser(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: any) {
    if (!['ADMIN', 'SUPERADMIN'].includes(user.role)) {
      throw new Error('Недостаточно прав');
    }
    
    return this.groupsService.removeUser(id, userId);
  }
}

