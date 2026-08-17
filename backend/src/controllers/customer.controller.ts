import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

// Generate Customer Code (e.g., CUS-000001)
async function generateCustomerCode() {
  const lastCustomer = await prisma.customer.findFirst({
    orderBy: { id: 'desc' },
  });
  let nextNumber = 1;
  if (lastCustomer && lastCustomer.code.startsWith('CUS-')) {
    const lastNum = parseInt(lastCustomer.code.replace('CUS-', ''), 10);
    if (!isNaN(lastNum)) nextNumber = lastNum + 1;
  }
  return `CUS-${nextNumber.toString().padStart(6, '0')}`;
}

const customerSchema = z.object({
  name: z.string().min(1),
  companyName: z.string().optional(),
  mobile: z.string().min(1),
  secondaryMobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  nicTaxId: z.string().optional(),
  customerType: z.enum(['INDIVIDUAL', 'BUSINESS']),
  creditLimit: z.number().or(z.string()).transform(v => Number(v) || 0),
  openingBalance: z.number().or(z.string()).transform(v => Number(v) || 0),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { vehicles: true }
        },
        ledger: true
      }
    });

    const enriched = customers.map(c => {
      const totalDebit = c.ledger.reduce((sum, l) => sum + Number(l.debit), 0);
      const totalCredit = c.ledger.reduce((sum, l) => sum + Number(l.credit), 0);
      const outstanding = totalDebit - totalCredit;
      
      const cObj = { ...c, vehicles: c._count.vehicles, totalSales: 0, totalPaid: totalCredit, outstanding };
      delete (cObj as any).ledger;
      return cObj;
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id: Number(id) },
      include: { ledger: true }
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    
    const totalDebit = customer.ledger.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = customer.ledger.reduce((sum, l) => sum + Number(l.credit), 0);
    const outstanding = totalDebit - totalCredit;

    const cObj = {
      ...customer,
      outstanding,
      totalSales: 0,
      totalPaid: totalCredit
    };
    delete (cObj as any).ledger;

    res.json(cObj);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
};

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const data = customerSchema.parse(req.body);
    const code = await generateCustomerCode();

    const customer = await prisma.customer.create({
      data: {
        code,
        ...data,
      },
    });

    // Create an opening balance ledger entry if > 0
    if (data.openingBalance > 0) {
      await prisma.customerLedger.create({
        data: {
          customerId: customer.id,
          date: new Date(),
          type: 'OPENING_BALANCE',
          description: 'Opening Balance',
          debit: data.openingBalance,
          balance: data.openingBalance
        }
      });
    }

    res.status(201).json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = customerSchema.parse(req.body);

    const customer = await prisma.customer.update({
      where: { id: Number(id) },
      data: {
        name: data.name,
        companyName: data.companyName,
        mobile: data.mobile,
        secondaryMobile: data.secondaryMobile,
        email: data.email,
        address: data.address,
        city: data.city,
        nicTaxId: data.nicTaxId,
        customerType: data.customerType,
        creditLimit: data.creditLimit,
        notes: data.notes,
        isActive: data.isActive,
      },
    });
    res.json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update customer' });
  }
};
