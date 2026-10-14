import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

export const getAccounts = async (req: Request, res: Response) => {
  try {
    const { type, search } = req.query;
    const where: any = {};

    if (type && typeof type === 'string') {
      where.type = type.toUpperCase();
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const accounts = await prisma.account.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        _count: {
          select: { journalLines: true }
        }
      }
    });

    res.json(accounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
};

export const getAccount = async (req: Request, res: Response) => {
  try {
    const account = await prisma.account.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        journalLines: {
          orderBy: { id: 'desc' },
          take: 50,
          include: {
            journalEntry: true
          }
        }
      }
    });

    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(account);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
};

const accountSchema = z.object({
  code: z.string().min(1, 'Account code is required'),
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  description: z.string().optional().nullable(),
  balance: z.number().or(z.string()).transform(v => Number(v) || 0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const createAccount = async (req: Request, res: Response) => {
  try {
    const data = accountSchema.parse(req.body);

    const existing = await prisma.account.findUnique({
      where: { code: data.code }
    });
    if (existing) {
      return res.status(400).json({ error: `Account code "${data.code}" already exists.` });
    }

    const account = await prisma.account.create({
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        description: data.description,
        balance: data.balance,
        isActive: data.isActive,
      }
    });

    res.status(201).json(account);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create account' });
  }
};

export const updateAccount = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const data = accountSchema.partial().parse(req.body);

    if (data.code) {
      const existing = await prisma.account.findFirst({
        where: { code: data.code, NOT: { id } }
      });
      if (existing) {
        return res.status(400).json({ error: `Account code "${data.code}" is used by another account.` });
      }
    }

    const account = await prisma.account.update({
      where: { id },
      data
    });

    res.json(account);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update account' });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const lineCount = await prisma.journalLine.count({
      where: { accountId: id }
    });

    if (lineCount > 0) {
      const account = await prisma.account.update({
        where: { id },
        data: { isActive: false }
      });
      return res.json({ message: 'Account has existing journal transactions and has been deactivated', account });
    }

    await prisma.account.delete({ where: { id } });
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
