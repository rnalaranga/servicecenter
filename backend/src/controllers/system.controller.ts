import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const { module, action, userId, search } = req.query;

    const where: any = {};

    if (module) where.module = module;
    if (action) where.action = action;
    if (userId) where.userId = Number(userId);

    if (search) {
      where.OR = [
        { recordRef: { contains: search as string } },
        { oldValue: { contains: search as string } },
        { newValue: { contains: search as string } }
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, username: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // limit to last 100 for now
    });

    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.setting.findMany();
    // Convert array to object { [key]: value } for easier frontend consumption
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);
    
    res.json(settingsMap);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const settingsToUpdate: Record<string, { value: string, group: string }> = req.body;
    
    // We update settings one by one using upsert
    for (const [key, data] of Object.entries(settingsToUpdate)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: data.value, group: data.group },
        create: { key, value: data.value, group: data.group }
      });
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

export const createDatabaseBackup = async (req: Request, res: Response) => {
  try {
    const backendRoot = path.resolve(__dirname, '../../');
    const dbPath = path.join(backendRoot, 'prisma', 'dev.db');
    const backupsDir = path.join(backendRoot, 'prisma', 'backups');

    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found' });
    }

    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${timestamp}.db`;
    const targetPath = path.join(backupsDir, backupFileName);

    fs.copyFileSync(dbPath, targetPath);
    const stats = fs.statSync(targetPath);

    res.json({
      success: true,
      message: `Database backup created successfully (${(stats.size / 1024).toFixed(1)} KB)`,
      fileName: backupFileName,
      sizeBytes: stats.size,
      createdAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Backup error:', error);
    res.status(500).json({ error: error?.message || 'Failed to create backup' });
  }
};

export const downloadLatestBackup = async (req: Request, res: Response) => {
  try {
    const backendRoot = path.resolve(__dirname, '../../');
    const dbPath = path.join(backendRoot, 'prisma', 'dev.db');

    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found' });
    }

    const dateStr = new Date().toISOString().split('T')[0];
    res.download(dbPath, `auto_elevate_backup_${dateStr}.db`);
  } catch (error: any) {
    console.error('Download backup error:', error);
    res.status(500).json({ error: 'Failed to download backup' });
  }
};

export const listBackups = async (req: Request, res: Response) => {
  try {
    const backendRoot = path.resolve(__dirname, '../../');
    const backupsDir = path.join(backendRoot, 'prisma', 'backups');

    if (!fs.existsSync(backupsDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.db'));
    const list = files.map(file => {
      const stats = fs.statSync(path.join(backupsDir, file));
      return {
        fileName: file,
        sizeKB: (stats.size / 1024).toFixed(1),
        createdAt: stats.birthtime || stats.mtime
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list backups' });
  }
};

export const fixDatabase = async (req: Request, res: Response) => {
  try {
    const backendRoot = path.resolve(__dirname, '../../');
    const localPrisma = path.join(backendRoot, 'node_modules', '.bin', 'prisma');
    const prismaBin = fs.existsSync(localPrisma) ? `"${localPrisma}"` : 'npx prisma';
    const cmd = `${prismaBin} db push && ${prismaBin} generate`;

    console.log(`[Database Fix] Executing "${cmd}" in ${backendRoot}...`);

    exec(cmd, { cwd: backendRoot, env: process.env }, async (error, stdout, stderr) => {
      if (error) {
        console.error('[Database Fix Error]', error, stderr);
        return res.status(500).json({
          success: false,
          error: 'Database sync failed',
          details: stderr || stdout || error.message
        });
      }

      const notes: string[] = [];

      try {
        // 1. Ensure Main Warehouse exists
        const wh = await prisma.warehouse.findFirst();
        if (!wh) {
          await prisma.warehouse.create({
            data: {
              code: 'WH-MAIN',
              name: 'Main Warehouse',
              isActive: true
            }
          });
          notes.push('Main Warehouse created.');
        }

        // 2. Ensure Admin User exists if users table is empty
        const userCount = await prisma.user.count();
        if (userCount === 0) {
          const bcrypt = await import('bcrypt');
          const hashedPassword = await bcrypt.default.hash('admin123', 10);
          await prisma.user.create({
            data: {
              username: 'admin',
              email: 'admin@detailshop.local',
              password: hashedPassword,
              fullName: 'System Administrator',
              role: 'ADMIN'
            }
          });
          notes.push('Admin user created (admin / admin123).');
        }

        // 3. Ensure Default Settings exist if not set
        const defaultSettings = [
          { key: 'companyName', value: 'AUTO ELEVATE ERP', group: 'GENERAL' },
          { key: 'companyPhone', value: '+94 77 123 4567', group: 'GENERAL' },
          { key: 'companyEmail', value: 'info@autoelevate.lk', group: 'GENERAL' },
          { key: 'companyAddress', value: 'No. 4, Thudella, Ja-Ela, Sri Lanka', group: 'GENERAL' },
          { key: 'companyTin', value: '102345678-7000', group: 'GENERAL' },
          { key: 'companyBrn', value: 'PV-00284759', group: 'GENERAL' },
          { key: 'currency', value: 'LKR', group: 'FINANCIAL' },
          { key: 'taxRate', value: '0', group: 'FINANCIAL' },
          { key: 'bankName', value: 'Commercial Bank of Ceylon', group: 'FINANCIAL' },
          { key: 'bankAccountName', value: 'Auto Elevate (Pvt) Ltd', group: 'FINANCIAL' },
          { key: 'bankAccountNumber', value: '100012345678', group: 'FINANCIAL' },
          { key: 'bankBranch', value: 'Ja-Ela Branch', group: 'FINANCIAL' },
          { key: 'invoicePrefix', value: 'INV-', group: 'INVOICE' },
          { key: 'invoiceTerms', value: '1. All payments are due upon receipt.\n2. Goods & services once delivered and accepted in good order are non-refundable.\n3. Make all cheques payable to Auto Elevate (Pvt) Ltd.', group: 'INVOICE' },
          { key: 'quotationTerms', value: '1. This quotation is valid for 14 days from the date of issue.\n2. Prices are subject to vehicle physical inspection upon arrival.\n3. 50% advance payment required upon job confirmation.', group: 'INVOICE' },
        ];

        for (const s of defaultSettings) {
          const exists = await prisma.setting.findUnique({ where: { key: s.key } });
          if (!exists) {
            await prisma.setting.create({ data: s });
          }
        }

        // 4. Ensure Default Chart of Accounts exists
        const accountCount = await prisma.account.count();
        if (accountCount === 0) {
          const defaultAccounts = [
            { code: '1010', name: 'Cash in Hand', type: 'ASSET', description: 'Petty cash and cash at counter' },
            { code: '1020', name: 'Bank Account - Commercial Bank', type: 'ASSET', description: 'Main business operating account' },
            { code: '1030', name: 'Bank Account - Sampath Bank', type: 'ASSET', description: 'Secondary business bank account' },
            { code: '1100', name: 'Accounts Receivable', type: 'ASSET', description: 'Trade debtors / customer balances due' },
            { code: '1200', name: 'Inventory Asset', type: 'ASSET', description: 'Cost of parts, products, and detailing materials in stock' },
            { code: '1500', name: 'Equipment & Machinery', type: 'ASSET', description: 'Detailing machines, pressure washers, hoists' },
            { code: '2010', name: 'Accounts Payable', type: 'LIABILITY', description: 'Trade creditors / supplier balances due' },
            { code: '2020', name: 'Accrued Expenses', type: 'LIABILITY', description: 'Accrued wages, rent, and utility bills' },
            { code: '2100', name: 'Short-term Borrowings', type: 'LIABILITY', description: 'Bank overdrafts and short-term debt' },
            { code: '3010', name: "Owner's Capital", type: 'EQUITY', description: 'Initial and contributed capital' },
            { code: '3020', name: 'Retained Earnings', type: 'EQUITY', description: 'Accumulated profits from previous periods' },
            { code: '3030', name: "Owner's Drawings", type: 'EQUITY', description: 'Drawings by business owner' },
            { code: '4010', name: 'Detailing & Service Revenue', type: 'REVENUE', description: 'Income from detailing, ceramic coating, and repair services' },
            { code: '4020', name: 'Product Sales Revenue', type: 'REVENUE', description: 'Income from direct sale of car care products & accessories' },
            { code: '4090', name: 'Other Operating Income', type: 'REVENUE', description: 'Discounts received, interest, and scrap sales' },
            { code: '5010', name: 'Cost of Goods Sold (COGS)', type: 'EXPENSE', description: 'Cost of materials and parts used on jobs or sold' },
            { code: '6010', name: 'Salaries & Staff Wages', type: 'EXPENSE', description: 'Technician wages, detailing staff pay' },
            { code: '6020', name: 'Shop Rent & Rates', type: 'EXPENSE', description: 'Service center workshop lease & local taxes' },
            { code: '6030', name: 'Electricity & Water Utilities', type: 'EXPENSE', description: 'Power and water expenses for wash bay & facility' },
            { code: '6040', name: 'Workshop Consumables', type: 'EXPENSE', description: 'Towels, spray bottles, masking tape, pads' },
            { code: '6050', name: 'Equipment Repairs & Maintenance', type: 'EXPENSE', description: 'Servicing of polishers, compressors, pressure washers' },
            { code: '6060', name: 'Marketing & Advertising', type: 'EXPENSE', description: 'Social media ads, banners, promotions' },
            { code: '6090', name: 'Miscellaneous Expenses', type: 'EXPENSE', description: 'Tea, refreshments, courier, incidental expenses' },
          ];

          for (const acc of defaultAccounts) {
            await prisma.account.create({ data: acc });
          }
          notes.push(`Created ${defaultAccounts.length} standard Chart of Accounts.`);
        }

        // 5. Ensure Default Expense Categories exist
        const catCount = await prisma.expenseCategory.count();
        if (catCount === 0) {
          const defaultCats = [
            'Utilities (Electricity / Water)',
            'Workshop Rent',
            'Staff Salaries & Overtime',
            'Detailing Consumables',
            'Equipment Maintenance',
            'Marketing & Social Media',
            'Tea & Refreshments',
            'Office Supplies',
            'General & Miscellaneous',
          ];
          for (const name of defaultCats) {
            await prisma.expenseCategory.create({ data: { name } });
          }
          notes.push(`Created ${defaultCats.length} default expense categories.`);
        }
      } catch (postSyncErr: any) {
        console.warn('[Post-sync initialization warning]', postSyncErr);
      }

      console.log('[Database Fix Success]', stdout);
      const extraMessage = notes.length > 0 ? ` (${notes.join(' ')})` : '';
      return res.json({
        success: true,
        message: `Database structure synced, regenerated, and verified successfully without data loss.${extraMessage}`,
        output: stdout
      });
    });
  } catch (error: any) {
    console.error('[Database Fix Exception]', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to execute database sync'
    });
  }
};
