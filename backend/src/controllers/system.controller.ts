import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

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
