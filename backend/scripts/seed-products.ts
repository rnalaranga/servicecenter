import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Categories
  const categories = [
    { name: 'Compounds & Polishes' },
    { name: 'Shampoos & Cleaners' },
    { name: 'Microfibers & Pads' },
    { name: 'Coatings & Sealants' }
  ];
  
  for (const c of categories) {
    const exists = await prisma.productCategory.findFirst({ where: { name: c.name } });
    if (!exists) await prisma.productCategory.create({ data: c });
  }

  // Units
  const units = [
    { name: 'Litre', symbol: 'L' },
    { name: 'Millilitre', symbol: 'mL' },
    { name: 'Piece', symbol: 'pcs' },
    { name: 'Bottle', symbol: 'btl' },
    { name: 'Gallon', symbol: 'gal' }
  ];

  for (const u of units) {
    const exists = await prisma.productUnit.findFirst({ where: { name: u.name } });
    if (!exists) await prisma.productUnit.create({ data: u });
  }

  const catCompound = await prisma.productCategory.findFirst({ where: { name: 'Compounds & Polishes' } });
  const catShampoo = await prisma.productCategory.findFirst({ where: { name: 'Shampoos & Cleaners' } });
  const catMicrofiber = await prisma.productCategory.findFirst({ where: { name: 'Microfibers & Pads' } });
  
  const unitLitre = await prisma.productUnit.findFirst({ where: { name: 'Litre' } });
  const unitPiece = await prisma.productUnit.findFirst({ where: { name: 'Piece' } });

  // Products
  const products = [
    { sku: 'PRD-001', name: 'Meguiar\'s Ultimate Wash & Wax', brand: 'Meguiar\'s', categoryId: catShampoo?.id, unitId: unitLitre?.id, purchaseCost: 4500, sellingPrice: 6500, minStock: 5 },
    { sku: 'PRD-002', name: 'Menzerna Heavy Cut Compound 400', brand: 'Menzerna', categoryId: catCompound?.id, unitId: unitLitre?.id, purchaseCost: 8500, sellingPrice: 12000, minStock: 3 },
    { sku: 'PRD-003', name: 'Chemical Guys Chenille Wash Mitt', brand: 'Chemical Guys', categoryId: catMicrofiber?.id, unitId: unitPiece?.id, purchaseCost: 2500, sellingPrice: 3800, minStock: 10 },
    { sku: 'PRD-004', name: 'CarPro IronX Snow Soap', brand: 'CarPro', categoryId: catShampoo?.id, unitId: unitLitre?.id, purchaseCost: 6500, sellingPrice: 9500, minStock: 5 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: p,
      create: p
    });
  }
  
  console.log('Products seeded successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
