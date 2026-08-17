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
      orderBy: { name: 'asc' }
    });
    res.json(vendors);
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
      }
    });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
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
  openingBalance: z.number().optional().default(0),
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
    const data = vendorSchema.parse(req.body);
    const vendor = await prisma.vendor.update({
      where: { id: Number(req.params.id) },
      data
    });
    res.json(vendor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update vendor' });
  }
};
