import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

// Utility to generate Invoice Number
async function generateInvoiceNumber() {
  const count = await prisma.invoice.count();
  return `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
}

async function generatePaymentNumber() {
  const count = await prisma.customerPayment.count();
  return `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
}

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        customer: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id: Number(id) },
      include: {
        customer: true,
        items: true,
        payments: { orderBy: { createdAt: 'desc' } },
        jobCards: { include: { jobCard: true } }
      }
    });

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
};

export const createInvoiceFromJobCard = async (req: Request, res: Response) => {
  try {
    const { jobCardId } = req.body;
    
    // Fetch Job Card with its services and materials
    const jobCard = await prisma.jobCard.findUnique({
      where: { id: Number(jobCardId) },
      include: { services: { include: { service: true } }, materials: { include: { product: true } } }
    });

    if (!jobCard) return res.status(404).json({ error: 'Job Card not found' });
    if (jobCard.status !== 'COMPLETED' && jobCard.status !== 'DELIVERED') {
      // In many systems you can invoice early, but let's allow it if total > 0.
      if (jobCard.total.toNumber() === 0) return res.status(400).json({ error: 'Job Card has no total' });
    }

    // Check if already invoiced
    const existing = await prisma.invoiceJobCard.findFirst({ where: { jobCardId: jobCard.id } });
    if (existing) {
      return res.status(400).json({ error: 'Job Card is already invoiced' });
    }

    const invoiceNumber = await generateInvoiceNumber();

    // Prepare Invoice Items from Services
    const serviceItems = jobCard.services.map((s, idx) => ({
      description: s.service.name + (s.description ? ` - ${s.description}` : ''),
      quantity: s.quantity,
      unitPrice: s.unitPrice,
      discount: s.discount,
      taxAmount: s.taxAmount,
      total: s.total,
      sortOrder: idx
    }));

    // Start Transaction
    const invoice = await prisma.$transaction(async (tx) => {
      // 1. Create Invoice
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: jobCard.customerId,
          vehicleId: jobCard.vehicleId,
          date: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
          subtotal: jobCard.subtotal,
          discountAmount: jobCard.discountAmount,
          taxAmount: jobCard.taxAmount,
          total: jobCard.total,
          balance: jobCard.total,
          status: 'UNPAID',
          items: {
            create: serviceItems // Assuming materials are also added if required, but for detailing usually services dominate. We will stick to services for now as materials in our schema didn't have total correctly mapped in UI.
          },
          jobCards: {
            create: { jobCardId: jobCard.id }
          }
        }
      });

      // 2. Add to Customer Ledger
      await tx.customerLedger.create({
        data: {
          customerId: jobCard.customerId,
          date: new Date(),
          type: 'INVOICE',
          invoiceId: inv.id,
          description: `Invoice ${invoiceNumber}`,
          debit: inv.total, // Customer owes us
          credit: 0,
          balance: 0 // We'll compute cumulative balance if needed, or leave 0
        }
      });

      return inv;
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
};

const directInvoiceSchema = z.object({
  customerId: z.number(),
  vehicleId: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  globalDiscount: z.number().optional().default(0),
  paymentAmount: z.number().optional().default(0),
  paymentMethod: z.string().optional().default('CASH'),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().min(0.01),
    unitPrice: z.number().min(0),
    discount: z.number().optional().default(0),
  })).min(1),
});

export const createDirectInvoice = async (req: Request, res: Response) => {
  try {
    const data = directInvoiceSchema.parse(req.body);

    let subtotal = 0;
    let totalDiscount = 0;
    let totalAmount = 0;

    const invoiceItems = data.items.map((item, idx) => {
      const lineTotal = (item.quantity * item.unitPrice) - item.discount;
      subtotal += (item.quantity * item.unitPrice);
      totalDiscount += item.discount;
      totalAmount += lineTotal;

      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxAmount: 0, // Simplified tax
        total: lineTotal,
        sortOrder: idx
      };
    });

    totalDiscount += data.globalDiscount;
    totalAmount -= data.globalDiscount;
    if (totalAmount < 0) totalAmount = 0;

    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await prisma.$transaction(async (tx) => {
      // 1. Create Invoice
      const newPaid = Math.min(data.paymentAmount, totalAmount);
      const newBalance = totalAmount - newPaid;
      const invStatus = newBalance <= 0 ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : 'UNPAID');

      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: data.customerId,
          vehicleId: data.vehicleId || null,
          date: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          subtotal,
          discountAmount: totalDiscount,
          taxAmount: 0,
          total: totalAmount,
          balance: newBalance,
          amountPaid: newPaid,
          status: invStatus,
          notes: data.notes || null,
          items: {
            create: invoiceItems
          }
        }
      });

      // 2. Add to Customer Ledger for Invoice (Debit)
      await tx.customerLedger.create({
        data: {
          customerId: data.customerId,
          date: new Date(),
          type: 'INVOICE',
          invoiceId: inv.id,
          description: `Invoice ${invoiceNumber}`,
          debit: inv.total,
          credit: 0,
          balance: 0
        }
      });

      // 3. Process Initial Payment if provided
      if (newPaid > 0) {
        const paymentNumber = await generatePaymentNumber();
        const pay = await tx.customerPayment.create({
          data: {
            paymentNumber,
            customerId: data.customerId,
            invoiceId: inv.id,
            date: new Date(),
            amount: newPaid,
            method: data.paymentMethod
          }
        });

        await tx.customerLedger.create({
          data: {
            customerId: data.customerId,
            date: new Date(),
            type: 'PAYMENT',
            paymentId: pay.id,
            invoiceId: inv.id,
            description: `Payment for ${invoiceNumber}`,
            debit: 0,
            credit: newPaid,
            balance: 0
          }
        });
      }

      return inv;
    });

    res.status(201).json(invoice);
  } catch (error) {
    if (error instanceof z.ZodError) res.status(400).json({ error: error.errors });
    else res.status(500).json({ error: 'Failed to create direct invoice' });
  }
};

const paymentSchema = z.object({
  invoiceId: z.number(),
  amount: z.number().min(0.01),
  method: z.string(),
  reference: z.string().optional(),
});

export const recordPayment = async (req: Request, res: Response) => {
  try {
    const data = paymentSchema.parse(req.body);

    const invoice = await prisma.invoice.findUnique({ where: { id: data.invoiceId } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.balance.toNumber() <= 0) return res.status(400).json({ error: 'Invoice is already fully paid' });

    const paymentAmount = Math.min(data.amount, invoice.balance.toNumber());
    const newPaid = invoice.amountPaid.toNumber() + paymentAmount;
    const newBalance = invoice.total.toNumber() - newPaid;
    const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';

    const paymentNumber = await generatePaymentNumber();

    const payment = await prisma.$transaction(async (tx) => {
      // 1. Create Payment Record
      const pay = await tx.customerPayment.create({
        data: {
          paymentNumber,
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          date: new Date(),
          amount: paymentAmount,
          method: data.method,
          reference: data.reference,
        }
      });

      // 2. Update Invoice
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newPaid,
          balance: newBalance,
          status: newStatus
        }
      });

      // 3. Customer Ledger
      await tx.customerLedger.create({
        data: {
          customerId: invoice.customerId,
          date: new Date(),
          type: 'PAYMENT',
          paymentId: pay.id,
          invoiceId: invoice.id,
          description: `Payment for ${invoice.invoiceNumber}`,
          debit: 0,
          credit: paymentAmount, // Customer paid us
          balance: 0
        }
      });

      return pay;
    });

    res.status(201).json(payment);
  } catch (error) {
    if (error instanceof z.ZodError) res.status(400).json({ error: error.errors });
    else res.status(500).json({ error: 'Failed to record payment' });
  }
};
