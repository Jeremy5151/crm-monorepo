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

  // EasyAI Market Template with Pull API
  await prisma.brokerTemplate.upsert({
    where: { code: 'EASYAI_MARKET' },
    update: {
      name: 'EasyAI Market',
      templateName: 'EasyAI Market',
      isActive: true,
      method: 'POST',
      url: 'https://api.easyaimarket.com/api/affiliate/leads',
      headers: {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NmQwNWEzMDU4ODE2YzI4MDhjMDgwYyIsImlhdCI6MTc1MTk3NTM3NSwiZXhwIjozNTM1NDg2NzUwfQ.x5QmK_CZOorGcBWd42_CwsbqtXJMz3R3mgaJ97a6rfk",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        firstName: "${firstName}",
        lastName: "${lastName}",
        email: "${email}",
        phone: "${phone}",
        country: "${country}",
        password: "${password}",
        ip: "${ip}",
        funnel: "${funnel}",
        aff: "${aff}"
      }),
      pullEnabled: true,
      pullUrl: 'https://api.easyaimarket.com/api/affiliate/leads',
      pullMethod: 'GET',
      pullHeaders: {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI2ODZkMDVhMzA1ODgxNmMyODA4YzA4MGMiLCJpYXQiOjE3NTE5NzUzNzUsImV4cCI6MzUzNTQ4Njc1MH0.x5QmK_CZOorGcBWd42_CwsbqtXJMz3R3mgaJ97a6rfk"
      },
      pullInterval: 15
    },
    create: {
      code: 'EASYAI_MARKET',
      name: 'EasyAI Market',
      templateName: 'EasyAI Market',
      isActive: true,
      method: 'POST',
      url: 'https://api.easyaimarket.com/api/affiliate/leads',
      headers: {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI2ODZkMDVhMzA1ODgxNmMyODA4YzA4MGMiLCJpYXQiOjE3NTE5NzUzNzUsImV4cCI6MzUzNTQ4Njc1MH0.x5QmK_CZOorGcBWd42_CwsbqtXJMz3R3mgaJ97a6rfk",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        firstName: "${firstName}",
        lastName: "${lastName}",
        email: "${email}",
        phone: "${phone}",
        country: "${country}",
        password: "${password}",
        ip: "${ip}",
        funnel: "${funnel}",
        aff: "${aff}"
      }),
      pullEnabled: true,
      pullUrl: 'https://api.easyaimarket.com/api/affiliate/leads',
      pullMethod: 'GET',
      pullHeaders: {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI2ODZkMDVhMzA1ODgxNmMyODA4YzA4MGMiLCJpYXQiOjE3NTE5NzUzNzUsImV4cCI6MzUzNTQ4Njc1MH0.x5QmK_CZOorGcBWd42_CwsbqtXJMz3R3mgaJ97a6rfk"
      },
      pullInterval: 15
    }
  });
}

main().finally(() => prisma.$disconnect());
