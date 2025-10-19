import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './current-user.decorator';

@Controller('v1/auth')
@UseGuards(AuthGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('me')
  async getCurrentUser(@CurrentUser() user: any) {
    return user;
  }
}
