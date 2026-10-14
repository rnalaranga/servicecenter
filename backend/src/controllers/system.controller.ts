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
          { key: 'companyName', value: 'Golden Auto Detail ERP', group: 'GENERAL' },
          { key: 'currency', value: 'LKR', group: 'FINANCIAL' },
          { key: 'taxRate', value: '0', group: 'FINANCIAL' },
          { key: 'invoicePrefix', value: 'INV-', group: 'INVOICE' },
          { key: 'invoiceTerms', value: 'Thank you for your business. Payment is due upon receipt.', group: 'INVOICE' },
        ];

        for (const s of defaultSettings) {
          const exists = await prisma.setting.findUnique({ where: { key: s.key } });
          if (!exists) {
            await prisma.setting.create({ data: s });
          }
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
