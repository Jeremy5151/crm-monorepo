import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}
  async create(createUserDto: CreateUserDto, currentUserId?: string) {
    // Проверяем, что email уникален
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email }
    });
    
    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    // Проверяем права на создание пользователя
    if (currentUserId) {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: currentUserId }
      });
      
      if (!currentUser) {
        throw new NotFoundException('Пользователь не найден');
      }

      // Только SUPERADMIN, ADMIN и AFFILIATE_MASTER могут создавать пользователей
      if (!['SUPERADMIN', 'ADMIN', 'AFFILIATE_MASTER'].includes(currentUser.role)) {
        throw new ForbiddenException('Недостаточно прав для создания пользователей');
      }

      // AFFILIATE_MASTER может создавать только AFFILIATE
      if (currentUser.role === 'AFFILIATE_MASTER' && createUserDto.role !== 'AFFILIATE') {
        throw new ForbiddenException('Affiliate Master может создавать только обычных аффилиатов');
      }
    }

    // Устанавливаем права доступа по умолчанию в зависимости от роли

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        createdBy: currentUserId,
        parentId: createUserDto.parentId || currentUserId,
        isActive: createUserDto.isActive ?? true,
        timezone: createUserDto.timezone || 'UTC',
        language: createUserDto.language || 'ru',
      },
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

    return user;
  }

  async findAll(currentUserId?: string) {
    const search = undefined;
    const role = undefined;
    const isActive = undefined;
    const parentId = undefined;
    const take = '50';
    const skip = '0';
    
    // Получаем текущего пользователя для проверки прав
    let currentUser = null;
    if (currentUserId) {
      currentUser = await this.prisma.user.findUnique({
        where: { id: currentUserId }
      });
    }

    const where: any = {};

    // Фильтрация по поиску
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }

    // Фильтрация по роли
    if (role) {
      where.role = role;
    }

    // Фильтрация по активности
    // Пропускаем - не используется

    // Фильтрация по родителю
    if (parentId) {
      where.parentId = parentId;
    }

    // Ограничения доступа
    if (currentUser) {
      if (currentUser.role === 'AFFILIATE_MASTER') {
        // Affiliate Master видит только своих детей
        where.parentId = currentUserId;
        // Скрываем SUPERADMIN от всех
        where.role = { not: 'SUPERADMIN' };
      } else if (currentUser.role === 'AFFILIATE') {
        // Обычный аффилиат видит только себя
        where.id = currentUserId;
      } else if (currentUser.role === 'ADMIN') {
        // ADMIN видит всех кроме SUPERADMIN
        where.role = { not: 'SUPERADMIN' };
      }
      // SUPERADMIN видит всех (включая других SUPERADMIN)
    } else {
      // Если пользователь не авторизован, скрываем SUPERADMIN
      where.role = { not: 'SUPERADMIN' };
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        parent: true,
        createdByUser: true,
        _count: {
          select: {
            leads: true,
            children: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(take),
      skip: parseInt(skip),
    });

    const total = await this.prisma.user.count({ where });

    return {
      users,
      total,
      take: parseInt(take),
      skip: parseInt(skip),
    };
  }

  async findOne(id: string, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        parent: true,
        createdByUser: true,
        children: {
          include: {
            _count: {
              select: {
                leads: true,
                children: true,
              }
            }
          }
        },
        _count: {
          select: {
            leads: true,
            children: true,
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Проверяем права доступа
    if (currentUserId) {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: currentUserId }
      });
      
      if (!currentUser) {
        throw new NotFoundException('Пользователь не найден');
      }

      if (currentUser.role === 'AFFILIATE' && user.id !== currentUserId) {
        throw new ForbiddenException('Недостаточно прав для просмотра этого пользователя');
      }

      if (currentUser.role === 'AFFILIATE_MASTER' && user.parentId !== currentUserId) {
        throw new ForbiddenException('Недостаточно прав для просмотра этого пользователя');
      }
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Проверяем права на обновление
    if (currentUserId) {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: currentUserId }
      });
      
      if (!currentUser) {
        throw new NotFoundException('Пользователь не найден');
      }

      // Только SUPERADMIN, ADMIN и AFFILIATE_MASTER могут обновлять пользователей
      if (!['SUPERADMIN', 'ADMIN', 'AFFILIATE_MASTER'].includes(currentUser.role)) {
        throw new ForbiddenException('Недостаточно прав для обновления пользователей');
      }

      // AFFILIATE_MASTER может обновлять только своих детей
      if (currentUser.role === 'AFFILIATE_MASTER' && user.parentId !== currentUserId) {
        throw new ForbiddenException('Недостаточно прав для обновления этого пользователя');
      }

      // AFFILIATE_MASTER не может менять роль
      if (currentUser.role === 'AFFILIATE_MASTER' && (updateUserDto as any).role && (updateUserDto as any).role !== 'AFFILIATE') {
        throw new ForbiddenException('Affiliate Master может управлять только обычными аффилиатами');
      }
    }

    // Проверяем уникальность email
    if ((updateUserDto as any).email && (updateUserDto as any).email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: (updateUserDto as any).email }
      });
      
      if (existingUser) {
        throw new ConflictException('Пользователь с таким email уже существует');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
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

    return updatedUser;
  }

  async remove(id: string, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Проверяем права на удаление
    if (currentUserId) {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: currentUserId }
      });
      
      if (!currentUser) {
        throw new NotFoundException('Пользователь не найден');
      }

      // Только SUPERADMIN и ADMIN могут удалять пользователей
      if (!['SUPERADMIN', 'ADMIN'].includes(currentUser.role)) {
        throw new ForbiddenException('Недостаточно прав для удаления пользователей');
      }

      // Нельзя удалить самого себя
      if (user.id === currentUserId) {
        throw new ForbiddenException('Нельзя удалить самого себя');
      }
    }

    await this.prisma.user.delete({
      where: { id }
    });

    return { message: 'Пользователь успешно удален' };
  }

  async regenerateApiKey(id: string, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Проверяем права
    if (currentUserId) {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: currentUserId }
      });
      
      if (!currentUser) {
        throw new NotFoundException('Пользователь не найден');
      }

      // Пользователь может регенерировать только свой ключ, или ADMIN/SUPERADMIN
      if (user.id !== currentUserId && !['SUPERADMIN', 'ADMIN'].includes(currentUser.role)) {
        throw new ForbiddenException('Недостаточно прав для регенерации API ключа');
      }
    }

    const newApiKey = `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { apiKey: newApiKey },
      select: { id: true, email: true, name: true, apiKey: true }
    });

    return updatedUser;
  }

}
