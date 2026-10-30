import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

// Utility to generate unique Invoice / Quotation Number
async function generateInvoiceNumber(isQuotation = false) {
  const prefix = isQuotation ? 'QUO' : 'INV';
  const year = new Date().getFullYear();
  const searchPrefix = `${prefix}-${year}-`;
  
  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: searchPrefix } },
    orderBy: { invoiceNumber: 'desc' },
  });

  let nextNum = 1;
  if (last) {
    const parts = last.invoiceNumber.split('-');
    const parsed = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(parsed)) {
      nextNum = parsed + 1;
    }
  }

  while (true) {
    const candidate = `${searchPrefix}${String(nextNum).padStart(4, '0')}`;
    const exists = await prisma.invoice.findUnique({ where: { invoiceNumber: candidate } });
    if (!exists) return candidate;
    nextNum++;
  }
}

async function generatePaymentNumber() {
  const year = new Date().getFullYear();
  const searchPrefix = `PAY-${year}-`;
  
  const last = await prisma.customerPayment.findFirst({
    where: { paymentNumber: { startsWith: searchPrefix } },
    orderBy: { paymentNumber: 'desc' },
  });

  let nextNum = 1;
  if (last) {
    const parts = last.paymentNumber.split('-');
    const parsed = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(parsed)) {
      nextNum = parsed + 1;
    }
  }

  while (true) {
    const candidate = `${searchPrefix}${String(nextNum).padStart(4, '0')}`;
    const exists = await prisma.customerPayment.findUnique({ where: { paymentNumber: candidate } });
    if (!exists) return candidate;
    nextNum++;
  }
}

async function deductStockForInvoice(tx: any, items: any[], invoiceNumber: string) {
  let warehouse = await tx.warehouse.findFirst({ where: { code: 'MAIN' } });
  if (!warehouse) {
    warehouse = await tx.warehouse.create({
      data: { code: 'MAIN', name: 'Main Warehouse', location: 'HQ', isActive: true }
    });
  }

  for (const item of items) {
    let pId = item.productId;
    if (!pId && item.description) {
      const found = await tx.product.findFirst({
        where: {
          OR: [
            { name: item.description },
            { sku: item.description }
          ]
        }
      });
      if (found) pId = found.id;
    }

    if (pId) {
      const actualQty = Number(item.quantity);
      if (actualQty <= 0) continue;

      const lastTxn = await tx.stockTransaction.findFirst({ orderBy: { id: 'desc' } });
      let nextTxnNum = 1;
      if (lastTxn && lastTxn.txnNumber.startsWith('STX-')) {
        const parsed = parseInt(lastTxn.txnNumber.replace('STX-', ''), 10);
        if (!isNaN(parsed)) nextTxnNum = parsed + 1;
      }
      const txnNumber = `STX-${String(nextTxnNum).padStart(6, '0')}`;

      await tx.stockTransaction.create({
        data: {
          txnNumber,
          productId: pId,
          warehouseId: warehouse.id,
          type: 'OUT',
          quantity: -actualQty,
          unitCost: Number(item.unitPrice || 0),
          totalCost: actualQty * Number(item.unitPrice || 0),
          refType: 'INVOICE',
          refNumber: invoiceNumber,
          notes: `Sold via Invoice ${invoiceNumber}`
        }
      });

      const sl = await tx.stockLevel.findUnique({
        where: { productId_warehouseId: { productId: pId, warehouseId: warehouse.id } }
      });
      if (sl) {
        await tx.stockLevel.update({
          where: { id: sl.id },
          data: { quantity: { decrement: actualQty } }
        });
      } else {
        await tx.stockLevel.create({
          data: {
            productId: pId,
            warehouseId: warehouse.id,
            quantity: -actualQty
          }
        });
      }
    }
  }
}

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        customer: true,
        vehicle: true,
        jobCards: { include: { jobCard: { include: { vehicle: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mapped = invoices.map(inv => ({
      ...inv,
      vehicle: inv.vehicle || inv.jobCards?.[0]?.jobCard?.vehicle || null
    }));

    res.json(mapped);
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
        vehicle: true,
        items: true,
        payments: { orderBy: { createdAt: 'desc' } },
        jobCards: { include: { jobCard: { include: { vehicle: true } } } }
      }
    });

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    let vehicle: any = invoice.vehicle || invoice.jobCards?.[0]?.jobCard?.vehicle || null;
    if (!vehicle && invoice.vehicleId) {
      vehicle = await prisma.vehicle.findUnique({ where: { id: invoice.vehicleId } });
    }

    res.json({ ...invoice, vehicle });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
};

export const createInvoiceFromJobCard = async (req: Request, res: Response) => {
  try {
    const { jobCardId, maintenanceSchedule } = req.body;
    
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

      // 2. Add to Customer Ledger with accurate running balance
      const lastLedger = await tx.customerLedger.findFirst({
        where: { customerId: jobCard.customerId },
        orderBy: { id: 'desc' }
      });
      let runningBalance = lastLedger ? Number(lastLedger.balance) : 0;
      runningBalance += Number(inv.total);

      await tx.customerLedger.create({
        data: {
          customerId: jobCard.customerId,
          date: new Date(),
          type: 'INVOICE',
          invoiceId: inv.id,
          refNumber: invoiceNumber,
          description: `Invoice ${invoiceNumber}`,
          debit: inv.total,
          credit: 0,
          balance: runningBalance
        }
      });

      // 3. Automatically create Maintenance Reminders if scheduled
      if (maintenanceSchedule && maintenanceSchedule.intervals?.length > 0 && jobCard.vehicleId) {
        for (const item of maintenanceSchedule.intervals) {
          await tx.maintenanceReminder.create({
            data: {
              jobCardId: jobCard.id,
              customerId: jobCard.customerId,
              vehicleId: jobCard.vehicleId,
              serviceName: item.serviceName || maintenanceSchedule.serviceName || jobCard.services[0]?.service?.name || 'Periodic Maintenance',
              reminderDate: new Date(item.reminderDate),
              intervalLabel: item.intervalLabel || 'Scheduled Checkup',
              status: 'PENDING',
              notes: item.notes || `Scheduled upon Invoicing Job Card ${jobCard.jobNumber} (Invoice ${invoiceNumber})`
            }
          });
        }
      }

      return inv;
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
};

const directInvoiceSchema = z.object({
  jobCardId: z.number().optional().nullable(),
  customerId: z.number().min(1, 'Please select a valid customer'),
  vehicleId: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  bankDetails: z.string().optional().nullable(),
  isQuotation: z.boolean().optional().default(false),
  globalDiscount: z.number().optional().default(0),
  paymentAmount: z.number().optional().default(0),
  paymentMethod: z.string().optional().default('CASH'),
  items: z.array(z.object({
    description: z.string().min(1, 'Item description is required'),
    quantity: z.number().min(0.01, 'Quantity must be at least 0.01'),
    unitPrice: z.number().min(0, 'Price must be >= 0'),
    discount: z.number().optional().default(0),
  })).min(1, 'At least one item is required'),
  maintenanceSchedule: z.object({
    serviceName: z.string().optional(),
    intervals: z.array(z.object({
      intervalLabel: z.string().min(1, 'Interval label is required'),
      reminderDate: z.string().or(z.date()),
      serviceName: z.string().optional(),
      notes: z.string().optional().nullable(),
    })).min(1, 'At least one interval is required')
  }).optional().nullable(),
});

export const createDirectInvoice = async (req: Request, res: Response) => {
  try {
    const data = directInvoiceSchema.parse(req.body);

    let subtotal = 0;
    let totalDiscount = 0;
    let totalAmount = 0;

    const invoiceItems = data.items.map((item, idx) => {
      const lineSubtotal = item.quantity * item.unitPrice;
      const validDiscount = Math.min(Math.max(0, item.discount || 0), lineSubtotal);
      const lineTotal = lineSubtotal - validDiscount;

      subtotal += lineSubtotal;
      totalDiscount += validDiscount;
      totalAmount += lineTotal;

      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: validDiscount,
        taxAmount: 0,
        total: lineTotal,
        sortOrder: idx
      };
    });

    const validGlobalDiscount = Math.min(Math.max(0, data.globalDiscount || 0), totalAmount);
    totalDiscount += validGlobalDiscount;
    totalAmount = Math.max(0, totalAmount - validGlobalDiscount);

    const isQuotation = !!data.isQuotation;
    const invoiceNumber = await generateInvoiceNumber(isQuotation);

    const invoice = await prisma.$transaction(async (tx) => {
      const newPaid = isQuotation ? 0 : Math.min(data.paymentAmount, totalAmount);
      const newBalance = totalAmount - newPaid;
      const invStatus = isQuotation 
        ? 'QUOTATION' 
        : (newBalance <= 0 ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : 'UNPAID'));

      // 1. Create Invoice / Quotation record
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
          terms: data.terms || null,
          bankDetails: data.bankDetails || null,
          isQuotation,
          items: {
            create: invoiceItems
          },
          ...(data.jobCardId ? {
            jobCards: {
              create: { jobCardId: Number(data.jobCardId) }
            }
          } : {})
        }
      });

      // If invoiced from Job Card, update job card status
      if (data.jobCardId && !isQuotation) {
        await tx.jobCard.update({
          where: { id: Number(data.jobCardId) },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date()
          }
        }).catch(() => {});
      }

      // 2. Only post to Customer Ledger if it is an actual Invoice (Quotations are non-binding estimates)
      if (!isQuotation) {
        const lastLedger = await tx.customerLedger.findFirst({
          where: { customerId: data.customerId },
          orderBy: { id: 'desc' }
        });
        let runningBalance = lastLedger ? Number(lastLedger.balance) : 0;
        runningBalance += totalAmount;

        await tx.customerLedger.create({
          data: {
            customerId: data.customerId,
            date: new Date(),
            type: 'INVOICE',
            invoiceId: inv.id,
            refNumber: invoiceNumber,
            description: `Invoice ${invoiceNumber}`,
            debit: inv.total,
            credit: 0,
            balance: runningBalance
          }
        });

        // 3. Process Initial Payment if provided
        if (newPaid > 0) {
          runningBalance -= newPaid;
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
              refNumber: paymentNumber,
              description: `Payment for ${invoiceNumber}`,
              debit: 0,
              credit: newPaid,
              balance: runningBalance
            }
          });
        }

        // 4. Automatically deduct stock for sold products
        await deductStockForInvoice(tx, invoiceItems, invoiceNumber);
      }

      // 5. Automatically create Periodic Maintenance Reminders if configured
      if (data.maintenanceSchedule && data.maintenanceSchedule.intervals?.length > 0) {
        let targetVehId = data.vehicleId;
        if (!targetVehId) {
          const firstVeh = await tx.vehicle.findFirst({ where: { customerId: data.customerId } });
          if (firstVeh) targetVehId = firstVeh.id;
        }

        if (targetVehId) {
          for (const item of data.maintenanceSchedule.intervals) {
            await tx.maintenanceReminder.create({
              data: {
                jobCardId: data.jobCardId ? Number(data.jobCardId) : undefined,
                customerId: data.customerId,
                vehicleId: targetVehId,
                serviceName: item.serviceName || data.maintenanceSchedule.serviceName || invoiceItems[0]?.description || 'Periodic Maintenance',
                reminderDate: new Date(item.reminderDate),
                intervalLabel: item.intervalLabel || 'Scheduled Checkup',
                status: 'PENDING',
                notes: item.notes || `Scheduled upon Invoice ${invoiceNumber}${data.jobCardId ? ` (Job Card #${data.jobCardId})` : ''}`
              }
            });
          }
        }
      }

      return inv;
    });

    res.status(201).json(invoice);
  } catch (error: any) {
    console.error('[createDirectInvoice Error]', error);
    if (error instanceof z.ZodError) {
      const msg = error.errors.map(e => e.message).join(', ');
      res.status(400).json({ error: msg });
    } else {
      res.status(500).json({ error: error.message || 'Failed to create direct invoice' });
    }
  }
};

export const convertQuotationToInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoiceId = Number(id);

    const quotation = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true }
    });

    if (!quotation) return res.status(404).json({ error: 'Document not found' });
    if (!quotation.isQuotation && quotation.status !== 'QUOTATION') {
      return res.status(400).json({ error: 'Document is already an invoice' });
    }

    const newInvoiceNumber = await generateInvoiceNumber(false);

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update quotation to invoice
      const inv = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          invoiceNumber: newInvoiceNumber,
          isQuotation: false,
          status: 'UNPAID',
          date: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          notes: quotation.notes ? `${quotation.notes} (Converted from ${quotation.invoiceNumber})` : `Converted from ${quotation.invoiceNumber}`,
        }
      });

      // 2. Post to Customer Ledger
      const lastLedger = await tx.customerLedger.findFirst({
        where: { customerId: quotation.customerId },
        orderBy: { id: 'desc' }
      });
      let runningBalance = lastLedger ? Number(lastLedger.balance) : 0;
      runningBalance += Number(quotation.total);

      await tx.customerLedger.create({
        data: {
          customerId: quotation.customerId,
          date: new Date(),
          type: 'INVOICE',
          invoiceId: inv.id,
          refNumber: newInvoiceNumber,
          description: `Invoice ${newInvoiceNumber} (from ${quotation.invoiceNumber})`,
          debit: inv.total,
          credit: 0,
          balance: runningBalance
        }
      });

      // 3. Deduct stock for products upon conversion
      if (quotation.items && quotation.items.length > 0) {
        await deductStockForInvoice(tx, quotation.items, newInvoiceNumber);
      }

      return inv;
    });

    res.json({ message: 'Quotation converted to Invoice successfully', invoice: updated });
  } catch (error: any) {
    console.error('[convertQuotationToInvoice Error]', error);
    res.status(500).json({ error: error.message || 'Failed to convert quotation' });
  }
};

export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { terms, bankDetails, notes, vehicleId } = req.body;

    const updated = await prisma.invoice.update({
      where: { id: Number(id) },
      data: {
        ...(terms !== undefined && { terms }),
        ...(bankDetails !== undefined && { bankDetails }),
        ...(notes !== undefined && { notes }),
        ...(vehicleId !== undefined && { vehicleId: vehicleId ? Number(vehicleId) : null }),
      }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('[updateInvoice Error]', error);
    res.status(500).json({ error: error.message || 'Failed to update invoice' });
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

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const invoice = await prisma.invoice.findUnique({
      where: { id }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete associated payments
      await tx.customerPayment.deleteMany({ where: { invoiceId: id } });
      // 2. Delete customer ledger entries for this invoice
      await tx.customerLedger.deleteMany({ where: { invoiceId: id } });
      // 3. Delete job card links
      await tx.invoiceJobCard.deleteMany({ where: { invoiceId: id } });
      // 4. Reverse any stock deductions associated with this invoice
      const outTxns = await tx.stockTransaction.findMany({
        where: { refType: 'INVOICE', refNumber: invoice.invoiceNumber, type: 'OUT' }
      });
      for (const st of outTxns) {
        const qtyToRestore = Math.abs(Number(st.quantity));
        await tx.stockLevel.updateMany({
          where: { productId: st.productId, warehouseId: st.warehouseId },
          data: { quantity: { increment: qtyToRestore } }
        });
      }
      await tx.stockTransaction.deleteMany({
        where: { refType: 'INVOICE', refNumber: invoice.invoiceNumber }
      });
      // 5. Delete invoice items
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      // 6. Delete the invoice
      await tx.invoice.delete({ where: { id } });
    });

    res.json({ success: true, message: 'Invoice deleted successfully.' });
  } catch (error: any) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
};
