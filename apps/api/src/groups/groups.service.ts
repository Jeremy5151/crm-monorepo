import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; description?: string }) {
    // Проверяем, что название уникально
    const existing = await this.prisma.group.findUnique({
      where: { name: data.name }
    });
    
    if (existing) {
      throw new ConflictException('Группа с таким названием уже существует');
    }

    return this.prisma.group.create({
      data,
      include: {
        users: {
          include: {
            user: true
          }
        }
      }
    });
  }

  async findAll() {
    return this.prisma.group.findMany({
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!group) {
      throw new NotFoundException('Группа не найдена');
    }

    return group;
  }

  async update(id: string, data: { name?: string; description?: string; isActive?: boolean; nameVisibility?: 'SHOW' | 'MASK' | 'HIDE'; emailVisibility?: 'SHOW' | 'MASK' | 'HIDE'; phoneVisibility?: 'SHOW' | 'MASK' | 'HIDE' }) {
    const existing = await this.prisma.group.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new NotFoundException('Группа не найдена');
    }

    // Проверяем уникальность имени, если оно меняется
    if (data.name && data.name !== existing.name) {
      const duplicate = await this.prisma.group.findUnique({
        where: { name: data.name }
      });
      
      if (duplicate) {
        throw new ConflictException('Группа с таким названием уже существует');
      }
    }

    return this.prisma.group.update({
      where: { id },
      data,
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true
              }
            }
          }
        }
      }
    });
  }

  async remove(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id }
    });

    if (!group) {
      throw new NotFoundException('Группа не найдена');
    }

    return this.prisma.group.delete({
      where: { id }
    });
  }

  async addUser(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      throw new NotFoundException('Группа не найдена');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Проверяем, не добавлен ли уже пользователь
    const existing = await this.prisma.groupToUser.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId
        }
      }
    });

    if (existing) {
      throw new ConflictException('Пользователь уже в группе');
    }

    return this.prisma.groupToUser.create({
      data: {
        groupId,
        userId
      },
      include: {
        user: true
      }
    });
  }

  async removeUser(groupId: string, userId: string) {
    const relation = await this.prisma.groupToUser.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId
        }
      }
    });

    if (!relation) {
      throw new NotFoundException('Пользователь не найден в группе');
    }

    return this.prisma.groupToUser.delete({
      where: {
        groupId_userId: {
          groupId,
          userId
        }
      }
    });
  }
}

