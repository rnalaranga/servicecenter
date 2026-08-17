import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

// Helper to generate Purchase Number
async function generatePurchaseNumber() {
  const lastPurchase = await prisma.purchase.findFirst({
    orderBy: { id: 'desc' },
  });
  let nextNumber = 1;
  if (lastPurchase && lastPurchase.purchaseNumber.startsWith('PO-')) {
    const lastNum = parseInt(lastPurchase.purchaseNumber.replace('PO-', ''), 10);
    if (!isNaN(lastNum)) nextNumber = lastNum + 1;
  }
  return `PO-${nextNumber.toString().padStart(6, '0')}`;
}

const purchaseItemSchema = z.object({
  productId: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  quantity: z.number().min(0.01),
  unitCost: z.number().min(0),
  discount: z.number().optional().default(0),
  taxRate: z.number().optional().default(0),
});

const purchaseSchema = z.object({
  vendorId: z.number(),
  warehouseId: z.number().optional().nullable(),
  jobCardId: z.number().optional().nullable(),
  isExternal: z.boolean().optional().default(false),
  date: z.string().or(z.date()),
  dueDate: z.string().or(z.date()).optional().nullable(),
  status: z.enum(['DRAFT', 'COMPLETED']).default('DRAFT'),
  notes: z.string().optional().nullable(),
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required'),
});

export const getPurchases = async (req: Request, res: Response) => {
  try {
    const purchases = await prisma.purchase.findMany({
      include: {
        vendor: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
};

export const getPurchase = async (req: Request, res: Response) => {
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        vendor: true,
        warehouse: true,
        items: {
          include: {
            product: true,
          }
        },
      }
    });
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchase' });
  }
};

export const createPurchase = async (req: Request, res: Response) => {
  try {
    const data = purchaseSchema.parse(req.body);
    const purchaseNumber = await generatePurchaseNumber();

    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    const computedItems = data.items.map(item => {
      const lineTotalBeforeTax = (item.unitCost * item.quantity) - item.discount;
      const taxAmount = lineTotalBeforeTax * (item.taxRate / 100);
      const lineTotal = lineTotalBeforeTax + taxAmount;
      
      subtotal += (item.unitCost * item.quantity);
      totalDiscount += item.discount;
      totalTax += taxAmount;

      return {
        ...item,
        taxAmount,
        total: lineTotal
      };
    });

    const grandTotal = subtotal - totalDiscount + totalTax;

    const purchase = await prisma.$transaction(async (tx) => {
      // 1. Create Purchase & Items
      const p = await tx.purchase.create({
        data: {
          purchaseNumber,
          vendorId: data.vendorId,
          warehouseId: data.warehouseId,
          date: new Date(data.date),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          status: data.status,
          subtotal,
          discountAmount: totalDiscount,
          taxAmount: totalTax,
          total: grandTotal,
          balance: grandTotal,
          notes: data.notes,
          jobCardId: data.jobCardId,
          isExternal: data.isExternal,
          items: {
            create: computedItems.map(item => ({
              productId: item.productId,
              description: item.description,
              quantity: item.quantity,
              unitCost: item.unitCost,
              discount: item.discount,
              taxRate: item.taxRate,
              taxAmount: item.taxAmount,
              total: item.total
            }))
          }
        },
        include: { items: true, vendor: true }
      });

      // 2. If COMPLETED, process stock and ledger
      if (data.status === 'COMPLETED') {
        // Vendor Ledger
        const currentVendor = await tx.vendor.findUnique({ where: { id: p.vendorId } });
        if (!currentVendor) throw new Error("Vendor not found");

        const lastLedger = await tx.vendorLedger.findFirst({
          where: { vendorId: p.vendorId },
          orderBy: { id: 'desc' }
        });
        const currentBalance = Number(lastLedger?.balance || currentVendor.openingBalance || 0);
        const newBalance = currentBalance + grandTotal; // Credit increases how much we owe them

        await tx.vendorLedger.create({
          data: {
            vendorId: p.vendorId,
            date: new Date(),
            type: 'PURCHASE',
            refType: 'PURCHASE',
            refId: p.id,
            refNumber: p.purchaseNumber,
            description: `Purchase Bill ${p.purchaseNumber}`,
            credit: grandTotal,
            balance: newBalance,
          }
        });

        // Stock & Average Cost Updates
        if (p.warehouseId) {
          for (const item of p.items) {
            if (!item.productId) continue; // Skip external one-off items
            
            // Get current stock
            const currentStockLevel = await tx.stockLevel.findUnique({
              where: {
                productId_warehouseId: { productId: item.productId, warehouseId: p.warehouseId }
              }
            });
            const currentQty = currentStockLevel ? Number(currentStockLevel.quantity) : 0;

            // Get product to calculate new average cost
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (product) {
              const currentAvgCost = Number(product.avgCost || 0);
              const currentTotalValue = currentQty * currentAvgCost;
              const newPurchaseValue = Number(item.quantity) * Number(item.unitCost);
              const newTotalQty = currentQty + Number(item.quantity);
              
              let newAvgCost = currentAvgCost;
              if (newTotalQty > 0) {
                newAvgCost = (currentTotalValue + newPurchaseValue) / newTotalQty;
              }

              // Update product average cost & last purchase cost
              await tx.product.update({
                where: { id: product.id },
                data: {
                  avgCost: newAvgCost,
                  purchaseCost: item.unitCost
                }
              });
            }

            // Update Stock Level
            await tx.stockLevel.upsert({
              where: {
                productId_warehouseId: { productId: item.productId, warehouseId: p.warehouseId }
              },
              create: {
                productId: item.productId,
                warehouseId: p.warehouseId,
                quantity: item.quantity
              },
              update: {
                quantity: { increment: item.quantity }
              }
            });

            // Log Stock Transaction
            await tx.stockTransaction.create({
              data: {
                productId: item.productId,
                warehouseId: p.warehouseId,
                type: 'IN',
                quantity: item.quantity,
                unitCost: item.unitCost,
                txnNumber: `STX-P-${p.id}-${item.id}`,
                refType: 'PURCHASE',
                refId: p.id,
                notes: `Purchase Receipt ${p.purchaseNumber}`
              }
            });
          }
        }

        // Job Card Cost Update
        if (p.isExternal && p.jobCardId) {
          await tx.jobCard.update({
            where: { id: p.jobCardId },
            data: { totalCost: { increment: grandTotal } }
          });
        }
      }

      return p;
    });

    res.status(201).json(purchase);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create purchase' });
  }
};
