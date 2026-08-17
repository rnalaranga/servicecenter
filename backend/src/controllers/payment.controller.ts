import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

// Generate Payment Receipt Number
async function generatePaymentNumber() {
  const lastPayment = await prisma.customerPayment.findFirst({
    orderBy: { id: 'desc' },
  });
  let nextNumber = 1;
  if (lastPayment && lastPayment.paymentNumber.startsWith('RCP-')) {
    const lastNum = parseInt(lastPayment.paymentNumber.replace('RCP-', ''), 10);
    if (!isNaN(lastNum)) nextNumber = lastNum + 1;
  }
  return `RCP-${nextNumber.toString().padStart(6, '0')}`;
}

export const getPayments = async (req: Request, res: Response) => {
  try {
    const payments = await prisma.customerPayment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        invoice: true
      }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payment = await prisma.customerPayment.findUnique({
      where: { id: Number(id) },
      include: {
        customer: true,
        invoice: true
      }
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
};

const createPaymentSchema = z.object({
  customerId: z.number(),
  amount: z.number().min(0.01),
  method: z.string().default('CASH'),
  type: z.enum(['RECEIPT', 'REFUND']).default('RECEIPT'),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createPayment = async (req: Request, res: Response) => {
  try {
    const data = createPaymentSchema.parse(req.body);

    const paymentNumber = await generatePaymentNumber();

    const payment = await prisma.$transaction(async (tx) => {
      // 1. Create the payment record
      const pay = await tx.customerPayment.create({
        data: {
          paymentNumber,
          customerId: data.customerId,
          date: new Date(),
          amount: data.type === 'REFUND' ? -Math.abs(data.amount) : Math.abs(data.amount),
          method: data.method,
          reference: data.reference,
          notes: data.notes
        },
        include: {
          customer: true
        }
      });

      // 2. Add credit to customer ledger
      await tx.customerLedger.create({
        data: {
          customerId: data.customerId,
          date: new Date(),
          type: data.type === 'REFUND' ? 'REFUND' : 'PAYMENT',
          paymentId: pay.id,
          description: data.type === 'REFUND' ? `Payment Refund: ${paymentNumber}` : `Payment Receipt: ${paymentNumber}`,
          debit: data.type === 'REFUND' ? Math.abs(data.amount) : 0,
          credit: data.type === 'RECEIPT' ? Math.abs(data.amount) : 0,
          balance: 0
        }
      });

      return pay;
    });

    res.status(201).json(payment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
};
