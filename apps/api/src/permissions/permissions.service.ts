import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class PermissionsService {
  async getSettings(aff: string) {
    const settings = await prisma.affSettings.findUnique({
      where: { aff }
    });

    if (!settings) {
      // Возвращаем дефолтные настройки
      return {
        aff,
        nameVisibility: 'SHOW',
        emailVisibility: 'SHOW',
        phoneVisibility: 'SHOW',
        canViewGroupLeads: false,
      };
    }

    return settings;
  }

  async updateSettings(
    aff: string,
    dto: {
      nameVisibility?: 'SHOW' | 'MASK' | 'HIDE';
      emailVisibility?: 'SHOW' | 'MASK' | 'HIDE';
      phoneVisibility?: 'SHOW' | 'MASK' | 'HIDE';
      canViewGroupLeads?: boolean;
    }
  ) {
    return prisma.affSettings.upsert({
      where: { aff },
      update: dto,
      create: {
        aff,
        nameVisibility: dto.nameVisibility || 'SHOW',
        emailVisibility: dto.emailVisibility || 'SHOW',
        phoneVisibility: dto.phoneVisibility || 'SHOW',
        canViewGroupLeads: dto.canViewGroupLeads ?? false,
      }
    });
  }
}


