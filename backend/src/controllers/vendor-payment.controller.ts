import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

async function generatePaymentNumber() {
  const lastPayment = await prisma.vendorPayment.findFirst({
    orderBy: { id: 'desc' },
  });
  let nextNumber = 1;
  if (lastPayment && lastPayment.paymentNumber.startsWith('VPAY-')) {
    const lastNum = parseInt(lastPayment.paymentNumber.replace('VPAY-', ''), 10);
    if (!isNaN(lastNum)) nextNumber = lastNum + 1;
  }
  return `VPAY-${nextNumber.toString().padStart(6, '0')}`;
}

const paymentSchema = z.object({
  vendorId: z.number(),
  purchaseId: z.number().optional().nullable(),
  date: z.string().or(z.date()),
  amount: z.number().positive('Amount must be greater than 0'),
  method: z.string().default('CASH'),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const getPayments = async (req: Request, res: Response) => {
  try {
    const payments = await prisma.vendorPayment.findMany({
      include: {
        vendor: { select: { id: true, name: true, code: true } },
        purchase: { select: { id: true, purchaseNumber: true } }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendor payments' });
  }
};

export const getPaymentsByVendor = async (req: Request, res: Response) => {
  try {
    const payments = await prisma.vendorPayment.findMany({
      where: { vendorId: Number(req.params.vendorId) },
      include: {
        purchase: { select: { id: true, purchaseNumber: true } }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendor payments' });
  }
};

export const createPayment = async (req: Request, res: Response) => {
  try {
    const data = paymentSchema.parse(req.body);
    const paymentNumber = await generatePaymentNumber();

    const payment = await prisma.$transaction(async (tx) => {
      // 1. Create Payment
      const p = await tx.vendorPayment.create({
        data: {
          paymentNumber,
          vendorId: data.vendorId,
          purchaseId: data.purchaseId,
          date: new Date(data.date),
          amount: data.amount,
          method: data.method,
          reference: data.reference,
          notes: data.notes
        },
        include: { vendor: true }
      });

      // 2. Update Vendor Ledger
      const lastLedger = await tx.vendorLedger.findFirst({
        where: { vendorId: data.vendorId },
        orderBy: { id: 'desc' }
      });
      
      const currentBalance = Number(lastLedger?.balance || p.vendor.openingBalance || 0);
      const newBalance = currentBalance - data.amount; // Debit reduces what we owe

      await tx.vendorLedger.create({
        data: {
          vendorId: data.vendorId,
          date: new Date(data.date),
          type: 'PAYMENT',
          refType: 'VENDOR_PAYMENT',
          refId: p.id,
          refNumber: p.paymentNumber,
          description: `Payment ${data.reference ? `(${data.reference})` : ''}`,
          debit: data.amount,
          balance: newBalance,
        }
      });

      // 3. Update Purchase Balance if linked
      if (data.purchaseId) {
        const purchase = await tx.purchase.findUnique({ where: { id: data.purchaseId } });
        if (purchase) {
          const newAmountPaid = Number(purchase.amountPaid) + data.amount;
          const newPurchaseBalance = Number(purchase.total) - newAmountPaid;
          await tx.purchase.update({
            where: { id: data.purchaseId },
            data: {
              amountPaid: newAmountPaid,
              balance: newPurchaseBalance
            }
          });
        }
      }

      return p;
    });

    res.status(201).json(payment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create vendor payment' });
  }
};
