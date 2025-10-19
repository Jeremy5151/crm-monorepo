import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Пропускаем публичные эндпоинты
    const publicPaths = ['/v1/ping', '/v1/webhook'];
    if (publicPaths.some(path => request.url.startsWith(path))) {
      return true;
    }

    // Получаем API ключ из заголовка
    const apiKey = request.headers['x-api-key'] as string;
    
    try {
      const user = await this.authService.validateApiKey(apiKey);
      if (!user) {
        throw new UnauthorizedException('Неверный API ключ');
      }
      request.user = user;
      return true;
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Ошибка аутентификации');
    }
  }
}
