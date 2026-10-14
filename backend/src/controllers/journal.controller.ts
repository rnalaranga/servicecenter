import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

async function generateJournalNumber() {
  const lastEntry = await prisma.journalEntry.findFirst({
    orderBy: { id: 'desc' },
  });
  let nextNumber = 1;
  if (lastEntry && lastEntry.entryNumber.startsWith('JV-')) {
    const parts = lastEntry.entryNumber.split('-');
    const numPart = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(numPart)) nextNumber = numPart + 1;
  }
  return `JV-${nextNumber.toString().padStart(6, '0')}`;
}

export const getJournalEntries = async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const where: any = {};

    if (status && typeof status === 'string') {
      where.status = status;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { entryNumber: { contains: search } },
        { reference: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
        createdBy: {
          select: { id: true, fullName: true, username: true }
        }
      },
    });

    res.json(entries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch journal entries' });
  }
};

export const getJournalEntry = async (req: Request, res: Response) => {
  try {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
        createdBy: {
          select: { id: true, fullName: true, username: true }
        }
      },
    });

    if (!entry) return res.status(404).json({ error: 'Journal entry not found' });
    res.json(entry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch journal entry' });
  }
};

const lineSchema = z.object({
  accountId: z.number().int(),
  description: z.string().optional().nullable(),
  debit: z.number().or(z.string()).transform(v => Number(v) || 0),
  credit: z.number().or(z.string()).transform(v => Number(v) || 0),
});

const journalSchema = z.object({
  date: z.string().or(z.date()),
  reference: z.string().optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  status: z.enum(['POSTED', 'DRAFT']).default('POSTED'),
  lines: z.array(lineSchema).min(2, 'Journal entry requires at least two lines'),
});

export const createJournalEntry = async (req: Request, res: Response) => {
  try {
    const data = journalSchema.parse(req.body);

    // Validate debit = credit
    const totalDebit = data.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + line.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({
        error: `Journal entry is out of balance. Total Debit: ${totalDebit.toFixed(2)}, Total Credit: ${totalCredit.toFixed(2)}`
      });
    }

    if (totalDebit <= 0) {
      return res.status(400).json({ error: 'Total amount must be greater than zero' });
    }

    const entryNumber = await generateJournalNumber();

    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          entryNumber,
          date: new Date(data.date),
          reference: data.reference,
          description: data.description,
          status: data.status,
          lines: {
            create: data.lines.map(line => ({
              accountId: line.accountId,
              description: line.description,
              debit: line.debit,
              credit: line.credit,
            }))
          }
        },
        include: {
          lines: {
            include: { account: true }
          }
        }
      });

      // Update account balances if POSTED
      if (data.status === 'POSTED') {
        for (const line of data.lines) {
          const acc = await tx.account.findUnique({ where: { id: line.accountId } });
          if (!acc) continue;

          let balanceDiff = 0;
          if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
            balanceDiff = line.debit - line.credit;
          } else {
            // LIABILITY, EQUITY, REVENUE
            balanceDiff = line.credit - line.debit;
          }

          await tx.account.update({
            where: { id: line.accountId },
            data: {
              balance: Number(acc.balance) + balanceDiff
            }
          });
        }
      }

      return entry;
    });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create journal entry' });
  }
};

export const deleteJournalEntry = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const entry = await prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!entry) return res.status(404).json({ error: 'Journal entry not found' });

    await prisma.$transaction(async (tx) => {
      // If posted, reverse the impact on accounts
      if (entry.status === 'POSTED') {
        for (const line of entry.lines) {
          const acc = await tx.account.findUnique({ where: { id: line.accountId } });
          if (!acc) continue;

          let reverseDiff = 0;
          if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
            reverseDiff = Number(line.credit) - Number(line.debit);
          } else {
            reverseDiff = Number(line.debit) - Number(line.credit);
          }

          await tx.account.update({
            where: { id: line.accountId },
            data: {
              balance: Number(acc.balance) + reverseDiff
            }
          });
        }
      }

      await tx.journalEntry.delete({ where: { id } });
    });

    res.json({ message: 'Journal entry deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete journal entry' });
  }
};
