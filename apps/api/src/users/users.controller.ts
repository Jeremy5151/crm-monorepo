import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Logger, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { CurrentUser, CurrentUser as CurrentUserType } from '../auth/current-user.decorator';
import { AuthGuard } from '../auth/auth.guard';

@Controller('v1/users')
@UseGuards(AuthGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() currentUser: CurrentUserType) {
    this.logger.log(`Creating user: ${createUserDto.email}`);
    return this.usersService.create(createUserDto, currentUser.id);
  }

  @Get()
  findAll(@Query() listUsersDto: ListUsersDto, @CurrentUser() currentUser: CurrentUserType) {
    this.logger.log('Listing users');
    return this.usersService.findAll(listUsersDto, currentUser.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() currentUser: CurrentUserType) {
    this.logger.log(`Finding user with ID: ${id}`);
    return this.usersService.findOne(id, currentUser.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @CurrentUser() currentUser: CurrentUserType) {
    this.logger.log(`Updating user with ID: ${id}`);
    return this.usersService.update(id, updateUserDto, currentUser.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() currentUser: CurrentUserType) {
    this.logger.log(`Deleting user with ID: ${id}`);
    return this.usersService.remove(id, currentUser.id);
  }

  @Post(':id/regenerate-api-key')
  regenerateApiKey(@Param('id') id: string, @CurrentUser() currentUser: CurrentUserType) {
    this.logger.log(`Regenerating API key for user: ${id}`);
    return this.usersService.regenerateApiKey(id, currentUser.id);
  }
}
