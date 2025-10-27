import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async validateApiKey(apiKey: string) {
    const user = await this.prisma.user.findUnique({
      where: { apiKey },
      include: {
        parent: true,
        createdByUser: true,
        _count: {
          select: {
            leads: true,
            children: true,
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }

  async getCurrentUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        parent: true,
        createdByUser: true,
        _count: {
          select: {
            leads: true,
            children: true,
          }
        }
      }
    });
  }

  async validateCredentials(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        parent: true,
        createdByUser: true,
        _count: {
          select: {
            leads: true,
            children: true,
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return null;
    }

    // Check password
    if (user.password !== password) {
      return null;
    }

    return user;
  }
}
