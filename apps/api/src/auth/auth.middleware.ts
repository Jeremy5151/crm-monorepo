import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  async validateApiKey(apiKey: string) {
    if (!apiKey) {
      throw new UnauthorizedException('API ключ не предоставлен');
    }

    // Ищем пользователя по API ключу
    const user = await prisma.user.findUnique({
      where: { apiKey },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true
      }
    });

    if (!user) {
      throw new UnauthorizedException('Неверный API ключ');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Пользователь неактивен');
    }

    return user;
  }
}
