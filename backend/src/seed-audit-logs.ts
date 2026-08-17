import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.findFirst({ where: { username: 'admin' } });
  
  if (!adminUser) {
    console.log('No admin user found. Please run seed-admin.ts first.');
    return;
  }

  // Delete existing dummy logs to avoid duplicates if run multiple times
  await prisma.auditLog.deleteMany({});

  const dummyLogs = [
    {
      userId: adminUser.id,
      action: 'UPDATE',
      module: 'USER',
      recordId: adminUser.id,
      recordRef: 'admin',
      oldValue: JSON.stringify({ fullName: 'Administrator' }),
      newValue: JSON.stringify({ fullName: 'System Administrator' }),
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
    },
    {
      userId: adminUser.id,
      action: 'CREATE',
      module: 'INVOICE',
      recordId: 1001,
      recordRef: 'INV-2608-0001',
      oldValue: null,
      newValue: JSON.stringify({ total: 25000, customerId: 5, status: 'PAID' }),
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0'
    },
    {
      userId: adminUser.id,
      action: 'CANCEL',
      module: 'JOB_CARD',
      recordId: 54,
      recordRef: 'JC-2608-0054',
      oldValue: JSON.stringify({ status: 'IN_PROGRESS' }),
      newValue: JSON.stringify({ status: 'CANCELLED' }),
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0'
    },
    {
      userId: adminUser.id,
      action: 'DELETE',
      module: 'EXPENSE',
      recordId: 12,
      recordRef: 'EXP-1012',
      oldValue: JSON.stringify({ amount: 1500, description: 'Lunch' }),
      newValue: null,
      ipAddress: '192.168.1.45',
      userAgent: 'Mozilla/5.0'
    },
    {
      userId: null,
      action: 'UPDATE',
      module: 'SYSTEM_SETTINGS',
      recordId: 1,
      recordRef: 'Company Name',
      oldValue: JSON.stringify({ value: 'Auto Detail' }),
      newValue: JSON.stringify({ value: 'Golden Auto Detail ERP' }),
      ipAddress: '127.0.0.1',
      userAgent: 'System Backend'
    }
  ];

  for (const log of dummyLogs) {
    await prisma.auditLog.create({ data: log });
  }

  console.log('Dummy audit logs seeded successfully.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
