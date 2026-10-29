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
  invoiceId: z.number().optional().nullable(),
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
          invoiceId: data.invoiceId || null,
          date: new Date(),
          amount: data.type === 'REFUND' ? -Math.abs(data.amount) : Math.abs(data.amount),
          method: data.method,
          reference: data.reference,
          notes: data.notes
        },
        include: {
          customer: true,
          invoice: true
        }
      });

      // 2. Invoice Settlement (If specific invoice selected or auto-settle unpaid invoices FIFO)
      if (data.type === 'RECEIPT') {
        let remainingToApply = Math.abs(data.amount);

        if (data.invoiceId) {
          const targetInv = await tx.invoice.findUnique({ where: { id: data.invoiceId } });
          if (targetInv) {
            const applyAmount = Math.min(remainingToApply, Number(targetInv.balance));
            const newPaid = Number(targetInv.amountPaid) + applyAmount;
            const newBal = Math.max(0, Number(targetInv.total) - newPaid);
            const newStatus = newBal <= 0 ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : targetInv.status);

            await tx.invoice.update({
              where: { id: targetInv.id },
              data: {
                amountPaid: newPaid,
                balance: newBal,
                status: newStatus
              }
            });
          }
        } else {
          // Auto-settle oldest unpaid invoices for this customer
          const unpaidInvoices = await tx.invoice.findMany({
            where: {
              customerId: data.customerId,
              balance: { gt: 0 },
              isQuotation: false,
              status: { notIn: ['CANCELLED', 'QUOTATION'] }
            },
            orderBy: { date: 'asc' }
          });

          for (const inv of unpaidInvoices) {
            if (remainingToApply <= 0) break;
            const applyAmount = Math.min(remainingToApply, Number(inv.balance));
            const newPaid = Number(inv.amountPaid) + applyAmount;
            const newBal = Math.max(0, Number(inv.total) - newPaid);
            const newStatus = newBal <= 0 ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : inv.status);

            await tx.invoice.update({
              where: { id: inv.id },
              data: {
                amountPaid: newPaid,
                balance: newBal,
                status: newStatus
              }
            });
            remainingToApply -= applyAmount;
          }
        }
      }

      // 3. Compute accurate Customer Ledger running balance
      const lastLedger = await tx.customerLedger.findFirst({
        where: { customerId: data.customerId },
        orderBy: { id: 'desc' }
      });
      let runningBalance = lastLedger ? Number(lastLedger.balance) : 0;
      const netAmount = data.type === 'REFUND' ? Math.abs(data.amount) : -Math.abs(data.amount);
      runningBalance += netAmount;

      // 4. Add to customer ledger
      await tx.customerLedger.create({
        data: {
          customerId: data.customerId,
          invoiceId: data.invoiceId || null,
          paymentId: pay.id,
          date: new Date(),
          type: data.type === 'REFUND' ? 'REFUND' : 'PAYMENT',
          refType: 'PAYMENT',
          refNumber: paymentNumber,
          description: data.type === 'REFUND' ? `Payment Refund: ${paymentNumber}` : `Payment Receipt: ${paymentNumber}`,
          debit: data.type === 'REFUND' ? Math.abs(data.amount) : 0,
          credit: data.type === 'RECEIPT' ? Math.abs(data.amount) : 0,
          balance: runningBalance
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
