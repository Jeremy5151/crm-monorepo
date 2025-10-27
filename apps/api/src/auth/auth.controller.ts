import { Controller, Get, Post, Body, UseGuards, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './current-user.decorator';

@Controller('v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.authService.validateCredentials(body.email, body.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        apiKey: user.apiKey,
      }
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentUser(@CurrentUser() user: any) {
    return user;
  }
}
