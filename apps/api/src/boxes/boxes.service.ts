import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class BoxesService {
  private readonly logger = new Logger(BoxesService.name);

  async list() {
    return prisma.box.findMany({
      include: {
        brokers: {
          include: {
            broker: true
          },
          orderBy: {
            priority: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async get(id: string) {
    return prisma.box.findUnique({
      where: { id },
      include: {
        brokers: {
          include: {
            broker: true
          },
          orderBy: {
            priority: 'asc'
          }
        }
      }
    });
  }

  async create(data: {
    name: string;
    country?: string;
    isActive?: boolean;
    brokers: { brokerId: string; priority: number }[];
  }) {
    const box = await prisma.box.create({
      data: {
        name: data.name,
        country: data.country || null,
        isActive: data.isActive ?? true,
        brokers: {
          create: data.brokers.map(b => ({
            brokerId: b.brokerId,
            priority: b.priority
          }))
        }
      },
      include: {
        brokers: {
          include: {
            broker: true
          },
          orderBy: {
            priority: 'asc'
          }
        }
      }
    });

    this.logger.log(`Created box: ${box.id} (${box.name})`);
    return box;
  }

  async update(id: string, data: {
    name?: string;
    country?: string;
    isActive?: boolean;
    brokers?: { brokerId: string; priority: number }[];
  }) {
    // Если передали новый список брокеров - удаляем старые и создаем новые
    if (data.brokers) {
      await prisma.boxBroker.deleteMany({ where: { boxId: id } });
    }

    const box = await prisma.box.update({
      where: { id },
      data: {
        name: data.name,
        country: data.country !== undefined ? data.country : undefined,
        isActive: data.isActive,
        brokers: data.brokers ? {
          create: data.brokers.map(b => ({
            brokerId: b.brokerId,
            priority: b.priority
          }))
        } : undefined
      },
      include: {
        brokers: {
          include: {
            broker: true
          },
          orderBy: {
            priority: 'asc'
          }
        }
      }
    });

    this.logger.log(`Updated box: ${id}`);
    return box;
  }

  async delete(id: string) {
    await prisma.box.delete({ where: { id } });
    this.logger.log(`Deleted box: ${id}`);
    return { ok: true };
  }

  /**
   * Получить бокс для лида по стране
   */
  async getBoxForLead(country?: string): Promise<any | null> {
    if (!country) {
      // Если страна не указана - берем бокс без страны (универсальный)
      return prisma.box.findFirst({
        where: {
          isActive: true,
          country: null
        },
        include: {
          brokers: {
            include: {
              broker: true
            },
            orderBy: {
              priority: 'asc'
            }
          }
        }
      });
    }

    // Ищем бокс для конкретной страны
    const countryBox = await prisma.box.findFirst({
      where: {
        isActive: true,
        country: country.toUpperCase()
      },
      include: {
        brokers: {
          include: {
            broker: true
          },
          orderBy: {
            priority: 'asc'
          }
        }
      }
    });

    if (countryBox) return countryBox;

    // Если не нашли - берем универсальный бокс
    return prisma.box.findFirst({
      where: {
        isActive: true,
        country: null
      },
      include: {
        brokers: {
          include: {
            broker: true
          },
          orderBy: {
            priority: 'asc'
          }
        }
      }
    });
  }
}

