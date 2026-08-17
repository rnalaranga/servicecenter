import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getCustomerBalances = async (req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        ledger: true // Fetch all to sum debits and credits
      }
    });

    const balances = customers.map(c => {
      let balance = Number(c.openingBalance || 0);
      c.ledger.forEach(entry => {
        balance += Number(entry.debit);
        balance -= Number(entry.credit);
      });
      
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        mobile: c.mobile,
        balance
      };
    });

    res.json(balances);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch customer balances' });
  }
};

export const getCustomerStatement = async (req: Request, res: Response) => {
  try {
    const customerId = Number(req.params.customerId);
    
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });
    
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const ledger = await prisma.customerLedger.findMany({
      where: { customerId },
      orderBy: { id: 'asc' }, // Chronological order
      include: {
        invoice: { select: { invoiceNumber: true } },
        payment: { select: { paymentNumber: true } }
      }
    });

    res.json({
      customer,
      ledger
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch customer statement' });
  }
};
