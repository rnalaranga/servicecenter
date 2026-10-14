import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

async function generateVendorCode() {
  const lastVendor = await prisma.vendor.findFirst({
    orderBy: { id: 'desc' },
  });
  let nextNumber = 1;
  if (lastVendor && lastVendor.code.startsWith('VEN-')) {
    const lastNum = parseInt(lastVendor.code.replace('VEN-', ''), 10);
    if (!isNaN(lastNum)) nextNumber = lastNum + 1;
  }
  return `VEN-${nextNumber.toString().padStart(4, '0')}`;
}

export const getVendors = async (req: Request, res: Response) => {
  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: { name: 'asc' },
      include: {
        ledger: {
          orderBy: { id: 'desc' },
          take: 1
        }
      }
    });

    const enriched = vendors.map(v => {
      const balance = v.ledger.length > 0 ? Number(v.ledger[0].balance) : Number(v.openingBalance || 0);
      return {
        ...v,
        balance
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
};

export const getVendor = async (req: Request, res: Response) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        products: true,
        purchases: {
          orderBy: { date: 'desc' },
          include: { items: true }
        },
        vendorPayments: {
          orderBy: { date: 'desc' }
        },
        ledger: {
          orderBy: { date: 'desc' }
        }
      }
    });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    const totalPurchases = vendor.purchases.reduce((sum, p) => sum + Number(p.total), 0);
    const totalPaid = vendor.vendorPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const sortedLedger = [...vendor.ledger].sort((a, b) => b.id - a.id);
    const currentBalance = sortedLedger.length > 0 ? Number(sortedLedger[0].balance) : Number(vendor.openingBalance || 0);

    res.json({
      ...vendor,
      totalPurchases,
      totalPaid,
      currentBalance
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
};

const vendorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  companyName: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  openingBalance: z.number().or(z.string()).transform(v => Number(v) || 0),
  creditTerms: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const createVendor = async (req: Request, res: Response) => {
  try {
    const data = vendorSchema.parse(req.body);
    const code = await generateVendorCode();

    const vendor = await prisma.vendor.create({
      data: { ...data, code }
    });

    if (data.openingBalance > 0) {
      await prisma.vendorLedger.create({
        data: {
          vendorId: vendor.id,
          date: new Date(),
          type: 'OPENING_BALANCE',
          refType: 'OPENING_BALANCE',
          refNumber: 'OB',
          description: 'Opening Balance',
          credit: data.openingBalance,
          balance: data.openingBalance
        }
      });
    }

    res.status(201).json(vendor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create vendor' });
  }
};

export const updateVendor = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const data = vendorSchema.parse(req.body);

    const vendor = await prisma.$transaction(async (tx) => {
      const updated = await tx.vendor.update({
        where: { id },
        data: {
          name: data.name,
          companyName: data.companyName,
          contactPerson: data.contactPerson,
          mobile: data.mobile,
          email: data.email,
          address: data.address,
          taxId: data.taxId,
          openingBalance: data.openingBalance,
          creditTerms: data.creditTerms,
          notes: data.notes,
          isActive: data.isActive,
        }
      });

      const obEntry = await tx.vendorLedger.findFirst({
        where: { vendorId: id, type: 'OPENING_BALANCE' }
      });

      if (obEntry) {
        await tx.vendorLedger.update({
          where: { id: obEntry.id },
          data: { credit: data.openingBalance }
        });
      } else if (data.openingBalance > 0) {
        await tx.vendorLedger.create({
          data: {
            vendorId: id,
            date: updated.createdAt || new Date(),
            type: 'OPENING_BALANCE',
            refType: 'OPENING_BALANCE',
            refNumber: 'OB',
            description: 'Opening Balance',
            credit: data.openingBalance,
            balance: data.openingBalance
          }
        });
      }

      // Recalculate running balance for all ledger entries
      const allEntries = await tx.vendorLedger.findMany({
        where: { vendorId: id },
        orderBy: { id: 'asc' }
      });

      let running = 0;
      for (const entry of allEntries) {
        running = running + Number(entry.credit) - Number(entry.debit);
        await tx.vendorLedger.update({
          where: { id: entry.id },
          data: { balance: running }
        });
      }

      return updated;
    });

    res.json(vendor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
};

export const deleteVendor = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const purchaseCount = await prisma.purchase.count({ where: { vendorId: id } });
    const paymentCount = await prisma.vendorPayment.count({ where: { vendorId: id } });

    if (purchaseCount > 0 || paymentCount > 0) {
      const vendor = await prisma.vendor.update({
        where: { id },
        data: { isActive: false }
      });
      return res.json({ message: 'Vendor has existing transactions and has been deactivated', vendor });
    }

    await prisma.vendorLedger.deleteMany({ where: { vendorId: id } });
    await prisma.vendor.delete({ where: { id } });
    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
};
