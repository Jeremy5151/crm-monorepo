import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_AFF = 'demo-aff';
const DEMO_API_KEY = 'superadmin-key';
const COUNTRIES = ['FR', 'HU', 'RU', 'DE', 'IT', 'ES', 'BR', 'IN'];
const FUNNELS = ['energy-booster', 'crypto-pro', 'finance-master'];
const STATUSES = ['NEW', 'SENT', 'FAILED'] as const;

async function main() {
  await prisma.lead.deleteMany({});
  await prisma.user.deleteMany({
    where: { email: { in: ['admin@voltraxion.icu', 'manager@voltraxion.icu'] } },
  });
  await prisma.apiKey.deleteMany({
    where: { key: { in: ['aff_123', DEMO_API_KEY, 'manager-demo-key'] } },
  });

  const superadmin = await prisma.user.create({
    data: {
      email: 'admin@voltraxion.icu',
      name: 'Demo Superadmin',
      password: 'changeme123',
      role: 'SUPERADMIN',
      apiKey: DEMO_API_KEY,
      isActive: true,
      timezone: 'UTC',
      language: 'ru',
      theme: 'light',
      accentColor: '#FFD666',
    },
  });

  await prisma.user.create({
    data: {
      email: 'manager@voltraxion.icu',
      name: 'Demo Manager',
      password: 'changeme123',
      role: 'ADMIN',
      apiKey: 'manager-demo-key',
      isActive: true,
      timezone: 'UTC',
      language: 'ru',
      theme: 'light',
      accentColor: '#FFD666',
      createdBy: superadmin.id,
    },
  });

  await prisma.apiKey.createMany({
    data: [
      { key: 'aff_123', aff: DEMO_AFF, name: 'Test Affiliate 123', isActive: true },
      { key: DEMO_API_KEY, aff: DEMO_AFF, name: 'Demo Superadmin', isActive: true },
      { key: 'manager-demo-key', aff: DEMO_AFF, name: 'Demo Manager', isActive: true },
    ],
    skipDuplicates: true,
  });

  const now = Date.now();
  const leads = Array.from({ length: 64 }, (_, i) => {
    const status = STATUSES[i % STATUSES.length];
    const createdAt = new Date(now - i * 60 * 60 * 1000);
    return {
      id: `lead-demo-${String(i + 1).padStart(3, '0')}`,
      firstName: `Lead${i + 1}`,
      lastName: `Demo${i + 1}`,
      email: `lead${i + 1}@example.com`,
      phone: `+1000000${(1000 + i).toString()}`,
      country: COUNTRIES[i % COUNTRIES.length],
      aff: DEMO_AFF,
      funnel: FUNNELS[i % FUNNELS.length],
      status,
      brokerStatus:
        status === 'SENT' ? 'CONTACTED' : status === 'FAILED' ? 'REJECTED' : 'PENDING',
      sentAt: status === 'SENT' ? new Date(createdAt.getTime() + 15 * 60 * 1000) : null,
      createdAt,
    };
  });

  const created = await prisma.lead.createMany({ data: leads, skipDuplicates: true });
  console.log(`Inserted ${created.count} demo leads`);
}

main()
  .catch((err) => {
    console.error('Seed failed', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
