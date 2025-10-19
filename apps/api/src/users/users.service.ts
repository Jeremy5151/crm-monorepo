import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersDto } from './dto/list-users.dto';

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
    const defaultPermissions = this.getDefaultPermissions(createUserDto.role);

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        createdBy: currentUserId,
        parentId: createUserDto.parentId || currentUserId,
        isActive: createUserDto.isActive ?? true,
        timezone: createUserDto.timezone || 'UTC',
        language: createUserDto.language || 'ru',
        // Права доступа (используем переданные или значения по умолчанию)
        canViewBrokers: createUserDto.canViewBrokers ?? defaultPermissions.canViewBrokers,
        canViewBoxes: createUserDto.canViewBoxes ?? defaultPermissions.canViewBoxes,
        canViewUsers: createUserDto.canViewUsers ?? defaultPermissions.canViewUsers,
        canViewFullEmail: createUserDto.canViewFullEmail ?? defaultPermissions.canViewFullEmail,
        canViewFullPhone: createUserDto.canViewFullPhone ?? defaultPermissions.canViewFullPhone,
        canResendLeads: createUserDto.canResendLeads ?? defaultPermissions.canResendLeads,
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

  async findAll(listUsersDto: ListUsersDto, currentUserId?: string) {
    const { search, role, isActive, parentId, take = '50', skip = '0' } = listUsersDto;
    
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
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Фильтрация по роли
    if (role) {
      where.role = role;
    }

    // Фильтрация по активности
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Фильтрация по родителю
    if (parentId) {
      where.parentId = parentId;
    }

    // Ограничения доступа
    if (currentUser) {
      if (currentUser.role === 'AFFILIATE_MASTER') {
        // Affiliate Master видит только своих детей
        where.parentId = currentUserId;
      } else if (currentUser.role === 'AFFILIATE') {
        // Обычный аффилиат видит только себя
        where.id = currentUserId;
      }
      // ADMIN и SUPERADMIN видят всех
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
      if (currentUser.role === 'AFFILIATE_MASTER' && updateUserDto.role && updateUserDto.role !== 'AFFILIATE') {
        throw new ForbiddenException('Affiliate Master может управлять только обычными аффилиатами');
      }
    }

    // Проверяем уникальность email
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email }
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

  private getDefaultPermissions(role: string) {
    switch (role) {
      case 'SUPERADMIN':
        return {
          canViewBrokers: true,
          canViewBoxes: true,
          canViewUsers: true,
          canViewFullEmail: true,
          canViewFullPhone: true,
          canResendLeads: true,
        };
      case 'ADMIN':
        return {
          canViewBrokers: true,
          canViewBoxes: true,
          canViewUsers: true,
          canViewFullEmail: true,
          canViewFullPhone: true,
          canResendLeads: true,
        };
      case 'AFFILIATE_MASTER':
        return {
          canViewBrokers: false,
          canViewBoxes: false,
          canViewUsers: false,
          canViewFullEmail: false,
          canViewFullPhone: false,
          canResendLeads: false,
        };
      case 'AFFILIATE':
      default:
        return {
          canViewBrokers: false,
          canViewBoxes: false,
          canViewUsers: false,
          canViewFullEmail: false,
          canViewFullPhone: false,
          canResendLeads: false,
        };
    }
  }
}
