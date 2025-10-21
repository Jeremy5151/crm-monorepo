import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // ключ аффилиата (для примера)
  await prisma.apiKey.upsert({
    where: { key: 'aff_123' },
    update: { isActive: true, aff: 'aff_123', name: 'Test Affiliate 123' },
    create: { key: 'aff_123', aff: 'aff_123', name: 'Test Affiliate 123' },
  });

  // пара боксов
  await prisma.box.upsert({
    where: { code: 'box_hu_1' },
    update: { broker: 'MOCK', isActive: true, country: 'HU', name: 'Hungary Box' },
    create: { code: 'box_hu_1', broker: 'MOCK', isActive: true, country: 'HU', name: 'Hungary Box' },
  });

  await prisma.box.upsert({
    where: { code: 'box_fr_1' },
    update: { broker: 'MOCK', isActive: true, country: 'FR', name: 'France Box' },
    create: { code: 'box_fr_1', broker: 'MOCK', isActive: true, country: 'FR', name: 'France Box' },
  });
}

main().finally(() => prisma.$disconnect());
