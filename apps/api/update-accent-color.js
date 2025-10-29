const { PrismaClient } = require('@prisma/client');

async function updateAccentColor() {
  const prisma = new PrismaClient();
  
  try {
    // Обновляем существующую запись или создаем новую
    const settings = await prisma.crmSettings.upsert({
      where: { id: 'default' },
      update: {
        accentColor: '#FFD666'
      },
      create: {
        id: 'default',
        timezone: 'UTC',
        theme: 'light',
        language: 'en',
        accentColor: '#FFD666'
      }
    });
    
    console.log('Updated settings:', settings);
  } catch (error) {
    console.error('Error updating settings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAccentColor();
