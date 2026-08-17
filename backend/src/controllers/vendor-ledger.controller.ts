import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getVendorBalances = async (req: Request, res: Response) => {
  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        ledger: {
          orderBy: { id: 'desc' },
          take: 1
        }
      }
    });

    const balances = vendors.map(v => {
      const balance = v.ledger.length > 0 ? Number(v.ledger[0].balance) : Number(v.openingBalance || 0);
      return {
        id: v.id,
        code: v.code,
        name: v.name,
        companyName: v.companyName,
        mobile: v.mobile,
        balance
      };
    });

    res.json(balances);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vendor balances' });
  }
};

export const getVendorStatement = async (req: Request, res: Response) => {
  try {
    const vendorId = Number(req.params.vendorId);
    
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });
    
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    const ledger = await prisma.vendorLedger.findMany({
      where: { vendorId },
      orderBy: { id: 'asc' }, // Chronological order
    });

    res.json({
      vendor,
      ledger
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vendor statement' });
  }
};
