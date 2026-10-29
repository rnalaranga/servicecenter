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
      include: {
        vehicles: {
          orderBy: { createdAt: 'desc' }
        },
        jobCards: {
          orderBy: { date: 'desc' },
          include: {
            vehicle: true,
          }
        },
        invoices: {
          orderBy: { date: 'desc' }
        },
        payments: {
          orderBy: { date: 'desc' }
        },
        ledger: {
          orderBy: { date: 'desc' }
        }
      }
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    
    const totalDebit = customer.ledger.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = customer.ledger.reduce((sum, l) => sum + Number(l.credit), 0);
    const outstanding = totalDebit - totalCredit;
    const totalSales = customer.invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const totalPaid = customer.payments.reduce((sum, pay) => sum + Number(pay.amount), 0);

    const cObj = {
      ...customer,
      outstanding,
      totalSales,
      totalPaid
    };

    res.json(cObj);
  } catch (error) {
    console.error(error);
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
          refType: 'OPENING_BALANCE',
          refNumber: 'OB',
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
    const customerId = Number(id);
    const data = customerSchema.parse(req.body);

    const customer = await prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id: customerId },
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
          openingBalance: data.openingBalance,
          notes: data.notes,
          isActive: data.isActive,
        },
      });

      // Sync opening balance in customer ledger
      const obEntry = await tx.customerLedger.findFirst({
        where: { customerId, type: 'OPENING_BALANCE' }
      });

      if (obEntry) {
        await tx.customerLedger.update({
          where: { id: obEntry.id },
          data: {
            debit: data.openingBalance
          }
        });
      } else if (data.openingBalance > 0) {
        await tx.customerLedger.create({
          data: {
            customerId,
            date: updated.createdAt || new Date(),
            type: 'OPENING_BALANCE',
            refType: 'OPENING_BALANCE',
            refNumber: 'OB',
            description: 'Opening Balance',
            debit: data.openingBalance,
            balance: data.openingBalance
          }
        });
      }

      // Recompute running balance for customer ledger entries
      const allEntries = await tx.customerLedger.findMany({
        where: { customerId },
        orderBy: { id: 'asc' }
      });

      let running = 0;
      for (const entry of allEntries) {
        running = running + Number(entry.debit) - Number(entry.credit);
        await tx.customerLedger.update({
          where: { id: entry.id },
          data: { balance: running }
        });
      }

      return updated;
    });

    res.json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            jobCards: true,
            invoices: true,
            payments: true,
            vehicles: true
          }
        }
      }
    });

    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Block deletion if active financial audit records exist
    if (customer._count.invoices > 0 || customer._count.payments > 0) {
      return res.status(400).json({
        error: `Cannot delete customer "${customer.name}". This customer is linked to ${customer._count.invoices} invoice(s) and ${customer._count.payments} payment(s). Delete or reassign their invoices first.`
      });
    }

    if (customer._count.jobCards > 0) {
      return res.status(400).json({
        error: `Cannot delete customer "${customer.name}". This customer has ${customer._count.jobCards} job card(s). Delete their job cards first.`
      });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete reminders
      await tx.maintenanceReminder.deleteMany({ where: { customerId: id } });
      // 2. Delete customer ledger
      await tx.customerLedger.deleteMany({ where: { customerId: id } });
      // 3. Delete vehicle photos
      const custVehicles = await tx.vehicle.findMany({ where: { customerId: id }, select: { id: true } });
      const vehicleIds = custVehicles.map(v => v.id);
      if (vehicleIds.length > 0) {
        await tx.vehiclePhoto.deleteMany({ where: { vehicleId: { in: vehicleIds } } });
      }
      // 4. Delete customer vehicles
      await tx.vehicle.deleteMany({ where: { customerId: id } });
      // 5. Delete customer
      await tx.customer.delete({ where: { id } });
    });

    res.json({ message: `Customer "${customer.name}" and associated records deleted successfully.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
};
