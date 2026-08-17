import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: 'Washing & Cleaning' },
    { name: 'Detailing' },
    { name: 'Coating' }
  ];
  
  for (const c of categories) {
    await prisma.serviceCategory.create({ data: c });
  }

  const catW = await prisma.serviceCategory.findFirst({ where: { name: 'Washing & Cleaning' } });
  const catD = await prisma.serviceCategory.findFirst({ where: { name: 'Detailing' } });
  const catC = await prisma.serviceCategory.findFirst({ where: { name: 'Coating' } });

  const services = [
    { code: 'SRV-001', name: 'Body Wash & Vacuum', sellingPrice: 1500, estimatedCost: 500, categoryId: catW?.id, estimatedDuration: 45 },
    { code: 'SRV-002', name: 'Engine Bay Wash', sellingPrice: 2000, estimatedCost: 600, categoryId: catW?.id, estimatedDuration: 30 },
    { code: 'SRV-003', name: 'Interior Detailing', sellingPrice: 8500, estimatedCost: 2000, categoryId: catD?.id, estimatedDuration: 180 },
    { code: 'SRV-004', name: 'Exterior Cut & Polish', sellingPrice: 12000, estimatedCost: 3500, categoryId: catD?.id, estimatedDuration: 240 },
    { code: 'SRV-005', name: 'Ceramic Coating 9H', sellingPrice: 45000, estimatedCost: 15000, categoryId: catC?.id, estimatedDuration: 480 },
  ];

  for (const s of services) {
    await prisma.service.upsert({
      where: { code: s.code },
      update: s,
      create: s
    });
  }
  
  console.log('Services seeded successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
